import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

// ============================
// সাধারণ হেল্পার
// ============================
async function saveAndShare(
    data: any[],
    sheetName: string,
    fileName: string,
    colsWidth: number[]
) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    worksheet["!cols"] = colsWidth.map((w) => ({ wch: w }));

    const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
    const fileUri = FileSystem.cacheDirectory + fileName;

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
// 🧪 Product টেমপ্লেট
// ============================
export async function downloadProductTemplate() {
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
    ];
    return saveAndShare(
        sample,
        "Medicines",
        "product_template.xlsx",
        [20, 15, 12, 10, 8, 15, 12, 15, 18]
    );
}

// ============================
// 👥 Due Customer টেমপ্লেট
// ============================
export async function downloadCustomerTemplate() {
    const sample = [
        {
            name: "করিম সাহেব",
            phone: "01712345678",
            address: "ঢাকা",
            total_due: 1500,
        },
        {
            name: "রহিম মিয়া",
            phone: "01898765432",
            address: "চট্টগ্রাম",
            total_due: 800,
        },
    ];
    return saveAndShare(
        sample,
        "Customers",
        "customer_template.xlsx",
        [20, 16, 20, 12]
    );
}

// ============================
// ⚠️ Low Stock টেমপ্লেট
// ============================
export async function downloadLowStockTemplate() {
    const sample = [
        {
            id: 1,
            name: "Napa Extra",
            stock: 5,
            min_stock: 20,
        },
    ];
    return saveAndShare(
        sample,
        "LowStock",
        "low_stock_template.xlsx",
        [8, 20, 10, 12]
    );
}