import { nowISO } from "@/utils/timestamp";
import { db } from "./database";
import { getDeviceId } from "./device";

export type Customer = {
    id?: number;
    name: string;
    phone: string;
    address: string;
    totalDue: number;
    updatedAt?: string;
    deleted?: number;
    deletedAt?: string | null;
    syncStatus?: string;
    deviceId?: string;
};

export type LedgerEntry = {
    id: number;
    type: "sale" | "payment";
    date: string;
    description: string;
    items?: {
        name: string;
        qty: number;
        price: number;
        subtotal: number;
    }[];
    total?: number;
    paid?: number;
    dueAmount?: number;
    debit: number;
    credit: number;
    balance: number;
};

export type LedgerSummary = {
    customer: Customer;
    entries: LedgerEntry[];
    totalDebit: number;
    totalCredit: number;
    currentDue: number;
    totalSales: number;
    totalPaid: number;
};

// ============================
// Read
// ============================
export function getAllCustomers(): Customer[] {
    return db.getAllSync<Customer>(
        `SELECT id, name, COALESCE(phone, '') as phone,
            COALESCE(address, '') as address,
            COALESCE(total_due, 0) as totalDue,
            updated_at as updatedAt,
            COALESCE(deleted, 0) as deleted,
            sync_status as syncStatus,
            device_id as deviceId
     FROM due_customers
     WHERE deleted = 0 OR deleted IS NULL
     ORDER BY id DESC`
    );
}

export function getAllCustomersForSync(): Customer[] {
    return db.getAllSync<Customer>(
        `SELECT * FROM due_customers WHERE sync_status = 'pending' OR sync_status IS NULL`
    );
}

export function getCustomerById(id: number): Customer | null {
    const rows = db.getAllSync<Customer>(
        `SELECT * FROM due_customers WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`,
        [id]
    );
    return rows[0] ?? null;
}

// ============================
// Create
// ============================
export async function addCustomer(c: Customer): Promise<number> {
    const deviceId = await getDeviceId();
    const timestamp = nowISO();

    const r = db.runSync(
        `INSERT INTO due_customers
     (name, phone, address, total_due, updated_at, sync_status, device_id)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [c.name, c.phone, c.address, c.totalDue, timestamp, deviceId]
    );
    return r.lastInsertRowId;
}

// ============================
// Update
// ============================
export async function updateCustomer(c: Customer): Promise<void> {
    const deviceId = await getDeviceId();
    const timestamp = nowISO();

    db.runSync(
        `UPDATE due_customers
     SET name = ?, phone = ?, address = ?,
         updated_at = ?, sync_status = 'pending', device_id = ?
     WHERE id = ?`,
        [c.name, c.phone, c.address, timestamp, deviceId, c.id!]
    );
}

// ============================
// Soft Delete
// ============================
export async function deleteCustomer(id: number): Promise<void> {
    const deviceId = await getDeviceId();
    const timestamp = nowISO();

    db.withTransactionSync(() => {
        // Customer
        db.runSync(
            `UPDATE due_customers
       SET deleted = 1, deleted_at = ?, updated_at = ?,
           sync_status = 'pending', device_id = ?
       WHERE id = ?`,
            [timestamp, timestamp, deviceId, id]
        );

        // Also mark all payments deleted
        db.runSync(
            `UPDATE due_payments
       SET deleted = 1, deleted_at = ?, updated_at = ?,
           sync_status = 'pending', device_id = ?
       WHERE customer_id = ?`,
            [timestamp, timestamp, deviceId, id]
        );
    });
}

// ============================
// Payment নেওয়া
// ============================
export async function payDue(
    customerId: number,
    amount: number,
    note = ""
): Promise<void> {
    if (amount <= 0) throw new Error("পরিমাণ ০ এর বেশি হতে হবে");

    const deviceId = await getDeviceId();
    const timestamp = nowISO();

    db.withTransactionSync(() => {
        // Payment insert
        db.runSync(
            `INSERT INTO due_payments
       (customer_id, amount, note, updated_at, sync_status, device_id)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
            [customerId, amount, note || "ক্যাশ পেমেন্ট", timestamp, deviceId]
        );

        // Due update
        db.runSync(
            `UPDATE due_customers
       SET total_due = MAX(0, total_due - ?),
           updated_at = ?, sync_status = 'pending', device_id = ?
       WHERE id = ?`,
            [amount, timestamp, deviceId, customerId]
        );
    });
}

// ============================
// Ledger
// ============================
export function getCustomerLedger(customerId: number): LedgerEntry[] {
    const sales = db.getAllSync<{
        id: number;
        created_at: string;
        total: number;
        paid: number;
        due_amount: number;
        is_due: number;
    }>(
        `SELECT id, created_at, total, paid, due_amount, is_due
     FROM sales
     WHERE customer_id = ?
       AND (deleted = 0 OR deleted IS NULL)
       AND (due_amount > 0 OR paid > 0 OR is_due = 1)
     ORDER BY created_at ASC`,
        [customerId]
    );

    const payments = db.getAllSync<{
        id: number;
        created_at: string;
        amount: number;
        note: string;
    }>(
        `SELECT id, created_at, amount, COALESCE(note, '') as note
     FROM due_payments
     WHERE customer_id = ?
       AND (deleted = 0 OR deleted IS NULL)
     ORDER BY created_at ASC`,
        [customerId]
    );

    type Combined = {
        kind: "sale" | "payment";
        date: string;
        debit: number;
        credit: number;
        refId: number;
        total?: number;
        paid?: number;
        dueAmount?: number;
    };

    const combined: Combined[] = [];

    for (const s of sales) {
        combined.push({
            kind: "sale",
            date: s.created_at,
            debit: s.due_amount || 0,
            credit: 0,
            refId: s.id,
            total: s.total,
            paid: s.paid,
            dueAmount: s.due_amount,
        });
    }

    for (const p of payments) {
        combined.push({
            kind: "payment",
            date: p.created_at,
            debit: 0,
            credit: p.amount,
            refId: p.id,
        });
    }

    combined.sort((a, b) => (a.date < b.date ? -1 : 1));

    let balance = 0;
    return combined.map((e) => {
        balance += e.debit - e.credit;

        if (e.kind === "sale") {
            const items = db.getAllSync<{
                name: string;
                qty: number;
                price: number;
                subtotal: number;
            }>(
                `SELECT name, qty, price, subtotal
         FROM sale_items WHERE sale_id = ?`,
                [e.refId]
            );

            let description = `বিল #${e.refId}`;
            if (e.total !== undefined) description += ` — মোট ৳${e.total}`;
            if (e.paid !== undefined && e.paid > 0)
                description += `, পরিশোধিত ৳${e.paid}`;
            if (e.dueAmount !== undefined && e.dueAmount > 0)
                description += `, বাকি ৳${e.dueAmount}`;

            return {
                id: e.refId,
                type: "sale" as const,
                date: e.date,
                description,
                items,
                total: e.total,
                paid: e.paid,
                dueAmount: e.dueAmount,
                debit: e.debit,
                credit: 0,
                balance,
            };
        } else {
            const pay = db.getAllSync<{ note: string }>(
                `SELECT COALESCE(note, '') as note FROM due_payments WHERE id = ?`,
                [e.refId]
            );

            return {
                id: e.refId,
                type: "payment" as const,
                date: e.date,
                description: pay[0]?.note || "ক্যাশ পেমেন্ট",
                debit: 0,
                credit: e.credit,
                balance,
            };
        }
    });
}

export function getCustomerLedgerSummary(
    customerId: number
): LedgerSummary | null {
    const customer = getCustomerById(customerId);
    if (!customer) return null;

    const entries = getCustomerLedger(customerId);
    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    const totalSales = entries
        .filter((e) => e.type === "sale")
        .reduce((s, e) => s + (e.total || 0), 0);
    const totalPaid = entries
        .filter((e) => e.type === "sale")
        .reduce((s, e) => s + (e.paid || 0), 0);

    return {
        customer,
        entries,
        totalDebit,
        totalCredit,
        currentDue: customer.totalDue,
        totalSales,
        totalPaid,
    };
}

// ============================
// Sync mark
// ============================
export function markCustomersSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");
    db.runSync(
        `UPDATE due_customers SET sync_status = 'synced' WHERE id IN (${placeholders})`,
        ids
    );
}

// ============================
// Bulk Add
// ============================
export async function bulkAddCustomers(
    customers: {
        name: string;
        phone: string;
        address: string;
        totalDue: number;
    }[]
): Promise<{ inserted: number; skipped: number }> {
    const deviceId = await getDeviceId();
    const timestamp = nowISO();
    let inserted = 0;
    let skipped = 0;

    db.withTransactionSync(() => {
        for (const c of customers) {
            try {
                if (c.phone) {
                    const ex = db.getAllSync<{ c: number }>(
                        `SELECT COUNT(*) as c FROM due_customers WHERE phone = ? AND (deleted = 0 OR deleted IS NULL)`,
                        [c.phone]
                    )[0];
                    if (ex && ex.c > 0) {
                        skipped++;
                        continue;
                    }
                }

                db.runSync(
                    `INSERT INTO due_customers
           (name, phone, address, total_due, updated_at, sync_status, device_id)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
                    [c.name, c.phone, c.address, c.totalDue, timestamp, deviceId]
                );
                inserted++;
            } catch (e) {
                console.error("Insert fail:", c.name, e);
                skipped++;
            }
        }
    });

    return { inserted, skipped };
}