import { nowISO } from "@/utils/timestamp";
import { db } from "./database";
import { getDeviceId } from "./device";

export type CartItem = {
    medicineId: number;
    name: string;
    price: number;
    qty: number;
    unit: string;
};

export type SalePayload = {
    items: CartItem[];
    discount: number;
    vat: number;
    paid: number;
    paymentMethod: "cash" | "card" | "bkash";
    customerId?: number;
};

// ============================
// Save Sale
// ============================
export async function saveSale(payload: SalePayload): Promise<number> {
    const deviceId = await getDeviceId();
    const timestamp = nowISO();

    const subtotal = payload.items.reduce(
        (s, i) => s + i.price * i.qty,
        0
    );
    const total = subtotal - payload.discount + payload.vat;
    const change = Math.max(payload.paid - total, 0);
    const dueAmount = Math.max(total - payload.paid, 0);
    const isDue = dueAmount > 0 ? 1 : 0;

    let saleId = 0;

    db.withTransactionSync(() => {
        // Sale insert
        const r = db.runSync(
            `INSERT INTO sales
        (total, discount, vat, paid, change, payment_method,
         customer_id, due_amount, is_due,
         updated_at, sync_status, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [
                total,
                payload.discount,
                payload.vat,
                payload.paid,
                change,
                payload.paymentMethod,
                payload.customerId ?? null,
                dueAmount,
                isDue,
                timestamp,
                deviceId,
            ]
        );
        saleId = r.lastInsertRowId;

        // Items + Stock কমাও
        for (const item of payload.items) {
            db.runSync(
                `INSERT INTO sale_items (sale_id, medicine_id, name, price, qty, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    saleId,
                    item.medicineId,
                    item.name,
                    item.price,
                    item.qty,
                    item.price * item.qty,
                ]
            );

            db.runSync(
                `UPDATE medicines
         SET stock = MAX(0, stock - ?),
             updated_at = ?, sync_status = 'pending', device_id = ?
         WHERE id = ?`,
                [item.qty, timestamp, deviceId, item.medicineId]
            );
        }

        // Due customer update
        if (isDue && payload.customerId) {
            db.runSync(
                `UPDATE due_customers
         SET total_due = total_due + ?,
             updated_at = ?, sync_status = 'pending', device_id = ?
         WHERE id = ?`,
                [dueAmount, timestamp, deviceId, payload.customerId]
            );
        }
    });

    return saleId;
}

// ============================
// Read
// ============================
export function getAllSales() {
    return db.getAllSync<any>(
        `SELECT * FROM sales
     WHERE deleted = 0 OR deleted IS NULL
     ORDER BY id DESC`
    );
}

export function getAllSalesForSync() {
    return db.getAllSync<any>(
        `SELECT * FROM sales WHERE sync_status = 'pending' OR sync_status IS NULL`
    );
}

export function getSaleById(id: number) {
    return db.getAllSync<any>(
        `SELECT * FROM sales WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`,
        [id]
    )[0];
}

export function getSaleItems(saleId: number) {
    return db.getAllSync<any>(
        `SELECT * FROM sale_items WHERE sale_id = ?`,
        [saleId]
    );
}

export function markSalesSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");
    db.runSync(
        `UPDATE sales SET sync_status = 'synced' WHERE id IN (${placeholders})`,
        ids
    );
}