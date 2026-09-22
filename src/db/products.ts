import { nowISO } from "@/utils/timestamp";
import { db } from "./database";
import { getDeviceId } from "./device";

export type Product = {
    id?: number;
    name: string;
    company: string;
    price: number;
    stock: number;
    unit: string;
    costPrice: number;
    expiry: string;
    barcode?: string;
    pcsPerUnit: number;
    updatedAt?: string;
    deleted?: number;
    deletedAt?: string | null;
    syncStatus?: string;
    deviceId?: string;
};

// ============================
// Read — only non-deleted
// ============================
export function getAllProducts(): Product[] {
    return db.getAllSync<Product>(
        `SELECT id, name, COALESCE(company, '') as company,
            price, stock,
            COALESCE(unit, 'pcs') as unit,
            COALESCE(cost_price, 0) as costPrice,
            COALESCE(expiry, '') as expiry,
            COALESCE(barcode, '') as barcode,
            COALESCE(pcs_per_unit, 1) as pcsPerUnit,
            updated_at as updatedAt,
            COALESCE(deleted, 0) as deleted,
            deleted_at as deletedAt,
            sync_status as syncStatus,
            device_id as deviceId
     FROM medicines
     WHERE deleted = 0 OR deleted IS NULL
     ORDER BY id DESC`
    );
}

// For sync — include pending
export function getAllProductsForSync(): Product[] {
    return db.getAllSync<Product>(
        `SELECT * FROM medicines WHERE sync_status = 'pending' OR sync_status IS NULL`
    );
}

export function getProductById(id: number): Product | null {
    const rows = db.getAllSync<Product>(
        `SELECT * FROM medicines WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`,
        [id]
    );
    return rows[0] ?? null;
}

// ============================
// Create
// ============================
export async function addProduct(p: Product): Promise<number> {
    const deviceId = await getDeviceId();
    const timestamp = nowISO();

    const r = db.runSync(
        `INSERT INTO medicines
     (name, company, price, stock, unit, cost_price, expiry, barcode, pcs_per_unit,
      updated_at, sync_status, device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
            p.name,
            p.company,
            p.price,
            p.stock,
            p.unit,
            p.costPrice,
            p.expiry,
            p.barcode ?? "",
            p.pcsPerUnit,
            timestamp,
            deviceId,
        ]
    );

    return r.lastInsertRowId;
}

// ============================
// Update
// ============================
export async function updateProduct(p: Product): Promise<void> {
    const deviceId = await getDeviceId();
    const timestamp = nowISO();

    db.runSync(
        `UPDATE medicines
     SET name = ?, company = ?, price = ?, stock = ?, unit = ?,
         cost_price = ?, expiry = ?, barcode = ?, pcs_per_unit = ?,
         updated_at = ?, sync_status = 'pending', device_id = ?
     WHERE id = ?`,
        [
            p.name,
            p.company,
            p.price,
            p.stock,
            p.unit,
            p.costPrice,
            p.expiry,
            p.barcode ?? "",
            p.pcsPerUnit,
            timestamp,
            deviceId,
            p.id!,
        ]
    );
}

// ============================
// Soft Delete
// ============================
export async function deleteProduct(id: number): Promise<void> {
    const deviceId = await getDeviceId();
    const timestamp = nowISO();

    db.runSync(
        `UPDATE medicines
     SET deleted = 1, deleted_at = ?, updated_at = ?,
         sync_status = 'pending', device_id = ?
     WHERE id = ?`,
        [timestamp, timestamp, deviceId, id]
    );
}

// ============================
// Sync: mark as synced
// ============================
export function markProductsSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");
    db.runSync(
        `UPDATE medicines SET sync_status = 'synced' WHERE id IN (${placeholders})`,
        ids
    );
}

// ============================
// Bulk Add (Excel Import)
// ============================
export async function bulkAddProducts(
    products: Omit<Product, "id">[]
): Promise<{ inserted: number; skipped: number }> {
    const deviceId = await getDeviceId();
    const timestamp = nowISO();
    let inserted = 0;
    let skipped = 0;

    db.withTransactionSync(() => {
        for (const p of products) {
            try {
                if (p.barcode) {
                    const ex = db.getAllSync<{ c: number }>(
                        `SELECT COUNT(*) as c FROM medicines WHERE barcode = ? AND (deleted = 0 OR deleted IS NULL)`,
                        [p.barcode]
                    )[0];
                    if (ex && ex.c > 0) {
                        skipped++;
                        continue;
                    }
                }

                db.runSync(
                    `INSERT INTO medicines
           (name, company, price, stock, unit, cost_price, expiry, barcode, pcs_per_unit,
            updated_at, sync_status, device_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
                    [
                        p.name,
                        p.company,
                        p.price,
                        p.stock,
                        p.unit,
                        p.costPrice,
                        p.expiry,
                        p.barcode ?? "",
                        p.pcsPerUnit,
                        timestamp,
                        deviceId,
                    ]
                );
                inserted++;
            } catch (e) {
                console.error("Insert fail:", p.name, e);
                skipped++;
            }
        }
    });

    return { inserted, skipped };
}