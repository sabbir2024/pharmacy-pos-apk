import * as FileSystem from "expo-file-system/legacy";
import { db } from "./database";
import { getDeviceId } from "./device";

const API_URL = "https://pharmacy-backend-omega.vercel.app/api";
const LAST_SYNC_KEY = "last_sync.json";
const TOKEN_KEY = "auth_token.json";
const USER_KEY = "auth_user.json";

export type AuthUser = {
    id: string;
    email: string;
    name: string;
    shopName: string;
    role?: string;
    status?: string;
};

export type AuthResponse = {
    success: boolean;
    token?: string;
    user?: AuthUser;
    error?: string;
    pending?: boolean;
    message?: string;
    userStatus?: string;
};

// ============================
// Auth
// ============================
export async function saveAuth(token: string, user: AuthUser) {
    await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + TOKEN_KEY,
        JSON.stringify({ token })
    );
    await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + USER_KEY,
        JSON.stringify({ user })
    );
}

export async function getToken(): Promise<string | null> {
    try {
        const raw = await FileSystem.readAsStringAsync(
            FileSystem.documentDirectory + TOKEN_KEY
        );
        return JSON.parse(raw).token ?? null;
    } catch {
        return null;
    }
}

export async function getUser(): Promise<AuthUser | null> {
    try {
        const raw = await FileSystem.readAsStringAsync(
            FileSystem.documentDirectory + USER_KEY
        );
        return JSON.parse(raw).user ?? null;
    } catch {
        return null;
    }
}

export async function isLoggedIn(): Promise<boolean> {
    return !!(await getToken());
}

export async function clearAuth(): Promise<void> {
    try {
        await FileSystem.deleteAsync(
            FileSystem.documentDirectory + TOKEN_KEY,
            { idempotent: true }
        );
        await FileSystem.deleteAsync(
            FileSystem.documentDirectory + USER_KEY,
            { idempotent: true }
        );
    } catch { }
}

export async function register(
    email: string,
    password: string,
    name: string,
    shopName: string
): Promise<AuthResponse> {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name, shopName }),
        });
        const json = await res.json();
        if (json.success && json.token && json.user) {
            await saveAuth(json.token, json.user);
        }
        return json;
    } catch (e: any) {
        return { success: false, error: e?.message };
    }
}

export async function login(
    email: string,
    password: string
): Promise<AuthResponse> {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (json.success && json.token && json.user) {
            await saveAuth(json.token, json.user);
        }
        return json;
    } catch (e: any) {
        return { success: false, error: e?.message };
    }
}

export async function logout() {
    await clearAuth();
}

export async function checkStatus(email: string) {
    try {
        const res = await fetch(
            `${API_URL}/auth/status?email=${encodeURIComponent(email)}`
        );
        return await res.json();
    } catch (e: any) {
        return { success: false, error: e?.message };
    }
}

// ============================
// Last Sync Time
// ============================
export async function getLastSyncTime(): Promise<string | null> {
    try {
        const raw = await FileSystem.readAsStringAsync(
            FileSystem.documentDirectory + LAST_SYNC_KEY
        );
        return JSON.parse(raw).serverTime || null;
    } catch {
        return null;
    }
}

export async function setLastSyncTime(serverTime: string) {
    await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + LAST_SYNC_KEY,
        JSON.stringify({ serverTime })
    );
}

// ============================
// Push
// ============================
export async function pushToServer() {
    try {
        const token = await getToken();
        if (!token) return { success: false, error: "Login নেই" };

        const deviceId = await getDeviceId();

        // Pending items only
        const medicines = db.getAllSync<any>(
            "SELECT * FROM medicines WHERE sync_status = 'pending' OR sync_status IS NULL"
        );
        const sales = db.getAllSync<any>(
            "SELECT * FROM sales WHERE sync_status = 'pending' OR sync_status IS NULL"
        );
        const customers = db.getAllSync<any>(
            "SELECT * FROM due_customers WHERE sync_status = 'pending' OR sync_status IS NULL"
        );

        console.log(
            `📤 Push: med=${medicines.length}, sales=${sales.length}, cust=${customers.length}`
        );

        if (
            medicines.length === 0 &&
            sales.length === 0 &&
            customers.length === 0
        ) {
            return { success: true, synced: { medicines: 0, sales: 0, customers: 0 } };
        }

        const res = await fetch(`${API_URL}/sync/push`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ medicines, sales, customers, deviceId }),
        });

        const json = await res.json();

        if (json.success) {
            db.withTransactionSync(() => {
                if (medicines.length > 0) {
                    const ids = medicines.map((m) => m.id);
                    const ph = ids.map(() => "?").join(",");
                    db.runSync(
                        `UPDATE medicines SET sync_status = 'synced' WHERE id IN (${ph})`,
                        ids
                    );
                }
                if (sales.length > 0) {
                    const ids = sales.map((s) => s.id);
                    const ph = ids.map(() => "?").join(",");
                    db.runSync(
                        `UPDATE sales SET sync_status = 'synced' WHERE id IN (${ph})`,
                        ids
                    );
                }
                if (customers.length > 0) {
                    const ids = customers.map((c) => c.id);
                    const ph = ids.map(() => "?").join(",");
                    db.runSync(
                        `UPDATE due_customers SET sync_status = 'synced' WHERE id IN (${ph})`,
                        ids
                    );
                }
            });

            console.log("✅ Push done:", json.results);
        }

        return json;
    } catch (e: any) {
        return { success: false, error: e?.message };
    }
}

// ============================
// Pull
// ============================
export async function pullFromServer() {
    try {
        const token = await getToken();
        if (!token) return { success: false, error: "Login নেই" };

        const deviceId = await getDeviceId();
        const since = await getLastSyncTime();

        const url = since
            ? `${API_URL}/sync/pull?since=${since}&deviceId=${deviceId}`
            : `${API_URL}/sync/pull?deviceId=${deviceId}`;

        console.log(`📥 Pull: since=${since || "beginning"}`);

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();
        if (!json.success) return json;

        const { medicines, sales, customers } = json.data;
        console.log(
            `📥 Received: med=${medicines.length}, sales=${sales.length}, cust=${customers.length}`
        );

        db.withTransactionSync(() => {
            // Medicines
            for (const m of medicines) {
                const existing = db.getAllSync<{ updated_at: string }>(
                    "SELECT updated_at FROM medicines WHERE id = ?",
                    [m.localId]
                )[0];

                const serverTime = new Date(m.updatedAt).getTime();
                const localTime = existing?.updated_at
                    ? new Date(existing.updated_at).getTime()
                    : 0;

                if (serverTime > localTime) {
                    db.runSync(
                        `INSERT OR REPLACE INTO medicines
             (id, name, company, price, stock, unit, cost_price, expiry,
              barcode, pcs_per_unit, updated_at, deleted, deleted_at,
              sync_status, device_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
                        [
                            m.localId,
                            m.name,
                            m.company,
                            m.price,
                            m.stock,
                            m.unit,
                            m.costPrice,
                            m.expiry,
                            m.barcode,
                            m.pcsPerUnit,
                            m.updatedAt,
                            m.deleted ? 1 : 0,
                            m.deletedAt,
                            m.deviceId,
                        ]
                    );
                }
            }

            // Sales
            for (const s of sales) {
                const existing = db.getAllSync<{ updated_at: string }>(
                    "SELECT updated_at FROM sales WHERE id = ?",
                    [s.localId]
                )[0];

                const serverTime = new Date(s.updatedAt).getTime();
                const localTime = existing?.updated_at
                    ? new Date(existing.updated_at).getTime()
                    : 0;

                if (serverTime > localTime) {
                    db.runSync(
                        `INSERT OR REPLACE INTO sales
             (id, total, discount, vat, paid, change, payment_method,
              customer_id, due_amount, is_due, updated_at, deleted,
              deleted_at, sync_status, device_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
                        [
                            s.localId,
                            s.total,
                            s.discount,
                            s.vat,
                            s.paid,
                            s.change,
                            s.paymentMethod,
                            s.customerId,
                            s.dueAmount,
                            s.isDue,
                            s.updatedAt,
                            s.deleted ? 1 : 0,
                            s.deletedAt,
                            s.deviceId,
                        ]
                    );
                }
            }

            // Customers
            for (const c of customers) {
                const existing = db.getAllSync<{ updated_at: string }>(
                    "SELECT updated_at FROM due_customers WHERE id = ?",
                    [c.localId]
                )[0];

                const serverTime = new Date(c.updatedAt).getTime();
                const localTime = existing?.updated_at
                    ? new Date(existing.updated_at).getTime()
                    : 0;

                if (serverTime > localTime) {
                    db.runSync(
                        `INSERT OR REPLACE INTO due_customers
             (id, name, phone, address, total_due, updated_at, deleted,
              deleted_at, sync_status, device_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
                        [
                            c.localId,
                            c.name,
                            c.phone,
                            c.address,
                            c.totalDue,
                            c.updatedAt,
                            c.deleted ? 1 : 0,
                            c.deletedAt,
                            c.deviceId,
                        ]
                    );
                }
            }
        });

        if (json.serverTime) {
            await setLastSyncTime(json.serverTime);
        }

        return json;
    } catch (e: any) {
        return { success: false, error: e?.message };
    }
}

// ============================
// Full Sync
// ============================
export async function fullSync() {
    try {
        const push = await pushToServer();
        if (!push.success) return { success: false, error: push.error };

        const pull = await pullFromServer();
        if (!pull.success) return { success: false, error: pull.error };

        return { success: true, push, pull };
    } catch (e: any) {
        return { success: false, error: e?.message };
    }
}