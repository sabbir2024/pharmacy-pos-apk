import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("pharmacy.db");

export function initDatabase() {
  // ============================
  // সব টেবিল তৈরি
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
      updated_at TEXT,
      deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      device_id TEXT,
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
      updated_at TEXT,
      deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      device_id TEXT,
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
      opening_balance REAL DEFAULT 0,
      opening_note TEXT DEFAULT '',
      opening_date TEXT,
      updated_at TEXT,
      deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      device_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS due_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      updated_at TEXT,
      deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      device_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE,
      email TEXT,
      name TEXT,
      shop_name TEXT,
      address TEXT,
      phone TEXT,
      business_type TEXT DEFAULT 'pharmacy',
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      updated_at TEXT,
      deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      device_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // Migration: medicines
  // ============================
  const medCols = db.getAllSync<{ name: string }>(
    "PRAGMA table_info(medicines)"
  );
  const medNames = medCols.map((c) => c.name);

  if (!medNames.includes("unit"))
    db.execSync("ALTER TABLE medicines ADD COLUMN unit TEXT DEFAULT 'pcs'");
  if (!medNames.includes("cost_price"))
    db.execSync("ALTER TABLE medicines ADD COLUMN cost_price REAL DEFAULT 0");
  if (!medNames.includes("pcs_per_unit"))
    db.execSync(
      "ALTER TABLE medicines ADD COLUMN pcs_per_unit INTEGER DEFAULT 1"
    );
  if (!medNames.includes("updated_at")) {
    db.execSync("ALTER TABLE medicines ADD COLUMN updated_at TEXT");
    db.execSync(
      "UPDATE medicines SET updated_at = datetime('now') WHERE updated_at IS NULL"
    );
  }
  if (!medNames.includes("deleted"))
    db.execSync("ALTER TABLE medicines ADD COLUMN deleted INTEGER DEFAULT 0");
  if (!medNames.includes("deleted_at"))
    db.execSync("ALTER TABLE medicines ADD COLUMN deleted_at TEXT");
  if (!medNames.includes("sync_status")) {
    db.execSync(
      "ALTER TABLE medicines ADD COLUMN sync_status TEXT DEFAULT 'pending'"
    );
    db.execSync(
      "UPDATE medicines SET sync_status = 'pending' WHERE sync_status IS NULL"
    );
  }
  if (!medNames.includes("device_id"))
    db.execSync("ALTER TABLE medicines ADD COLUMN device_id TEXT");

  // ============================
  // Migration: sales
  // ============================
  const salesCols = db.getAllSync<{ name: string }>(
    "PRAGMA table_info(sales)"
  );
  const salesNames = salesCols.map((c) => c.name);

  if (!salesNames.includes("customer_id"))
    db.execSync("ALTER TABLE sales ADD COLUMN customer_id INTEGER");
  if (!salesNames.includes("due_amount"))
    db.execSync("ALTER TABLE sales ADD COLUMN due_amount REAL DEFAULT 0");
  if (!salesNames.includes("is_due"))
    db.execSync("ALTER TABLE sales ADD COLUMN is_due INTEGER DEFAULT 0");
  if (!salesNames.includes("discount"))
    db.execSync("ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0");
  if (!salesNames.includes("vat"))
    db.execSync("ALTER TABLE sales ADD COLUMN vat REAL DEFAULT 0");
  if (!salesNames.includes("change"))
    db.execSync("ALTER TABLE sales ADD COLUMN change REAL DEFAULT 0");
  if (!salesNames.includes("payment_method"))
    db.execSync(
      "ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'cash'"
    );
  if (!salesNames.includes("updated_at")) {
    db.execSync("ALTER TABLE sales ADD COLUMN updated_at TEXT");
    db.execSync(
      "UPDATE sales SET updated_at = datetime('now') WHERE updated_at IS NULL"
    );
  }
  if (!salesNames.includes("deleted"))
    db.execSync("ALTER TABLE sales ADD COLUMN deleted INTEGER DEFAULT 0");
  if (!salesNames.includes("deleted_at"))
    db.execSync("ALTER TABLE sales ADD COLUMN deleted_at TEXT");
  if (!salesNames.includes("sync_status")) {
    db.execSync(
      "ALTER TABLE sales ADD COLUMN sync_status TEXT DEFAULT 'pending'"
    );
    db.execSync(
      "UPDATE sales SET sync_status = 'pending' WHERE sync_status IS NULL"
    );
  }
  if (!salesNames.includes("device_id"))
    db.execSync("ALTER TABLE sales ADD COLUMN device_id TEXT");

  // ============================
  // Migration: due_customers
  // ============================
  const custCols = db.getAllSync<{ name: string }>(
    "PRAGMA table_info(due_customers)"
  );
  const custNames = custCols.map((c) => c.name);

  if (!custNames.includes("phone"))
    db.execSync("ALTER TABLE due_customers ADD COLUMN phone TEXT");
  if (!custNames.includes("address"))
    db.execSync("ALTER TABLE due_customers ADD COLUMN address TEXT");
  if (!custNames.includes("total_due"))
    db.execSync(
      "ALTER TABLE due_customers ADD COLUMN total_due REAL DEFAULT 0"
    );
  if (!custNames.includes("opening_balance"))
    db.execSync(
      "ALTER TABLE due_customers ADD COLUMN opening_balance REAL DEFAULT 0"
    );
  if (!custNames.includes("opening_note"))
    db.execSync(
      "ALTER TABLE due_customers ADD COLUMN opening_note TEXT DEFAULT ''"
    );
  if (!custNames.includes("opening_date"))
    db.execSync("ALTER TABLE due_customers ADD COLUMN opening_date TEXT");
  if (!custNames.includes("updated_at")) {
    db.execSync("ALTER TABLE due_customers ADD COLUMN updated_at TEXT");
    db.execSync(
      "UPDATE due_customers SET updated_at = datetime('now') WHERE updated_at IS NULL"
    );
  }
  if (!custNames.includes("deleted"))
    db.execSync(
      "ALTER TABLE due_customers ADD COLUMN deleted INTEGER DEFAULT 0"
    );
  if (!custNames.includes("deleted_at"))
    db.execSync("ALTER TABLE due_customers ADD COLUMN deleted_at TEXT");
  if (!custNames.includes("sync_status")) {
    db.execSync(
      "ALTER TABLE due_customers ADD COLUMN sync_status TEXT DEFAULT 'pending'"
    );
    db.execSync(
      "UPDATE due_customers SET sync_status = 'pending' WHERE sync_status IS NULL"
    );
  }
  if (!custNames.includes("device_id"))
    db.execSync("ALTER TABLE due_customers ADD COLUMN device_id TEXT");

  // ============================
  // Migration: due_payments
  // ============================
  const payCols = db.getAllSync<{ name: string }>(
    "PRAGMA table_info(due_payments)"
  );
  const payNames = payCols.map((c) => c.name);

  if (!payNames.includes("created_at"))
    db.execSync(
      "ALTER TABLE due_payments ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP"
    );
  if (!payNames.includes("note"))
    db.execSync("ALTER TABLE due_payments ADD COLUMN note TEXT");
  if (!payNames.includes("updated_at")) {
    db.execSync("ALTER TABLE due_payments ADD COLUMN updated_at TEXT");
    db.execSync(
      "UPDATE due_payments SET updated_at = datetime('now') WHERE updated_at IS NULL"
    );
  }
  if (!payNames.includes("deleted"))
    db.execSync(
      "ALTER TABLE due_payments ADD COLUMN deleted INTEGER DEFAULT 0"
    );
  if (!payNames.includes("deleted_at"))
    db.execSync("ALTER TABLE due_payments ADD COLUMN deleted_at TEXT");
  if (!payNames.includes("sync_status")) {
    db.execSync(
      "ALTER TABLE due_payments ADD COLUMN sync_status TEXT DEFAULT 'pending'"
    );
    db.execSync(
      "UPDATE due_payments SET sync_status = 'pending' WHERE sync_status IS NULL"
    );
  }
  if (!payNames.includes("device_id"))
    db.execSync("ALTER TABLE due_payments ADD COLUMN device_id TEXT");

  // ============================
  // Migration: users
  // ============================
  const userCols = db.getAllSync<{ name: string }>(
    "PRAGMA table_info(users)"
  );
  const userNames = userCols.map((c) => c.name);

  if (!userNames.includes("user_id"))
    db.execSync("ALTER TABLE users ADD COLUMN user_id TEXT");
  if (!userNames.includes("email"))
    db.execSync("ALTER TABLE users ADD COLUMN email TEXT");
  if (!userNames.includes("shop_name"))
    db.execSync("ALTER TABLE users ADD COLUMN shop_name TEXT");
  if (!userNames.includes("address"))
    db.execSync("ALTER TABLE users ADD COLUMN address TEXT");
  if (!userNames.includes("phone"))
    db.execSync("ALTER TABLE users ADD COLUMN phone TEXT");
  if (!userNames.includes("business_type"))
    db.execSync(
      "ALTER TABLE users ADD COLUMN business_type TEXT DEFAULT 'pharmacy'"
    );
  if (!userNames.includes("updated_at")) {
    db.execSync("ALTER TABLE users ADD COLUMN updated_at TEXT");
    db.execSync(
      "UPDATE users SET updated_at = datetime('now') WHERE updated_at IS NULL"
    );
  }
  if (!userNames.includes("sync_status")) {
    db.execSync(
      "ALTER TABLE users ADD COLUMN sync_status TEXT DEFAULT 'pending'"
    );
    db.execSync(
      "UPDATE users SET sync_status = 'pending' WHERE sync_status IS NULL"
    );
  }
  if (!userNames.includes("device_id"))
    db.execSync("ALTER TABLE users ADD COLUMN device_id TEXT");

  console.log("✅ Database initialized with all tables");
}