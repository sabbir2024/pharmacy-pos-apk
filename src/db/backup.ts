import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { db } from "./database";

// ============================
// সব টেবিলের নাম
// ============================
const TABLES = [
    "medicines",
    "sales",
    "sale_items",
    "due_customers",
    "due_payments",
] as const;

type TableName = (typeof TABLES)[number];

// ============================
// Backup Data Type
// ============================
export type BackupData = {
    version: string;
    appName: string;
    exportedAt: string;
    tables: {
        [key in TableName]: any[];
    };
};

// ============================
// সব ডেটা পড়া
// ============================
export function getAllData(): BackupData {
    const tables = {} as { [key in TableName]: any[] };

    for (const t of TABLES) {
        try {
            const rows = db.getAllSync<any>(`SELECT * FROM ${t}`);
            tables[t] = rows;
        } catch (e) {
            console.error(`Failed to read table ${t}:`, e);
            tables[t] = [];
        }
    }

    return {
        version: "1.0.0",
        appName: "Pharmacy POS",
        exportedAt: new Date().toISOString(),
        tables,
    };
}

// ============================
// Backup statistics
// ============================
export type BackupStats = {
    medicines: number;
    sales: number;
    saleItems: number;
    dueCustomers: number;
    duePayments: number;
};

export function getBackupStats(): BackupStats {
    const get = (t: TableName) => {
        try {
            const r = db.getAllSync<{ c: number }>(
                `SELECT COUNT(*) as c FROM ${t}`
            )[0];
            return r?.c ?? 0;
        } catch {
            return 0;
        }
    };

    return {
        medicines: get("medicines"),
        sales: get("sales"),
        saleItems: get("sale_items"),
        dueCustomers: get("due_customers"),
        duePayments: get("due_payments"),
    };
}

// ============================
// Backup → JSON ফাইল
// ============================
export async function createBackup(): Promise<{
    uri: string;
    size: number;
    data: BackupData;
}> {
    const data = getAllData();
    const json = JSON.stringify(data, null, 2);

    const date = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
    const fileName = `pharmacy_backup_${date}.json`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
    });

    const info = await FileSystem.getInfoAsync(fileUri);
    const size = (info as any).size ?? json.length;

    return { uri: fileUri, size, data };
}

// ============================
// Backup শেয়ার করুন
// ============================
export async function shareBackup(fileUri: string) {
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
            mimeType: "application/json",
            dialogTitle: "ব্যাকআপ শেয়ার করুন",
            UTI: "public.json",
        });
    } else {
        throw new Error("শেয়ার সাপোর্টেড নয়");
    }
}

// ============================
// Backup ফাইল থেকে পড়া
// ============================
export async function parseBackupFile(
    fileUri: string
): Promise<BackupData> {
    const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
    });

    const data: BackupData = JSON.parse(content);

    if (!data.tables || !data.version) {
        throw new Error("অবৈধ ব্যাকআপ ফাইল");
    }

    return data;
}

// ============================
// Restore — সব ডেটা প্রতিস্থাপন
// ============================
export function restoreBackup(data: BackupData): {
    restored: { [key: string]: number };
} {
    const restored: { [key: string]: number } = {};

    db.withTransactionSync(() => {
        // ১. সব টেবিল খালি করো
        db.execSync("DELETE FROM sale_items");
        db.execSync("DELETE FROM sales");
        db.execSync("DELETE FROM due_payments");
        db.execSync("DELETE FROM due_customers");
        db.execSync("DELETE FROM medicines");

        // ২. প্রতিটা টেবিলের ডেটা insert
        for (const t of TABLES) {
            const rows = data.tables[t] ?? [];
            let count = 0;

            for (const row of rows) {
                try {
                    const keys = Object.keys(row);
                    const values = keys.map((k) => row[k]);
                    const placeholders = keys.map(() => "?").join(", ");

                    db.runSync(
                        `INSERT INTO ${t} (${keys.join(", ")}) VALUES (${placeholders})`,
                        values
                    );
                    count++;
                } catch (e) {
                    console.error(`Insert failed in ${t}:`, row, e);
                }
            }

            restored[t] = count;
        }
    });

    return { restored };
}

// ============================
// সব ডেটা মুছে ফেলা
// ============================
export function clearAllData(): void {
    db.withTransactionSync(() => {
        db.execSync("DELETE FROM sale_items");
        db.execSync("DELETE FROM sales");
        db.execSync("DELETE FROM due_payments");
        db.execSync("DELETE FROM due_customers");
        db.execSync("DELETE FROM medicines");

        // Auto-increment রিসেট
        db.execSync(
            `DELETE FROM sqlite_sequence WHERE name IN 
       ('medicines','sales','sale_items','due_customers','due_payments')`
        );
    });
}

// ============================
// 🆕 ফাইল সাইজ ফরম্যাট
// ============================
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}