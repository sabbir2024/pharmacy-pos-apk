import { db } from "./database";

export type Invoice = {
    id: number;
    createdAt: string;
    total: number;
    discount: number;
    vat: number;
    paid: number;
    change: number;
    dueAmount: number;
    isDue: number;
    paymentMethod: string;
    customerId: number | null;
    customerName: string | null;
    customerPhone: string | null;
};

export type InvoiceItem = {
    name: string;
    price: number;
    qty: number;
    subtotal: number;
};

export function getAllInvoices(): Invoice[] {
    return db.getAllSync<Invoice>(
        `SELECT s.id,
            s.created_at as createdAt,
            s.total, s.discount, s.vat,
            s.paid, s.change,
            s.due_amount as dueAmount,
            s.is_due as isDue,
            s.payment_method as paymentMethod,
            s.customer_id as customerId,
            c.name as customerName,
            c.phone as customerPhone
     FROM sales s
     LEFT JOIN due_customers c ON c.id = s.customer_id
     ORDER BY s.id DESC`
    );
}

export function getInvoiceById(id: number): Invoice | null {
    const rows = db.getAllSync<Invoice>(
        `SELECT s.id,
            s.created_at as createdAt,
            s.total, s.discount, s.vat,
            s.paid, s.change,
            s.due_amount as dueAmount,
            s.is_due as isDue,
            s.payment_method as paymentMethod,
            s.customer_id as customerId,
            c.name as customerName,
            c.phone as customerPhone
     FROM sales s
     LEFT JOIN due_customers c ON c.id = s.customer_id
     WHERE s.id = ?`,
        [id]
    );
    return rows[0] ?? null;
}

export function getInvoiceItems(saleId: number): InvoiceItem[] {
    return db.getAllSync<InvoiceItem>(
        `SELECT name, price, qty, subtotal
     FROM sale_items WHERE sale_id = ?`,
        [saleId]
    );
}