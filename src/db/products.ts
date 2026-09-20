import { db } from "./database";

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
};

// ============================
// Read
// ============================
export function getAllProducts(): Product[] {
    return db.getAllSync<Product>(
        `SELECT id, name, COALESCE(company, '') as company,
            price, stock,
            COALESCE(unit, 'pcs') as unit,
            COALESCE(cost_price, 0) as costPrice,
            COALESCE(expiry, '') as expiry,
            COALESCE(barcode, '') as barcode,
            COALESCE(pcs_per_unit, 1) as pcsPerUnit
     FROM medicines
     ORDER BY id DESC`
    );
}

export function getProductById(id: number): Product | null {
    const rows = db.getAllSync<Product>(
        `SELECT id, name, COALESCE(company, '') as company,
            price, stock,
            COALESCE(unit, 'pcs') as unit,
            COALESCE(cost_price, 0) as costPrice,
            COALESCE(expiry, '') as expiry,
            COALESCE(barcode, '') as barcode,
            COALESCE(pcs_per_unit, 1) as pcsPerUnit
     FROM medicines WHERE id = ?`,
        [id]
    );
    return rows[0] ?? null;
}

export function searchProducts(query: string): Product[] {
    return db.getAllSync<Product>(
        `SELECT id, name, COALESCE(company, '') as company,
            price, stock,
            COALESCE(unit, 'pcs') as unit,
            COALESCE(cost_price, 0) as costPrice,
            COALESCE(expiry, '') as expiry,
            COALESCE(barcode, '') as barcode,
            COALESCE(pcs_per_unit, 1) as pcsPerUnit
     FROM medicines
     WHERE name LIKE ? OR company LIKE ? OR barcode LIKE ?
     ORDER BY id DESC`,
        [`%${query}%`, `%${query}%`, `%${query}%`]
    );
}

// ============================
// Create
// ============================
export function addProduct(p: Product): number {
    const r = db.runSync(
        `INSERT INTO medicines
     (name, company, price, stock, unit, cost_price, expiry, barcode, pcs_per_unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ]
    );
    return r.lastInsertRowId;
}

// ============================
// Update
// ============================
export function updateProduct(p: Product): void {
    db.runSync(
        `UPDATE medicines
     SET name=?, company=?, price=?, stock=?, unit=?,
         cost_price=?, expiry=?, barcode=?, pcs_per_unit=?
     WHERE id=?`,
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
            p.id!,
        ]
    );
}

// ============================
// Delete
// ============================
export function deleteProduct(id: number): void {
    db.runSync("DELETE FROM medicines WHERE id = ?", [id]);
}

// ============================
// 🆕 Bulk Add (Excel Import)
// ============================
export function bulkAddProducts(
    products: Omit<Product, "id">[]
): { inserted: number; skipped: number } {
    let inserted = 0;
    let skipped = 0;

    db.withTransactionSync(() => {
        for (const p of products) {
            try {
                // বারকোড থাকলে ডুপ্লিকেট চেক
                if (p.barcode) {
                    const ex = db.getAllSync<{ c: number }>(
                        `SELECT COUNT(*) as c FROM medicines WHERE barcode = ?`,
                        [p.barcode]
                    )[0];
                    if (ex && ex.c > 0) {
                        skipped++;
                        continue;
                    }
                }

                db.runSync(
                    `INSERT INTO medicines
           (name, company, price, stock, unit, cost_price, expiry, barcode, pcs_per_unit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                    ]
                );
                inserted++;
            } catch (e) {
                console.error("Insert product fail:", p.name, e);
                skipped++;
            }
        }
    });

    return { inserted, skipped };
}

// ============================
// 🆕 Bulk Stock Update (Low Stock Import)
// ============================
export function bulkUpdateStock(
    updates: { id: number; stock: number }[]
): { updated: number; skipped: number } {
    let updated = 0;
    let skipped = 0;

    db.withTransactionSync(() => {
        for (const u of updates) {
            try {
                const r = db.runSync(
                    `UPDATE medicines SET stock = ? WHERE id = ?`,
                    [u.stock, u.id]
                );
                if (r.changes > 0) updated++;
                else skipped++;
            } catch (e) {
                console.error("Update stock fail:", u.id, e);
                skipped++;
            }
        }
    });

    return { updated, skipped };
}

// ============================
// Bulk Delete by IDs
// ============================
export function bulkDeleteProducts(ids: number[]): number {
    let deleted = 0;
    db.withTransactionSync(() => {
        for (const id of ids) {
            try {
                const r = db.runSync("DELETE FROM medicines WHERE id = ?", [id]);
                if (r.changes > 0) deleted++;
            } catch (e) {
                console.error("Delete fail:", id, e);
            }
        }
    });
    return deleted;
}