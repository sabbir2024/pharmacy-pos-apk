import { nowISO } from "@/utils/timestamp";
import { db } from "./database";
import { getDeviceId } from "./device";
import { getUser as getAuthUser } from "./sync";

export type Profile = {
    id?: number;
    userId: string;
    email: string;
    name: string;
    shopName: string;
    address: string;
    phone: string;
    businessType: string;
    role: string;
    status: string;
    updatedAt?: string;
    syncStatus?: string;
    deviceId?: string;
};

// ============================
// Get Profile (local)
// ============================
export function getProfile(): Profile | null {
    const rows = db.getAllSync<Profile>(
        `SELECT id,
            user_id as userId,
            email,
            name,
            shop_name as shopName,
            address,
            phone,
            business_type as businessType,
            role,
            status,
            updated_at as updatedAt,
            sync_status as syncStatus,
            device_id as deviceId
     FROM users
     WHERE deleted = 0 OR deleted IS NULL
     ORDER BY id DESC
     LIMIT 1`
    );
    return rows[0] ?? null;
}

// ============================
// ✅ Save Profile → SQLite (pending flag সহ)
// ============================
export async function saveProfile(
    updates: Partial<Profile>
): Promise<void> {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("Login করা নেই");

    const deviceId = await getDeviceId();
    const timestamp = nowISO();

    const existing = db.getAllSync<{ id: number }>(
        `SELECT id FROM users WHERE user_id = ?`,
        [authUser.id]
    )[0];

    if (existing) {
        db.runSync(
            `UPDATE users
       SET name = COALESCE(?, name),
           shop_name = COALESCE(?, shop_name),
           address = COALESCE(?, address),
           phone = COALESCE(?, phone),
           business_type = COALESCE(?, business_type),
           updated_at = ?,
           sync_status = 'pending',
           device_id = ?
       WHERE user_id = ?`,
            [
                updates.name ?? null,
                updates.shopName ?? null,
                updates.address ?? null,
                updates.phone ?? null,
                updates.businessType ?? null,
                timestamp,
                deviceId,
                authUser.id,
            ]
        );
    } else {
        db.runSync(
            `INSERT INTO users
       (user_id, email, name, shop_name, address, phone,
        business_type, role, status, updated_at, sync_status, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [
                authUser.id,
                authUser.email || "",
                updates.name || authUser.name || "",
                updates.shopName || authUser.shopName || "",
                updates.address || "",
                updates.phone || "",
                updates.businessType || "pharmacy",
                authUser.role || "user",
                authUser.status || "active",
                timestamp,
                deviceId,
            ]
        );
    }

    console.log("✅ Profile saved to SQLite (pending)");
}

// ============================
// Sync from server → local
// ============================
export function upsertProfileFromServer(data: {
    userId: string;
    email: string;
    name: string;
    shopName: string;
    address: string;
    phone: string;
    businessType: string;
    role: string;
    status: string;
    updatedAt: string;
}): void {
    const existing = db.getAllSync<{ id: number; updated_at: string }>(
        `SELECT id, updated_at FROM users WHERE user_id = ?`,
        [data.userId]
    )[0];

    const serverTime = new Date(data.updatedAt).getTime();
    const localTime = existing?.updated_at
        ? new Date(existing.updated_at).getTime()
        : 0;

    // Server newer হলে apply
    if (serverTime > localTime || !existing) {
        if (existing) {
            db.runSync(
                `UPDATE users
         SET email = ?, name = ?, shop_name = ?, address = ?,
             phone = ?, business_type = ?, role = ?, status = ?,
             updated_at = ?, sync_status = 'synced'
         WHERE user_id = ?`,
                [
                    data.email,
                    data.name,
                    data.shopName,
                    data.address,
                    data.phone,
                    data.businessType,
                    data.role,
                    data.status,
                    data.updatedAt,
                    data.userId,
                ]
            );
        } else {
            db.runSync(
                `INSERT INTO users
         (user_id, email, name, shop_name, address, phone,
          business_type, role, status, updated_at, sync_status, device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', NULL)`,
                [
                    data.userId,
                    data.email,
                    data.name,
                    data.shopName,
                    data.address,
                    data.phone,
                    data.businessType,
                    data.role,
                    data.status,
                    data.updatedAt,
                ]
            );
        }
    }
}

// ============================
// Get Pending (for sync push)
// ============================
export function getPendingProfiles(): Profile[] {
    return db.getAllSync<Profile>(
        `SELECT * FROM users WHERE sync_status IS NULL OR sync_status != 'synced'`
    );
}

// ============================
// Mark as synced
// ============================
export function markProfileSynced(userId: string): void {
    db.runSync(
        `UPDATE users SET sync_status = 'synced' WHERE user_id = ?`,
        [userId]
    );
}