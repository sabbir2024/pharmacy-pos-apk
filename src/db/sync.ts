import * as FileSystem from "expo-file-system/legacy";
import { db } from "./database";
import { getDeviceId } from "./device";
import {
    getPendingProfiles,
    upsertProfileFromServer,
} from "./profile";

const API_URL = "https://pharmacy-backend-omega.vercel.app/api";
const LAST_SYNC_KEY = "last_sync.json";
const TOKEN_KEY = "auth_token.json";
const USER_KEY = "auth_user.json";

// ============================
// Types
// ============================
export type AuthUser = {
    id: string;
    email: string;
    name: string;
    shopName: string;
    address?: string;
    phone?: string;
    businessType?: string;
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

export type SyncStatus = {
    isLoggedIn: boolean;
    user: AuthUser | null;
    lastSyncAt: string | null;
};

// ============================
// Auth Storage
// ============================
export async function saveAuth(
    token: string,
    user: AuthUser
): Promise<void> {
    try {
        if (!token || !user || !user.email) return;

        await FileSystem.writeAsStringAsync(
            FileSystem.documentDirectory + TOKEN_KEY,
            JSON.stringify({ token })
        );
        await FileSystem.writeAsStringAsync(
            FileSystem.documentDirectory + USER_KEY,
            JSON.stringify({ user })
        );

        console.log("✅ Auth saved:", user.email);
    } catch (e: any) {
        console.error("❌ saveAuth:", e?.message);
    }
}

export async function getToken(): Promise<string | null> {
    try {
        const raw = await FileSystem.readAsStringAsync(
            FileSystem.documentDirectory + TOKEN_KEY
        );
        return JSON.parse(raw)?.token ?? null;
    } catch {
        return null;
    }
}

export async function getUser(): Promise<AuthUser | null> {
    try {
        const raw = await FileSystem.readAsStringAsync(
            FileSystem.documentDirectory + USER_KEY
        );
        const user = JSON.parse(raw)?.user;
        return user?.email ? user : null;
    } catch {
        return null;
    }
}

export async function isLoggedIn(): Promise<boolean> {
    const token = await getToken();
    const user = await getUser();
    return !!token && !!user;
}

export async function getSyncStatus(): Promise<SyncStatus> {
    const token = await getToken();
    const user = await getUser();
    const loggedIn = !!token && !!user;

    let lastSyncAt: string | null = null;
    try {
        const raw = await FileSystem.readAsStringAsync(
            FileSystem.documentDirectory + LAST_SYNC_KEY
        );
        lastSyncAt = JSON.parse(raw)?.serverTime || null;
    } catch {
        lastSyncAt = null;
    }

    return {
        isLoggedIn: loggedIn,
        user: loggedIn ? user : null,
        lastSyncAt,
    };
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

// ============================
// Register / Login
// ============================
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

        const json: AuthResponse = await res.json();

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

        const json: AuthResponse = await res.json();

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
// Last Sync
// ============================
export async function getLastSyncTime(): Promise<string | null> {
    try {
        const raw = await FileSystem.readAsStringAsync(
            FileSystem.documentDirectory + LAST_SYNC_KEY
        );
        return JSON.parse(raw)?.serverTime || null;
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
// ✅ PUSH
// ============================
export async function pushToServer(): Promise<{
    success: boolean;
    synced?: any;
    error?: string;
}> {
    try {
        const token = await getToken();
        if (!token) return { success: false, error: "Login নেই" };

        const deviceId = await getDeviceId();

        // ✅ Profile pending
        const profiles = getPendingProfiles();

        const medicines = db.getAllSync<any>(
            `SELECT * FROM medicines WHERE sync_status IS NULL OR sync_status != 'synced'`
        );
        const sales = db.getAllSync<any>(
            `SELECT * FROM sales WHERE sync_status IS NULL OR sync_status != 'synced'`
        );
        const customers = db.getAllSync<any>(
            `SELECT * FROM due_customers WHERE sync_status IS NULL OR sync_status != 'synced'`
        );

        console.log(
            `📤 Push: profile=${profiles.length}, med=${medicines.length}, sales=${sales.length}, cust=${customers.length}`
        );

        if (
            profiles.length === 0 &&
            medicines.length === 0 &&
            sales.length === 0 &&
            customers.length === 0
        ) {
            return {
                success: true,
                synced: { profile: 0, medicines: 0, sales: 0, customers: 0 },
            };
        }

        const res = await fetch(`${API_URL}/sync/push`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                profiles,
                medicines,
                sales,
                customers,
                deviceId,
            }),
        });

        const json = await res.json();

        if (!json.success) {
            return { success: false, error: json.error || "Push failed" };
        }

        // ✅ Mark synced
        db.withTransactionSync(() => {
            // Profile
            if (profiles.length > 0) {
                for (const p of profiles) {
                    db.runSync(
                        `UPDATE users SET sync_status = 'synced' WHERE user_id = ?`,
                        [p.userId]
                    );
                }
            }

            // Medicines
            if (medicines.length > 0) {
                const ids = medicines.map((m) => m.id);
                const ph = ids.map(() => "?").join(",");
                db.runSync(
                    `UPDATE medicines SET sync_status = 'synced' WHERE id IN (${ph})`,
                    ids
                );
            }

            // Sales
            if (sales.length > 0) {
                const ids = sales.map((s) => s.id);
                const ph = ids.map(() => "?").join(",");
                db.runSync(
                    `UPDATE sales SET sync_status = 'synced' WHERE id IN (${ph})`,
                    ids
                );
            }

            // Customers
            if (customers.length > 0) {
                const ids = customers.map((c) => c.id);
                const ph = ids.map(() => "?").join(",");
                db.runSync(
                    `UPDATE due_customers SET sync_status = 'synced' WHERE id IN (${ph})`,
                    ids
                );
            }
        });

        console.log("✅ Push done");
        return json;
    } catch (e: any) {
        console.error("❌ Push error:", e);
        return { success: false, error: e?.message };
    }
}

// ============================
// ✅ PULL
// ============================
export async function pullFromServer(): Promise<{
    success: boolean;
    error?: string;
    received?: any;
}> {
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

        const { profile, medicines = [], sales = [], customers = [] } = json.data || {};

        console.log(
            `📥 Pull received: profile=${!!profile}, med=${medicines.length}, sales=${sales.length}, cust=${customers.length}`
        );

        db.withTransactionSync(() => {
            // ✅ Profile
            if (profile) {
                upsertProfileFromServer(profile);
            }

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
             (id, name, phone, address, total_due, opening_balance,
              opening_note, opening_date, updated_at, deleted,
              deleted_at, sync_status, device_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
                        [
                            c.localId,
                            c.name,
                            c.phone,
                            c.address,
                            c.totalDue,
                            c.openingBalance || 0,
                            c.openingNote || "",
                            c.openingDate || null,
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

        return { success: true, received: json.counts };
    } catch (e: any) {
        console.error("❌ Pull error:", e);
        return { success: false, error: e?.message };
    }
}

// ============================
// ✅ Full Sync
// ============================
export async function fullSync(): Promise<{
    success: boolean;
    push?: any;
    pull?: any;
    error?: string;
}> {
    try {
        console.log("\n========== SYNC START ==========");

        const pushResult = await pushToServer();
        if (!pushResult.success) {
            console.log("❌ Push failed:", pushResult.error);
            return { success: false, error: pushResult.error };
        }

        const pullResult = await pullFromServer();
        if (!pullResult.success) {
            console.log("❌ Pull failed:", pullResult.error);
            return { success: false, error: pullResult.error };
        }

        console.log("========== SYNC DONE ==========\n");
        return { success: true, push: pushResult, pull: pullResult };
    } catch (e: any) {
        console.error("❌ Sync error:", e);
        return { success: false, error: e?.message };
    }
}