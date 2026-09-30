import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { LedgerSummary } from "../db/customers";
import { formatDate, formatDateTime, formatTk } from "./format";
import { getPharmacyInfo } from "./pharmacy";

// ============================
// 🎯 Universal PDF Generator
// ============================
export async function generatePDFFile(
  html: string,
  fileNamePrefix: string
): Promise<string> {
  try {
    const { base64 } = await Print.printToFileAsync({
      html,
      base64: true,
    });

    if (!base64) throw new Error("PDF ডেটা পাওয়া যায়নি");

    const now = new Date();
    const dateStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    const timeStr = [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("-");

    const fileName = `${fileNamePrefix}_${dateStr}_${timeStr}.pdf`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  } catch (e: any) {
    throw new Error(e?.message || "PDF তৈরি করা যায়নি");
  }
}

// ============================
// 📤 Share PDF
// ============================
export async function sharePDF(uri: string, title = "PDF শেয়ার করুন") {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) throw new Error("ফাইল পাওয়া যায়নি");

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: title,
        UTI: "com.adobe.pdf",
      });
    } else {
      throw new Error("শেয়ার সাপোর্ট করে না");
    }
  } catch (e: any) {
    throw new Error(e?.message || "শেয়ার করা যায়নি");
  }
}

// ============================
// 📒 Customer Ledger PDF
// ============================
export async function generateLedgerPDF(
  summary: LedgerSummary
): Promise<string> {
  const pharmacy = await getPharmacyInfo();

  const {
    customer,
    entries,
    totalDebit,
    totalCredit,
    currentDue,
    totalSales,
    totalPaid,
    openingBalance,
  } = summary;

  const rows = entries
    .map((e, idx) => {
      const isOpening = e.type === "opening";
      const isSale = e.type === "sale";
      const isPayment = e.type === "payment";

      const typeLabel = isOpening
        ? "পুরনো বাকি"
        : isSale
          ? "বিক্রয়"
          : "জমা";

      const typeColor = isOpening
        ? "#3b82f6"
        : isSale
          ? "#dc2626"
          : "#16a34a";

      const typeBg = isOpening
        ? "#dbeafe"
        : isSale
          ? "#fee2e2"
          : "#dcfce7";

      let itemsHtml = "";
      if (isSale && e.items && e.items.length > 0) {
        itemsHtml = e.items
          .map(
            (i) =>
              `<div class="item-row">${i.name} × ${i.qty} = ${formatTk(
                i.subtotal
              )}</div>`
          )
          .join("");
      }

      return `
      <tr>
        <td>${idx + 1}</td>
        <td>${formatDateTime(e.date)}</td>
        <td>
          <span class="badge" style="background:${typeBg};color:${typeColor}">${typeLabel}</span>
          <div class="desc">${e.description}</div>
          ${itemsHtml}
        </td>
        <td class="amount debit">${e.debit > 0 ? formatTk(e.debit) : "—"
        }</td>
        <td class="amount credit">${e.credit > 0 ? formatTk(e.credit) : "—"
        }</td>
        <td class="amount balance">${formatTk(e.balance)}</td>
      </tr>
    `;
    })
    .join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, Arial, "Noto Sans Bengali", sans-serif; padding: 20px; color: #111827; font-size: 12px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 14px; }
      .header h1 { color: #0d9488; margin: 0; font-size: 20px; }
      .header .meta { color: #6b7280; font-size: 11px; margin-top: 3px; }
      .customer-box { background: #f9fafb; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; font-size: 12px; line-height: 1.6; }
      .customer-box b { color: #374151; }
      .summary-cards { display: flex; gap: 8px; margin-bottom: 14px; }
      .summary-card { flex: 1; background: #f9fafb; border-radius: 8px; padding: 10px; text-align: center; }
      .summary-card .label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
      .summary-card .value { font-size: 15px; font-weight: 800; margin-top: 4px; }
      .summary-card .value.red { color: #dc2626; }
      .summary-card .value.green { color: #16a34a; }
      .summary-card .value.orange { color: #d97706; }
      .summary-card .value.blue { color: #0d9488; }
      .summary-card .value.flag { color: #3b82f6; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
      th { background: #f9fafb; text-align: left; color: #374151; font-size: 10px; text-transform: uppercase; font-weight: 700; }
      td.amount { text-align: right; font-weight: 700; }
      td.debit { color: #dc2626; }
      td.credit { color: #16a34a; }
      td.balance { color: #0d9488; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; }
      .desc { font-size: 11px; color: #374151; margin-top: 3px; }
      .item-row { font-size: 10px; color: #6b7280; padding-left: 8px; margin-top: 2px; }
      .footer { margin-top: 20px; text-align: center; color: #9ca3af; font-size: 10px; border-top: 1px dashed #e5e7eb; padding-top: 10px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>${pharmacy.name}</h1>
        ${pharmacy.address ? `<div class="meta">${pharmacy.address}</div>` : ""}
        ${pharmacy.phone ? `<div class="meta">ফোন: ${pharmacy.phone}</div>` : ""}
        <div class="meta" style="margin-top:6px"><b>কাস্টমার লেজার / স্টেটমেন্ট</b></div>
      </div>
      <div class="meta" style="text-align:right">
        ${formatDateTime(new Date().toISOString())}
      </div>
    </div>

    <div class="customer-box">
      <div><b>নাম:</b> ${customer.name}</div>
      ${customer.phone ? `<div><b>ফোন:</b> ${customer.phone}</div>` : ""}
      ${customer.address ? `<div><b>ঠিকানা:</b> ${customer.address}</div>` : ""}
    </div>

    <div class="summary-cards">
      <div class="summary-card">
        <div class="label">মোট বিক্রয়</div>
        <div class="value blue">${formatTk(totalSales + openingBalance)}</div>
      </div>
      <div class="summary-card">
        <div class="label">মোট জমা</div>
        <div class="value green">${formatTk(totalCredit + totalPaid)}</div>
      </div>
      <div class="summary-card">
        <div class="label">বর্তমান বাকি</div>
        <div class="value orange">${formatTk(currentDue)}</div>
      </div>
    </div>

    <div class="summary-cards">
      ${openingBalance > 0
      ? `<div class="summary-card">
              <div class="label">পুরনো বাকি</div>
              <div class="value flag">${formatTk(openingBalance)}</div>
            </div>`
      : ""
    }
      <div class="summary-card">
        <div class="label">বিলে বাকি</div>
        <div class="value red">${formatTk(totalDebit - openingBalance)}</div>
      </div>
      <div class="summary-card">
        <div class="label">বিলে পরিশোধ</div>
        <div class="value green">${formatTk(totalPaid)}</div>
      </div>
      <div class="summary-card">
        <div class="label">পরে জমা</div>
        <div class="value green">${formatTk(totalCredit)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th style="width:110px">তারিখ</th>
          <th>বিবরণ</th>
          <th style="text-align:right;width:70px">বাকি (+)</th>
          <th style="text-align:right;width:70px">জমা (−)</th>
          <th style="text-align:right;width:80px">ব্যালান্স</th>
        </tr>
      </thead>
      <tbody>
        ${rows ||
    '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:30px">কোনো লেনদেন নেই</td></tr>'
    }
      </tbody>
    </table>

    <div class="footer">
      এই স্টেটমেন্ট স্বয়ংক্রিয়ভাবে তৈরি হয়েছে।<br/>
      ${pharmacy.name} · ${formatDate(new Date().toISOString())}
    </div>
  </body>
  </html>`;

  return generatePDFFile(html, `ledger_${customer.id}`);
}