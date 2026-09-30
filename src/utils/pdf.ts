import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Customer, LedgerEntry } from "../db/customers";
import type { Invoice, InvoiceItem } from "../db/invoices";
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
    console.log("📄 Generating PDF...");

    const { base64 } = await Print.printToFileAsync({
      html,
      base64: true,
    });

    if (!base64) {
      throw new Error("PDF ডেটা পাওয়া যায়নি");
    }

    console.log("📦 Base64 length:", base64.length);

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

    console.log("✅ PDF saved:", fileUri);
    return fileUri;
  } catch (e: any) {
    console.error("❌ PDF generation error:", e);
    throw new Error(e?.message || "PDF তৈরি করা যায়নি");
  }
}

// ============================
// 📤 Share PDF
// ============================
export async function sharePDF(uri: string, title = "PDF শেয়ার করুন") {
  try {
    console.log("📤 Share PDF:", uri);

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error("PDF ফাইল পাওয়া যায়নি");
    }

    console.log("📦 File size:", (fileInfo as any).size);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: title,
        UTI: "com.adobe.pdf",
      });
      console.log("✅ Shared successfully");
    } else {
      throw new Error("এই ডিভাইসে শেয়ার সাপোর্ট করে না");
    }
  } catch (e: any) {
    const msg = e?.message || e?.toString() || "শেয়ার করা যায়নি";
    console.error("❌ Share error:", msg);
    throw new Error(msg);
  }
}

// ============================
// 🧾 Invoice PDF
// ============================
export async function generateInvoicePDF(
  invoice: Invoice,
  items: InvoiceItem[]
): Promise<string> {
  const pharmacy = await getPharmacyInfo();

  const itemRows = items
    .map(
      (i, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${i.name}</td>
        <td style="text-align:right">${i.qty}</td>
        <td style="text-align:right">${formatTk(i.price)}</td>
        <td style="text-align:right">${formatTk(i.subtotal)}</td>
      </tr>`
    )
    .join("");

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, Arial, "Noto Sans Bengali", sans-serif;
        padding: 24px;
        color: #111827;
        font-size: 13px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #0d9488;
        padding-bottom: 12px;
        margin-bottom: 14px;
      }
      .brand h1 { color: #0d9488; margin: 0; font-size: 22px; }
      .brand .meta { color: #6b7280; font-size: 11px; margin-top: 3px; }
      .inv-info { text-align: right; }
      .inv-info .num { font-size: 15px; font-weight: bold; color: #111827; }
      .inv-info .date { font-size: 11px; color: #6b7280; margin-top: 4px; }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-top: 6px; }
      .badge-paid { background: #dcfce7; color: #166534; }
      .badge-due { background: #fef3c7; color: #92400e; }

      .customer { background: #f9fafb; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; }
      .customer b { color: #374151; }

      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
      th { background: #f9fafb; text-align: left; color: #374151; font-size: 11px; text-transform: uppercase; }

      .totals { margin-top: 14px; width: 60%; margin-left: auto; }
      .totals .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
      .totals .row.grand { font-weight: bold; color: #0d9488; font-size: 16px; border-top: 2px solid #0d9488; padding-top: 8px; margin-top: 6px; }
      .totals .row.payment { color: #16a34a; font-weight: bold; font-size: 14px; }
      .totals .row.change { color: #dc2626; font-weight: bold; font-size: 14px; }
      .totals .row.due { color: #d97706; font-weight: bold; font-size: 14px; }

      .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px dashed #e5e7eb; padding-top: 12px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand">
        <h1>${pharmacy.name}</h1>
        ${pharmacy.address ? `<div class="meta">${pharmacy.address}</div>` : ""}
        ${pharmacy.phone ? `<div class="meta">ফোন: ${pharmacy.phone}</div>` : ""}
      </div>
      <div class="inv-info">
        <div class="num">ইনভয়েস #${invoice.id}</div>
        <div class="date">${formatDateTime(invoice.createdAt)}</div>
        ${invoice.isDue
      ? `<span class="badge badge-due">বাকি</span>`
      : `<span class="badge badge-paid">পরিশোধিত</span>`
    }
      </div>
    </div>

    ${invoice.customerName
      ? `<div class="customer">
            <b>কাস্টমার:</b> ${invoice.customerName}
            ${invoice.customerPhone ? ` · ${invoice.customerPhone}` : ""}
          </div>`
      : ""
    }

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>ঔষধ</th>
          <th style="text-align:right">পরিমাণ</th>
          <th style="text-align:right">দাম</th>
          <th style="text-align:right">সাবটোটাল</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>সাবটোটাল</span><span>${formatTk(subtotal)}</span></div>
      ${invoice.discount > 0
      ? `<div class="row"><span>ডিসকাউন্ট</span><span>− ${formatTk(invoice.discount)}</span></div>`
      : ""
    }
      ${invoice.vat > 0
      ? `<div class="row"><span>VAT</span><span>+ ${formatTk(invoice.vat)}</span></div>`
      : ""
    }
      <div class="row grand"><span>মোট</span><span>${formatTk(invoice.total)}</span></div>
      <div class="row payment">
        <span>কাস্টমার দিয়েছে</span>
        <span>${formatTk(invoice.paid)}</span>
      </div>
      ${invoice.isDue
      ? `<div class="row due"><span>বাকি থাকবে</span><span>${formatTk(invoice.dueAmount)}</span></div>`
      : `<div class="row change"><span>ফেরত দিতে হবে</span><span>${formatTk(invoice.change)}</span></div>`
    }
      <div class="row" style="font-size:11px;color:#6b7280">
        <span>পেমেন্ট মেথড</span>
        <span>${invoice.paymentMethod.toUpperCase()}</span>
      </div>
    </div>

    <div class="footer">
      ধন্যবাদ! আবার আসবেন।<br/>
      এই ইনভয়েস কম্পিউটার জেনারেটেড।
    </div>
  </body>
  </html>`;

  return generatePDFFile(html, `invoice_${invoice.id}`);
}

// ============================
// 📒 Customer Ledger PDF
// ============================
export async function generateCustomerLedgerPDF(
  customer: Customer,
  ledger: LedgerEntry[]
): Promise<string> {
  const pharmacy = await getPharmacyInfo();

  const rows = ledger
    .map(
      (e, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${formatDateTime(e.date)}</td>
        <td>${e.description}</td>
        <td style="text-align:right;color:#dc2626">${e.debit ? formatTk(e.debit) : "—"
        }</td>
        <td style="text-align:right;color:#16a34a">${e.credit ? formatTk(e.credit) : "—"
        }</td>
        <td style="text-align:right;font-weight:600">${formatTk(e.balance)}</td>
      </tr>`
    )
    .join("");

  const totalDebit = ledger.reduce((s, e) => s + e.debit, 0);
  const totalCredit = ledger.reduce((s, e) => s + e.credit, 0);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Arial, "Noto Sans Bengali", sans-serif; padding: 24px; color: #111827; font-size: 13px; }
      .header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 14px; }
      .header h1 { color: #0d9488; margin: 0; font-size: 22px; }
      .header .meta { color: #6b7280; font-size: 11px; margin-top: 3px; }
      .customer-box { background: #f9fafb; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; font-size: 12px; line-height: 1.6; }
      .customer-box b { color: #374151; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
      th { background: #f9fafb; text-align: left; color: #374151; font-size: 10px; text-transform: uppercase; }
      .summary { margin-top: 16px; width: 60%; margin-left: auto; }
      .summary .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
      .summary .row.grand { font-weight: bold; color: #d97706; font-size: 16px; border-top: 2px solid #d97706; padding-top: 8px; margin-top: 6px; }
      .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px dashed #e5e7eb; padding-top: 12px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${pharmacy.name}</h1>
      ${pharmacy.address ? `<div class="meta">${pharmacy.address}</div>` : ""}
      ${pharmacy.phone ? `<div class="meta">ফোন: ${pharmacy.phone}</div>` : ""}
      <div class="meta" style="margin-top:6px">কাস্টমার স্টেটমেন্ট</div>
    </div>
    <div class="customer-box">
      <div><b>নাম:</b> ${customer.name}</div>
      ${customer.phone ? `<div><b>ফোন:</b> ${customer.phone}</div>` : ""}
      ${customer.address ? `<div><b>ঠিকানা:</b> ${customer.address}</div>` : ""}
      <div><b>তারিখ:</b> ${formatDateTime(new Date().toISOString())}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>তারিখ</th>
          <th>বিবরণ</th>
          <th style="text-align:right">বাকি (+)</th>
          <th style="text-align:right">জমা (−)</th>
          <th style="text-align:right">ব্যালান্স</th>
        </tr>
      </thead>
      <tbody>
        ${rows ||
    '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px">কোনো লেনদেন নেই</td></tr>'
    }
      </tbody>
    </table>
    <div class="summary">
      <div class="row"><span>মোট বাকি</span><span>${formatTk(totalDebit)}</span></div>
      <div class="row"><span>মোট জমা</span><span>${formatTk(totalCredit)}</span></div>
      <div class="row grand"><span>বর্তমান বাকি</span><span>${formatTk(customer.totalDue)}</span></div>
    </div>
    <div class="footer">
      এই স্টেটমেন্ট স্বয়ংক্রিয়ভাবে তৈরি হয়েছে।<br/>
      ${pharmacy.name} · ${formatDate(new Date().toISOString())}
    </div>
  </body>
  </html>`;

  return generatePDFFile(html, `ledger_${customer.id}`);
}

// ============================
// 📦 Products PDF
// ============================
export async function generateProductsPDF(products: any[]): Promise<string> {
  const pharmacy = await getPharmacyInfo();

  const rows = products
    .map(
      (p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${p.name}</td>
        <td>${p.company || "—"}</td>
        <td style="text-align:right">${formatTk(p.price)}</td>
        <td style="text-align:right">${p.stock} ${p.unit}</td>
        <td style="text-align:right;color:${p.stock <= 10 ? "#dc2626" : "#16a34a"}">${p.stock <= 0 ? "শেষ" : p.stock <= 10 ? "কম" : "ঠিক"
        }</td>
        <td>${p.expiry || "—"}</td>
      </tr>`
    )
    .join("");

  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const totalItems = products.reduce((s, p) => s + p.stock, 0);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, "Noto Sans Bengali", sans-serif; padding: 20px; color: #111827; font-size: 12px; }
      .header { border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; }
      .header h1 { color: #0d9488; margin: 0; font-size: 20px; }
      .header .meta { color: #6b7280; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
      th { background: #f9fafb; text-align: left; color: #374151; text-transform: uppercase; font-size: 10px; }
      .summary { margin-top: 14px; display: flex; justify-content: space-between; background: #f9fafb; padding: 10px 14px; border-radius: 8px; font-size: 12px; }
      .summary b { color: #0d9488; }
      .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 10px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>${pharmacy.name}</h1>
        ${pharmacy.address ? `<div class="meta">${pharmacy.address}</div>` : ""}
        <div class="meta">প্রোডাক্ট স্টক রিপোর্ট</div>
      </div>
      <div class="meta">${formatDateTime(new Date().toISOString())}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>ঔষধ</th><th>কোম্পানি</th>
          <th style="text-align:right">দাম</th>
          <th style="text-align:right">স্টক</th>
          <th style="text-align:right">অবস্থা</th>
          <th>এক্সপায়ারি</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      <div>মোট আইটেম: <b>${products.length}</b></div>
      <div>মোট পিস: <b>${totalItems}</b></div>
      <div>স্টক মূল্য: <b>${formatTk(totalValue)}</b></div>
    </div>
    <div class="footer">${pharmacy.name} · কম্পিউটার জেনারেটেড রিপোর্ট</div>
  </body>
  </html>`;

  return generatePDFFile(html, `products`);
}

// ============================
// 👥 Customers PDF
// ============================
export async function generateCustomersPDF(customers: any[]): Promise<string> {
  const pharmacy = await getPharmacyInfo();

  const rows = customers
    .map(
      (c, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${c.name}</td>
        <td>${c.phone || "—"}</td>
        <td>${c.address || "—"}</td>
        <td style="text-align:right;font-weight:700;color:${c.totalDue > 0 ? "#dc2626" : "#16a34a"}">${formatTk(c.totalDue)}</td>
      </tr>`
    )
    .join("");

  const totalDue = customers.reduce((s, c) => s + c.totalDue, 0);
  const withDue = customers.filter((c) => c.totalDue > 0).length;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, "Noto Sans Bengali", sans-serif; padding: 20px; color: #111827; font-size: 12px; }
      .header { border-bottom: 2px solid #d97706; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; }
      .header h1 { color: #d97706; margin: 0; font-size: 20px; }
      .header .meta { color: #6b7280; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
      th { background: #f9fafb; text-align: left; color: #374151; text-transform: uppercase; font-size: 10px; }
      .summary { margin-top: 14px; display: flex; justify-content: space-between; background: #fef3c7; padding: 10px 14px; border-radius: 8px; font-size: 12px; }
      .summary b { color: #92400e; }
      .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 10px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>${pharmacy.name}</h1>
        ${pharmacy.address ? `<div class="meta">${pharmacy.address}</div>` : ""}
        <div class="meta">বাকি কাস্টমার স্টেটমেন্ট</div>
      </div>
      <div class="meta">${formatDateTime(new Date().toISOString())}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>নাম</th><th>ফোন</th><th>ঠিকানা</th>
          <th style="text-align:right">মোট বাকি</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      <div>মোট কাস্টমার: <b>${customers.length}</b></div>
      <div>বাকি আছে: <b>${withDue}</b></div>
      <div>মোট বাকি: <b>${formatTk(totalDue)}</b></div>
    </div>
    <div class="footer">${pharmacy.name} · কম্পিউটার জেনারেটেড রিপোর্ট</div>
  </body>
  </html>`;

  return generatePDFFile(html, `customers`);
}

// ============================
// ⚠️ Low Stock PDF
// ============================
export async function generateLowStockPDF(items: any[]): Promise<string> {
  const pharmacy = await getPharmacyInfo();

  const rows = items
    .map(
      (i, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${i.name}</td>
        <td>${i.company || "—"}</td>
        <td style="text-align:right;font-weight:700;color:${i.stock <= 0 ? "#dc2626" : "#d97706"
        }">${i.stock}</td>
        <td>${i.unit || "pcs"}</td>
        <td style="color:#9ca3af;font-style:italic">__________</td>
      </tr>`
    )
    .join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, "Noto Sans Bengali", sans-serif; padding: 20px; color: #111827; font-size: 12px; }
      .header { border-bottom: 2px solid #dc2626; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
      .header h1 { color: #dc2626; margin: 0; font-size: 20px; }
      .header .meta { color: #6b7280; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
      th { background: #f9fafb; text-align: left; color: #374151; text-transform: uppercase; font-size: 10px; }
      .summary { margin-top: 14px; background: #fee2e2; padding: 10px 14px; border-radius: 8px; font-size: 12px; color: #991b1b; text-align: center; }
      .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 10px; border-top: 1px dashed #e5e7eb; padding-top: 10px; }
      .signature { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; }
      .signature .line { border-top: 1px solid #374151; width: 180px; padding-top: 4px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>${pharmacy.name}</h1>
        ${pharmacy.address ? `<div class="meta">${pharmacy.address}</div>` : ""}
        ${pharmacy.phone ? `<div class="meta">ফোন: ${pharmacy.phone}</div>` : ""}
        <div class="meta">কম স্টক অ্যালার্ট রিপোর্ট</div>
      </div>
      <div class="meta">${formatDateTime(new Date().toISOString())}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th>ঔষধ</th>
          <th style="width:100px">কোম্পানি</th>
          <th style="text-align:right;width:60px">স্টক</th>
          <th style="width:60px">ইউনিট</th>
          <th style="width:180px">রিমার্কস</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      মোট <b>${items.length}</b>টি ঔষধ কম স্টকে আছে — দ্রুত রিফিল করুন
    </div>
    <div class="signature">
      <div class="line">স্টোর ম্যানেজার</div>
      <div class="line">ব্যবস্থাপক</div>
    </div>
    <div class="footer">${pharmacy.name} · কম্পিউটার জেনারেটেড রিপোর্ট</div>
  </body>
  </html>`;

  return generatePDFFile(html, `low_stock`);
}