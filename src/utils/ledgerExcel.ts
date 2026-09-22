import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import type { LedgerSummary } from "../db/customers";
import { formatDateTime } from "./format";

export async function exportLedgerToExcel(
    summary: LedgerSummary
): Promise<string> {
    const {
        customer,
        entries,
        totalDebit,
        totalCredit,
        currentDue,
        totalSales,
        totalPaid,
    } = summary;

    const rows: any[] = [];

    // Customer info
    rows.push({ "": "নাম", " ": customer.name });
    if (customer.phone) rows.push({ "": "ফোন", " ": customer.phone });
    if (customer.address) rows.push({ "": "ঠিকানা", " ": customer.address });

    rows.push({});
    rows.push({ "": "মোট বিক্রয়", " ": totalSales });
    rows.push({ "": "বিলে পরিশোধিত", " ": totalPaid });
    rows.push({ "": "বিলে বাকি (Total Debit)", " ": totalDebit });
    rows.push({ "": "পরে জমা (Total Credit)", " ": totalCredit });
    rows.push({ "": "বর্তমান বাকি", " ": currentDue });

    rows.push({});
    rows.push({
        SL: "SL",
        Date: "তারিখ",
        Type: "ধরন",
        Details: "বিবরণ",
        Debit: "বাকি (+)",
        Credit: "জমা (−)",
        Balance: "ব্যালান্স",
    });

    entries.forEach((e, idx) => {
        let details = e.description;
        if (e.type === "sale" && e.items && e.items.length > 0) {
            details =
                e.description +
                " | " +
                e.items
                    .map((i) => `${i.name} × ${i.qty} = ${i.subtotal}`)
                    .join(" | ");
        }

        rows.push({
            SL: idx + 1,
            Date: formatDateTime(e.date),
            Type: e.type === "sale" ? "বিক্রয়" : "জমা",
            Details: details,
            Debit: e.debit > 0 ? e.debit : "",
            Credit: e.credit > 0 ? e.credit : "",
            Balance: e.balance,
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
        { wch: 18 },
        { wch: 18 },
        { wch: 10 },
        { wch: 60 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");

    const base64 = XLSX.write(workbook, {
        type: "base64",
        bookType: "xlsx",
    });

    const safeName = customer.name.replace(/\s+/g, "_").replace(/[^\w]/g, "");
    const fileName = `ledger_${safeName}_${Date.now()}.xlsx`;
    const fileUri = FileSystem.cacheDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
            mimeType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "লেজার শেয়ার করুন",
            UTI: "com.microsoft.excel.xlsx",
        });
    }

    return fileUri;
}