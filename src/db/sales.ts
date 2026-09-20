import { addDueToCustomer } from "./customers";
import { db } from "./database";

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
    customerId?: number;   // due থাকলে বাধ্যতামূলক
};

export function saveSale(payload: SalePayload): number {
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
        const r = db.runSync(
            `INSERT INTO sales
        (total, discount, vat, paid, change, payment_method,
         customer_id, due_amount, is_due)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            ]
        );
        saleId = r.lastInsertRowId;

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
                `UPDATE medicines SET stock = stock - ? WHERE id = ?`,
                [item.qty, item.medicineId]
            );
        }

        // Due কাস্টমারের মোট due বাড়াও
        if (isDue && payload.customerId) {
            addDueToCustomer(payload.customerId, dueAmount);
        }
    });

    return saleId;
}