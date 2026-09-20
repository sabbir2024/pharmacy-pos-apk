import { db } from "./database";

export type Customer = {
    id?: number;
    name: string;
    phone: string;
    address: string;
    totalDue: number;
};

// ============================
// Ledger Entry
// ============================
export type LedgerEntry = {
    id: number;
    type: "sale" | "payment";
    date: string;
    description: string;
    debit: number;   // বাকি বাড়ল
    credit: number;  // বাকি কমল
    balance: number; // রানিং ব্যালান্স
};

// ============================
// CRUD
// ============================
export function getAllCustomers(): Customer[] {
    return db.getAllSync<Customer>(
        `SELECT id, name, COALESCE(phone, '') as phone,
            COALESCE(address, '') as address,
            COALESCE(total_due, 0) as totalDue
     FROM due_customers
     ORDER BY id DESC`
    );
}

export function getCustomerById(id: number): Customer | null {
    const rows = db.getAllSync<Customer>(
        `SELECT id, name, COALESCE(phone, '') as phone,
            COALESCE(address, '') as address,
            COALESCE(total_due, 0) as totalDue
     FROM due_customers WHERE id = ?`,
        [id]
    );
    return rows[0] ?? null;
}

export function addCustomer(c: Customer): number {
    const r = db.runSync(
        `INSERT INTO due_customers (name, phone, address, total_due)
     VALUES (?, ?, ?, ?)`,
        [c.name, c.phone, c.address, c.totalDue]
    );
    return r.lastInsertRowId;
}

export function updateCustomer(c: Customer): void {
    db.runSync(
        `UPDATE due_customers
     SET name = ?, phone = ?, address = ?
     WHERE id = ?`,
        [c.name, c.phone, c.address, c.id!]
    );
}

export function deleteCustomer(id: number): void {
    db.withTransactionSync(() => {
        db.runSync("DELETE FROM due_payments WHERE customer_id = ?", [id]);
        db.runSync("DELETE FROM due_customers WHERE id = ?", [id]);
    });
}

export function addDueToCustomer(customerId: number, amount: number): void {
    db.runSync(
        `UPDATE due_customers
     SET total_due = total_due + ?
     WHERE id = ?`,
        [amount, customerId]
    );
}

export function payDue(customerId: number, amount: number, note = ""): void {
    db.withTransactionSync(() => {
        db.runSync(
            `UPDATE due_customers
       SET total_due = total_due - ?
       WHERE id = ?`,
            [amount, customerId]
        );
        db.runSync(
            `INSERT INTO due_payments (customer_id, amount, note)
       VALUES (?, ?, ?)`,
            [customerId, amount, note]
        );
    });
}

// ============================
// 🆕 Bulk Add Customers (Excel Import)
// ============================
export function bulkAddCustomers(
    customers: {
        name: string;
        phone: string;
        address: string;
        totalDue: number;
    }[]
): { inserted: number; skipped: number } {
    let inserted = 0;
    let skipped = 0;

    db.withTransactionSync(() => {
        for (const c of customers) {
            try {
                // ফোন থাকলে ডুপ্লিকেট চেক
                if (c.phone) {
                    const ex = db.getAllSync<{ c: number }>(
                        `SELECT COUNT(*) as c FROM due_customers WHERE phone = ?`,
                        [c.phone]
                    )[0];
                    if (ex && ex.c > 0) {
                        skipped++;
                        continue;
                    }
                }

                db.runSync(
                    `INSERT INTO due_customers (name, phone, address, total_due)
           VALUES (?, ?, ?, ?)`,
                    [c.name, c.phone, c.address, c.totalDue]
                );
                inserted++;
            } catch (e) {
                console.error("Insert customer fail:", c.name, e);
                skipped++;
            }
        }
    });

    return { inserted, skipped };
}

// ============================
// Ledger
// ============================
export function getCustomerLedger(customerId: number): LedgerEntry[] {
    const sales = db.getAllSync<{
        id: number;
        created_at: string;
        total: number;
        due_amount: number;
        paid: number;
    }>(
        `SELECT id, created_at, total, due_amount, paid
     FROM sales
     WHERE customer_id = ? AND is_due = 1
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
     ORDER BY created_at ASC`,
        [customerId]
    );

    const combined: {
        kind: "sale" | "payment";
        date: string;
        debit: number;
        credit: number;
        refId: number;
    }[] = [];

    for (const s of sales) {
        combined.push({
            kind: "sale",
            date: s.created_at,
            debit: s.due_amount,
            credit: 0,
            refId: s.id,
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

        let description = "";
        if (e.kind === "sale") {
            const items = db.getAllSync<{ name: string; qty: number }>(
                `SELECT name, qty FROM sale_items WHERE sale_id = ?`,
                [e.refId]
            );
            const itemStr = items.map((i) => `${i.name} × ${i.qty}`).join(", ");
            description = `বিল #${e.refId} — ${itemStr}`;
        } else {
            const pay = db.getAllSync<{ note: string }>(
                `SELECT COALESCE(note, '') as note FROM due_payments WHERE id = ?`,
                [e.refId]
            );
            description = pay[0]?.note || "ক্যাশ পেমেন্ট";
        }

        return {
            id: e.refId,
            type: e.kind,
            date: e.date,
            description,
            debit: e.debit,
            credit: e.credit,
            balance,
        };
    });
}