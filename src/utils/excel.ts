import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import type { Product } from "../db/products";

// ============================
// Excel এর কলাম নাম → Product ফিল্ড
// ============================
const COLUMN_MAP: Record<string, keyof Product> = {
    name: "name",
    "নাম": "name",
    company: "company",
    "কোম্পানি": "company",
    price: "price",
    "বিক্রয়মূল্য": "price",
    stock: "stock",
    "পরিমাণ": "stock",
    unit: "unit",
    "ইউনিট": "unit",
    pcs_per_unit: "pcsPerUnit",
    "প্রতি ইউনিটে পিস": "pcsPerUnit",
    cost_price: "costPrice",
    "ক্রয়মূল্য": "costPrice",
    expiry: "expiry",
    "এক্সপায়ারি": "expiry",
    barcode: "barcode",
    "বারকোড": "barcode",
};

// ============================
// Product Excel parse
// ============================
export async function parseExcelFile(fileUri: string): Promise<{
    products: Omit<Product, "id">[];
    errors: string[];
}> {
    const errors: string[] = [];
    const products: Omit<Product, "id">[] = [];

    try {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(fileContent, {
            type: "base64",
            cellDates: true,
        });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false,
        });

        if (rows.length === 0) {
            return { products: [], errors: ["ফাইল খালি"] };
        }

        const headers = Object.keys(rows[0]);
        const mappedHeaders: Record<string, string> = {};
        for (const h of headers) {
            const key = h.toString().trim().toLowerCase();
            const mapped = COLUMN_MAP[key];
            if (mapped) mappedHeaders[h] = mapped;
        }

        if (!Object.values(mappedHeaders).includes("name")) {
            return {
                products: [],
                errors: ["'নাম' বা 'name' কলাম পাওয়া যায়নি"],
            };
        }

        rows.forEach((row, idx) => {
            const rowNum = idx + 2;
            const p: any = {};

            for (const [header, field] of Object.entries(mappedHeaders)) {
                let val = row[header];
                if (val === null || val === undefined) val = "";
                val = val.toString().trim();

                if (field === "price" || field === "costPrice") {
                    p[field] = parseFloat(val) || 0;
                } else if (field === "stock" || field === "pcsPerUnit") {
                    p[field] = parseInt(val) || (field === "pcsPerUnit" ? 1 : 0);
                } else {
                    p[field] = val;
                }
            }

            if (!p.name) {
                errors.push(`রো ${rowNum}: নাম নেই — বাদ দেওয়া হলো`);
                return;
            }

            if (!p.price || p.price <= 0) {
                errors.push(`রো ${rowNum}: বিক্রয়মূল্য সঠিক নয়`);
                return;
            }

            if (p.stock === undefined || p.stock < 0) {
                p.stock = 0;
            }

            products.push({
                name: p.name,
                company: p.company ?? "",
                price: p.price,
                stock: p.stock ?? 0,
                unit: p.unit ?? "pcs",
                pcsPerUnit: p.pcsPerUnit ?? 1,
                costPrice: p.costPrice ?? 0,
                expiry: p.expiry ?? "",
                barcode: p.barcode ?? "",
            });
        });

        return { products, errors };
    } catch (e: any) {
        console.error("Excel parse error:", e);
        return {
            products: [],
            errors: [`ফাইল পড়া যায়নি: ${e.message}`],
        };
    }
}

// ============================
// Product টেমপ্লেট ডাউনলোড
// ============================
export async function downloadTemplate() {
    const sample = [
        {
            name: "Napa Extra",
            company: "Beximco",
            price: 1200,
            stock: 150,
            unit: "box",
            pcs_per_unit: 100,
            cost_price: 1100,
            expiry: "2026-11-20",
            barcode: "8801234567890",
        },
        {
            name: "Seclo 20",
            company: "Square",
            price: 7,
            stock: 50,
            unit: "pcs",
            pcs_per_unit: 1,
            cost_price: 5,
            expiry: "2025-06-30",
            barcode: "8809876543210",
        },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Medicines");

    worksheet["!cols"] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 8 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 },
    ];

    const base64 = XLSX.write(workbook, {
        type: "base64",
        bookType: "xlsx",
    });

    const fileUri = FileSystem.cacheDirectory + "medicine_template.xlsx";
    await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
            mimeType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "টেমপ্লেট শেয়ার করুন",
            UTI: "com.microsoft.excel.xlsx",
        });
    }

    return fileUri;
}

// ============================
// Product Export
// ============================
export async function exportProductsToExcel(products: Product[]) {
    const rows = products.map((p) => ({
        name: p.name,
        company: p.company,
        price: p.price,
        stock: p.stock,
        unit: p.unit,
        pcs_per_unit: p.pcsPerUnit,
        cost_price: p.costPrice,
        expiry: p.expiry,
        barcode: p.barcode ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Medicines");

    worksheet["!cols"] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 8 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 },
    ];

    const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

    const fileUri = FileSystem.cacheDirectory + "medicines_export.xlsx";
    await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
            mimeType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "এক্সপোর্ট শেয়ার করুন",
            UTI: "com.microsoft.excel.xlsx",
        });
    }

    return fileUri;
}

// ============================
// Customer Excel parse
// ============================
export async function parseCustomerExcel(fileUri: string): Promise<{
    customers: {
        name: string;
        phone: string;
        address: string;
        totalDue: number;
    }[];
    errors: string[];
}> {
    const errors: string[] = [];
    const customers: any[] = [];

    try {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(fileContent, {
            type: "base64",
            cellDates: true,
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false,
        });

        if (rows.length === 0) {
            return { customers: [], errors: ["ফাইল খালি"] };
        }

        const headers = Object.keys(rows[0]);
        const mapped: Record<string, string> = {};
        const MAP: Record<string, string> = {
            name: "name",
            "নাম": "name",
            phone: "phone",
            "ফোন": "phone",
            address: "address",
            "ঠিকানা": "address",
            total_due: "totalDue",
            "মোট বাকি": "totalDue",
        };

        for (const h of headers) {
            const key = h.toString().trim().toLowerCase();
            if (MAP[key]) mapped[h] = MAP[key];
        }

        if (!Object.values(mapped).includes("name")) {
            return { customers: [], errors: ["'নাম' বা 'name' কলাম নেই"] };
        }

        rows.forEach((row, idx) => {
            const rowNum = idx + 2;
            const c: any = { name: "", phone: "", address: "", totalDue: 0 };

            for (const [header, field] of Object.entries(mapped)) {
                let val = row[header];
                if (val === null || val === undefined) val = "";
                val = val.toString().trim();

                if (field === "totalDue") {
                    c[field] = parseFloat(val) || 0;
                } else {
                    c[field] = val;
                }
            }

            if (!c.name) {
                errors.push(`রো ${rowNum}: নাম নেই`);
                return;
            }

            customers.push(c);
        });

        return { customers, errors };
    } catch (e: any) {
        return { customers: [], errors: [`ফাইল পড়া যায়নি: ${e.message}`] };
    }
}

// ============================
// Low Stock Excel parse
// ============================
export async function parseLowStockExcel(fileUri: string): Promise<{
    updates: { id: number; stock: number; minStock?: number }[];
    errors: string[];
}> {
    const errors: string[] = [];
    const updates: any[] = [];

    try {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(fileContent, {
            type: "base64",
            cellDates: true,
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false,
        });

        const headers = Object.keys(rows[0] ?? {});
        const mapped: Record<string, string> = {};
        const MAP: Record<string, string> = {
            id: "id",
            "আইডি": "id",
            stock: "stock",
            "স্টক": "stock",
            min_stock: "minStock",
            "সর্বনিম্ন স্টক": "minStock",
        };

        for (const h of headers) {
            const key = h.toString().trim().toLowerCase();
            if (MAP[key]) mapped[h] = MAP[key];
        }

        rows.forEach((row, idx) => {
            const rowNum = idx + 2;
            const u: any = {};

            for (const [header, field] of Object.entries(mapped)) {
                const val = row[header];
                if (field === "id") u.id = parseInt(val) || 0;
                else if (field === "stock") u.stock = parseInt(val) || 0;
                else if (field === "minStock") u.minStock = parseInt(val) || 0;
            }

            if (!u.id) {
                errors.push(`রো ${rowNum}: ID নেই`);
                return;
            }

            updates.push(u);
        });

        return { updates, errors };
    } catch (e: any) {
        return { updates: [], errors: [`ফাইল পড়া যায়নি: ${e.message}`] };
    }
}

// ============================
// Customer Export
// ============================
export async function exportCustomersToExcel(customers: any[]) {
    const rows = customers.map((c) => ({
        name: c.name,
        phone: c.phone,
        address: c.address,
        total_due: c.totalDue,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    worksheet["!cols"] = [20, 16, 20, 12].map((w) => ({ wch: w }));

    const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
    const fileUri = FileSystem.cacheDirectory + "customers_export.xlsx";
    await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
            mimeType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "শেয়ার করুন",
            UTI: "com.microsoft.excel.xlsx",
        });
    }
    return fileUri;
}

// ============================
// Low Stock Export
// ============================
export async function exportLowStockToExcel(items: any[]) {
    const rows = items.map((i) => ({
        id: i.id,
        name: i.name,
        stock: i.stock,
        min_stock: 10,
        unit: i.unit,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LowStock");
    worksheet["!cols"] = [8, 20, 10, 12, 10].map((w) => ({ wch: w }));

    const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
    const fileUri = FileSystem.cacheDirectory + "low_stock_export.xlsx";
    await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
            mimeType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "শেয়ার করুন",
            UTI: "com.microsoft.excel.xlsx",
        });
    }
    return fileUri;
}