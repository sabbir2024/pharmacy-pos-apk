import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("pharmacy.db");

export function initDatabase() {
  // ============================
  // ১. সব টেবিল তৈরি (প্রথমবার)
  // ============================
  db.execSync(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      unit TEXT DEFAULT 'pcs',
      cost_price REAL DEFAULT 0,
      expiry TEXT,
      barcode TEXT,
      pcs_per_unit INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      discount REAL DEFAULT 0,
      vat REAL DEFAULT 0,
      paid REAL NOT NULL,
      change REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      customer_id INTEGER,
      due_amount REAL DEFAULT 0,
      is_due INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      qty INTEGER NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS due_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      total_due REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS due_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // ২. medicines টেবিলের মাইগ্রেশন
  // ============================
  const medCols = db.getAllSync<{ name: string }>(
    "PRAGMA table_info(medicines)"
  );
  const medNames = medCols.map((c) => c.name);

  if (!medNames.includes("unit")) {
    db.execSync("ALTER TABLE medicines ADD COLUMN unit TEXT DEFAULT 'pcs'");
  }
  if (!medNames.includes("cost_price")) {
    db.execSync("ALTER TABLE medicines ADD COLUMN cost_price REAL DEFAULT 0");
  }
  if (!medNames.includes("pcs_per_unit")) {
    db.execSync(
      "ALTER TABLE medicines ADD COLUMN pcs_per_unit INTEGER DEFAULT 1"
    );
  }

  // ============================
  // ৩. sales টেবিলের মাইগ্রেশন (due সাপোর্ট)
  // ============================
  const salesCols = db.getAllSync<{ name: string }>(
    "PRAGMA table_info(sales)"
  );
  const salesNames = salesCols.map((c) => c.name);

  if (!salesNames.includes("customer_id")) {
    db.execSync("ALTER TABLE sales ADD COLUMN customer_id INTEGER");
  }
  if (!salesNames.includes("due_amount")) {
    db.execSync("ALTER TABLE sales ADD COLUMN due_amount REAL DEFAULT 0");
  }
  if (!salesNames.includes("is_due")) {
    db.execSync("ALTER TABLE sales ADD COLUMN is_due INTEGER DEFAULT 0");
  }
  if (!salesNames.includes("discount")) {
    db.execSync("ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0");
  }
  if (!salesNames.includes("vat")) {
    db.execSync("ALTER TABLE sales ADD COLUMN vat REAL DEFAULT 0");
  }
  if (!salesNames.includes("change")) {
    db.execSync("ALTER TABLE sales ADD COLUMN change REAL DEFAULT 0");
  }
  if (!salesNames.includes("payment_method")) {
    db.execSync(
      "ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'cash'"
    );
  }

  // ============================
  // ৪. due_customers টেবিলের মাইগ্রেশন
  // ============================
  const custCols = db.getAllSync<{ name: string }>(
    "PRAGMA table_info(due_customers)"
  );
  const custNames = custCols.map((c) => c.name);

  if (!custNames.includes("phone")) {
    db.execSync("ALTER TABLE due_customers ADD COLUMN phone TEXT");
  }
  if (!custNames.includes("address")) {
    db.execSync("ALTER TABLE due_customers ADD COLUMN address TEXT");
  }
  if (!custNames.includes("total_due")) {
    db.execSync("ALTER TABLE due_customers ADD COLUMN total_due REAL DEFAULT 0");
  }
}