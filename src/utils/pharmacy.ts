import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUser } from "../db/sync";

export type PharmacyInfo = {
    name: string;
    address: string;
    phone: string;
    email: string;
};

// Default fallback
const DEFAULT_INFO: PharmacyInfo = {
    name: "Pharmacy POS",
    address: "",
    phone: "",
    email: "",
};

// ============================
// ✅ Get Pharmacy Info
// Priority:
//   1. Local save (@pharmacy_info) — Settings → Profile
//   2. Login user (user.shopName / user.name)
//   3. Default fallback
// ============================
export async function getPharmacyInfo(): Promise<PharmacyInfo> {
    try {
        // 1. Login user
        const user = await getUser();

        // 2. Local override
        const localRaw = await AsyncStorage.getItem("@pharmacy_info");
        const local = localRaw ? JSON.parse(localRaw) : {};

        // 3. Profile override (Settings থেকে)
        const profileRaw = await AsyncStorage.getItem("@profile_override");
        const profile = profileRaw ? JSON.parse(profileRaw) : {};

        const info: PharmacyInfo = {
            name:
                local.name ||
                profile.shopName ||
                user?.shopName ||
                profile.name ||
                user?.name ||
                DEFAULT_INFO.name,
            address: local.address || "",
            phone: local.phone || "",
            email: user?.email || "",
        };

        return info;
    } catch (e) {
        console.error("getPharmacyInfo error:", e);
        return DEFAULT_INFO;
    }
}

// ============================
// ✅ Save Pharmacy Info
// ============================
export async function savePharmacyInfo(
    info: Partial<PharmacyInfo>
): Promise<void> {
    try {
        const current = await AsyncStorage.getItem("@pharmacy_info");
        const existing = current ? JSON.parse(current) : {};

        const merged = { ...existing, ...info };
        await AsyncStorage.setItem(
            "@pharmacy_info",
            JSON.stringify(merged)
        );

        console.log("✅ Pharmacy info saved:", merged);
    } catch (e) {
        console.error("savePharmacyInfo error:", e);
    }
}

// ============================
// ✅ Clear Pharmacy Info
// ============================
export async function clearPharmacyInfo(): Promise<void> {
    try {
        await AsyncStorage.removeItem("@pharmacy_info");
    } catch (e) {
        console.error("clearPharmacyInfo error:", e);
    }
}