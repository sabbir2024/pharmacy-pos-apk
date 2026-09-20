import { db } from "./database";

// ============================
// আর্থিক সামারি
// ============================
export type DashboardStats = {
    todaySales: number;
    todayBills: number;
    monthSales: number;
    monthBills: number;
    totalDue: number;
    totalProfitToday: number;
};

export function getDashboardStats(): DashboardStats {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStr = monthStart.toISOString().slice(0, 10);

    const todayRow = db.getAllSync<{ total: number; count: number }>(
        `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
     FROM sales WHERE DATE(created_at) = DATE(?)`,
        [todayStr]
    )[0];

    const monthRow = db.getAllSync<{ total: number; count: number }>(
        `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
     FROM sales WHERE DATE(created_at) >= DATE(?)`,
        [monthStr]
    )[0];

    const dueRow = db.getAllSync<{ total: number }>(
        `SELECT COALESCE(SUM(total_due), 0) as total FROM due_customers`
    )[0];

    const profitRow = db.getAllSync<{ total: number }>(
        `SELECT COALESCE(SUM(
        (si.price - COALESCE(m.cost_price, 0)) * si.qty
     ), 0) as total
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     LEFT JOIN medicines m ON m.id = si.medicine_id
     WHERE DATE(s.created_at) = DATE(?)`,
        [todayStr]
    )[0];

    return {
        todaySales: todayRow?.total ?? 0,
        todayBills: todayRow?.count ?? 0,
        monthSales: monthRow?.total ?? 0,
        monthBills: monthRow?.count ?? 0,
        totalDue: dueRow?.total ?? 0,
        totalProfitToday: profitRow?.total ?? 0,
    };
}

// ============================
// স্টক সামারি
// ============================
export type StockStats = {
    totalMedicines: number;
    totalStockValue: number;
    totalCostValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiredCount: number;
    expiringSoonCount: number;
};

export function getStockStats(): StockStats {
    const todayStr = new Date().toISOString().slice(0, 10);
    const in90Days = new Date();
    in90Days.setDate(in90Days.getDate() + 90);
    const in90Str = in90Days.toISOString().slice(0, 10);

    const base = db.getAllSync<{
        total: number;
        stockValue: number;
        costValue: number;
    }>(
        `SELECT
       COUNT(*) as total,
       COALESCE(SUM(price * stock), 0) as stockValue,
       COALESCE(SUM(cost_price * stock), 0) as costValue
     FROM medicines`
    )[0];

    const low = db.getAllSync<{ c: number }>(
        `SELECT COUNT(*) as c FROM medicines WHERE stock > 0 AND stock <= 10`
    )[0];

    const out = db.getAllSync<{ c: number }>(
        `SELECT COUNT(*) as c FROM medicines WHERE stock <= 0`
    )[0];

    const expired = db.getAllSync<{ c: number }>(
        `SELECT COUNT(*) as c FROM medicines
     WHERE expiry IS NOT NULL AND expiry != '' AND DATE(expiry) < DATE(?)`,
        [todayStr]
    )[0];

    const soon = db.getAllSync<{ c: number }>(
        `SELECT COUNT(*) as c FROM medicines
     WHERE expiry IS NOT NULL AND expiry != ''
       AND DATE(expiry) >= DATE(?)
       AND DATE(expiry) <= DATE(?)`,
        [todayStr, in90Str]
    )[0];

    return {
        totalMedicines: base?.total ?? 0,
        totalStockValue: base?.stockValue ?? 0,
        totalCostValue: base?.costValue ?? 0,
        lowStockCount: low?.c ?? 0,
        outOfStockCount: out?.c ?? 0,
        expiredCount: expired?.c ?? 0,
        expiringSoonCount: soon?.c ?? 0,
    };
}

// ============================
// কম স্টক লিস্ট
// ============================
export type StockItem = {
    id: number;
    name: string;
    company: string;
    stock: number;
    unit: string;
    expiry: string;
};

export function getLowStockItems(): StockItem[] {
    return db.getAllSync<StockItem>(
        `SELECT id, name, COALESCE(company, '') as company,
            stock, COALESCE(unit, 'pcs') as unit,
            COALESCE(expiry, '') as expiry
     FROM medicines
     WHERE stock <= 10
     ORDER BY stock ASC
     LIMIT 20`
    );
}

// ============================
// এক্সপায়ারি লিস্ট
// ============================
export function getExpiringItems(): StockItem[] {
    const in90Days = new Date();
    in90Days.setDate(in90Days.getDate() + 90);
    const in90Str = in90Days.toISOString().slice(0, 10);

    return db.getAllSync<StockItem>(
        `SELECT id, name, COALESCE(company, '') as company,
            stock, COALESCE(unit, 'pcs') as unit,
            COALESCE(expiry, '') as expiry
     FROM medicines
     WHERE expiry IS NOT NULL AND expiry != ''
       AND DATE(expiry) <= DATE(?)
     ORDER BY expiry ASC
     LIMIT 20`,
        [in90Str]
    );
}

// ============================
// টপ সেলিং
// ============================
export type TopSelling = {
    name: string;
    totalQty: number;
    totalAmount: number;
};

export function getTopSelling(): TopSelling[] {
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStr = monthStart.toISOString().slice(0, 10);

    return db.getAllSync<TopSelling>(
        `SELECT si.name as name,
            SUM(si.qty) as totalQty,
            SUM(si.subtotal) as totalAmount
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     WHERE DATE(s.created_at) >= DATE(?)
     GROUP BY si.name
     ORDER BY totalQty DESC
     LIMIT 5`,
        [monthStr]
    );
}

// ============================
// সাম্প্রতিক বিক্রয়
// ============================
export type RecentSale = {
    id: number;
    total: number;
    createdAt: string;
    isDue: number;
    dueAmount: number;
    customerName: string | null;
};

export function getRecentSales(): RecentSale[] {
    return db.getAllSync<RecentSale>(
        `SELECT s.id, s.total,
            s.created_at as createdAt,
            s.is_due as isDue,
            s.due_amount as dueAmount,
            c.name as customerName
     FROM sales s
     LEFT JOIN due_customers c ON c.id = s.customer_id
     ORDER BY s.id DESC
     LIMIT 5`
    );
}

// ============================
// 📊 Date Range Sales
// ============================
export type DateRange = {
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
};

export type DayWiseSales = {
    date: string;
    total: number;
    bills: number;
};

export function getSalesByDateRange(range: DateRange): DayWiseSales[] {
    return db.getAllSync<DayWiseSales>(
        `SELECT
       DATE(created_at) as date,
       COALESCE(SUM(total), 0) as total,
       COUNT(*) as bills
     FROM sales
     WHERE DATE(created_at) >= DATE(?)
       AND DATE(created_at) <= DATE(?)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
        [range.from, range.to]
    );
}

// ============================
// Range সামারি
// ============================
export type RangeSummary = {
    totalSales: number;
    totalBills: number;
    totalDue: number;
    totalProfit: number;
    avgBill: number;
};

export function getRangeSummary(range: DateRange): RangeSummary {
    const sales = db.getAllSync<{
        total: number;
        count: number;
        due: number;
    }>(
        `SELECT
       COALESCE(SUM(total), 0) as total,
       COUNT(*) as count,
       COALESCE(SUM(due_amount), 0) as due
     FROM sales
     WHERE DATE(created_at) >= DATE(?)
       AND DATE(created_at) <= DATE(?)`,
        [range.from, range.to]
    )[0];

    const profit = db.getAllSync<{ total: number }>(
        `SELECT COALESCE(SUM(
        (si.price - COALESCE(m.cost_price, 0)) * si.qty
     ), 0) as total
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     LEFT JOIN medicines m ON m.id = si.medicine_id
     WHERE DATE(s.created_at) >= DATE(?)
       AND DATE(s.created_at) <= DATE(?)`,
        [range.from, range.to]
    )[0];

    const totalSales = sales?.total ?? 0;
    const totalBills = sales?.count ?? 0;

    return {
        totalSales,
        totalBills,
        totalDue: sales?.due ?? 0,
        totalProfit: profit?.total ?? 0,
        avgBill: totalBills > 0 ? totalSales / totalBills : 0,
    };
}

// ============================
// Range এর টপ সেলিং
// ============================
export function getTopSellingByRange(range: DateRange, limit = 5): TopSelling[] {
    return db.getAllSync<TopSelling>(
        `SELECT si.name as name,
            SUM(si.qty) as totalQty,
            SUM(si.subtotal) as totalAmount
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     WHERE DATE(s.created_at) >= DATE(?)
       AND DATE(s.created_at) <= DATE(?)
     GROUP BY si.name
     ORDER BY totalQty DESC
     LIMIT ?`,
        [range.from, range.to, limit]
    );
}

// ============================
// পেমেন্ট ব্রেকডাউন
// ============================
export type PaymentBreakdown = {
    method: string;
    total: number;
    count: number;
};

export function getPaymentBreakdown(range: DateRange): PaymentBreakdown[] {
    return db.getAllSync<PaymentBreakdown>(
        `SELECT
       COALESCE(payment_method, 'cash') as method,
       COALESCE(SUM(total), 0) as total,
       COUNT(*) as count
     FROM sales
     WHERE DATE(created_at) >= DATE(?)
       AND DATE(created_at) <= DATE(?)
     GROUP BY payment_method
     ORDER BY total DESC`,
        [range.from, range.to]
    );
}

// ============================
// ডেট হেল্পার
// ============================
export function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

export function daysAgoStr(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

export function monthStartStr(): string {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
}

export function yearStartStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
}