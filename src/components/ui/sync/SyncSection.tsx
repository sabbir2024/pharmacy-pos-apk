import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    fullSync,
    getPendingCount,
    logout,
} from "@/db/sync";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { formatDateTime } from "@/utils/format";

const AUTO_SYNC_KEY = "@pharmacy_auto_sync";

export default function SyncSection() {
    const router = useRouter();
    const { isLoggedIn, user, lastSyncAt, refresh, loading } =
        useSyncStatus();

    const [syncing, setSyncing] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [pending, setPending] = useState({
        medicines: 0,
        sales: 0,
        customers: 0,
    });

    // Auto sync preference
    React.useEffect(() => {
        AsyncStorage.getItem(AUTO_SYNC_KEY).then((val) => {
            if (val !== null) setAutoSync(val === "true");
        });
    }, []);

    // Pending count refresh
    React.useEffect(() => {
        if (isLoggedIn) {
            setPending(getPendingCount());
        }
    }, [isLoggedIn, syncing]);

    const toggleAutoSync = async (value: boolean) => {
        setAutoSync(value);
        await AsyncStorage.setItem(AUTO_SYNC_KEY, value ? "true" : "false");
    };

    // ============================
    // ✅ Sync Now
    // ============================
    const handleSync = async () => {
        if (!isLoggedIn) {
            Alert.alert(
                "লগইন প্রয়োজন",
                "ক্লাউড সিঙ্ক করতে আগে লগইন করুন।",
                [
                    { text: "বাতিল", style: "cancel" },
                    { text: "লগইন", onPress: () => router.push("/login") },
                ]
            );
            return;
        }

        try {
            setSyncing(true);

            // ✅ Pending count দেখাও
            const before = getPendingCount();
            console.log("📊 Pending before sync:", before);

            const result = await fullSync();

            console.log("📊 Sync result:", result);

            if (result.success) {
                await refresh();
                setPending(getPendingCount());

                const pushSynced = result.push?.synced;

                Alert.alert(
                    "✅ সিঙ্ক সফল",
                    pushSynced
                        ? `পাঠানো:\n` +
                        `  ঔষধ: ${pushSynced.medicines || 0}\n` +
                        `  বিক্রয়: ${pushSynced.sales || 0}\n` +
                        `  কাস্টমার: ${pushSynced.customers || 0}\n\n` +
                        `আনা:\n` +
                        `  ঔষধ: ${result.pull?.received?.medicines || 0}\n` +
                        `  বিক্রয়: ${result.pull?.received?.sales || 0}\n` +
                        `  কাস্টমার: ${result.pull?.received?.customers || 0}`
                        : "সব ডেটা সিঙ্ক হয়েছে"
                );
            } else {
                Alert.alert(
                    "❌ সিঙ্ক ব্যর্থ",
                    result.error || "ইন্টারনেট সংযোগ চেক করুন"
                );
            }
        } catch (e: any) {
            console.error("❌ handleSync error:", e);
            Alert.alert("ত্রুটি", e?.message || "সিঙ্ক করা যায়নি");
        } finally {
            setSyncing(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "লগআউট",
            "লগআউট করলে ক্লাউড সিঙ্ক বন্ধ হবে। ডেটা লোকালি থাকবে।",
            [
                { text: "বাতিল", style: "cancel" },
                {
                    text: "লগআউট",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        await refresh();
                    },
                },
            ]
        );
    };

    const formatLastSync = (iso: string | null): string => {
        if (!iso) return "কখনো সিঙ্ক হয়নি";
        try {
            return formatDateTime(iso);
        } catch {
            return iso;
        }
    };

    const totalPending =
        pending.medicines + pending.sales + pending.customers;

    if (loading) {
        return (
            <View style={styles.loadingBox}>
                <ActivityIndicator color="#0d9488" />
            </View>
        );
    }

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>☁️ ক্লাউড সিঙ্ক</Text>

            {/* Status */}
            <View
                style={[
                    styles.statusCard,
                    {
                        backgroundColor: isLoggedIn ? "#f0fdf4" : "#fef3c7",
                        borderColor: isLoggedIn ? "#bbf7d0" : "#fde68a",
                    },
                ]}
            >
                <View
                    style={[
                        styles.statusIcon,
                        {
                            backgroundColor: isLoggedIn ? "#dcfce7" : "#fef3c7",
                        },
                    ]}
                >
                    <Ionicons
                        name={isLoggedIn ? "cloud-done" : "cloud-offline"}
                        size={22}
                        color={isLoggedIn ? "#16a34a" : "#d97706"}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text
                        style={[
                            styles.statusTitle,
                            { color: isLoggedIn ? "#166534" : "#92400e" },
                        ]}
                    >
                        {isLoggedIn ? "সংযুক্ত" : "লগইন করা নেই"}
                    </Text>
                    <Text style={styles.statusSub}>
                        {isLoggedIn && user ? user.email : "সিঙ্ক করতে লগইন করুন"}
                    </Text>
                    {isLoggedIn && (
                        <Text style={styles.lastSync}>
                            শেষ সিঙ্ক: {formatLastSync(lastSyncAt)}
                        </Text>
                    )}
                </View>
            </View>

            {/* Pending indicator */}
            {isLoggedIn && totalPending > 0 && (
                <View style={styles.pendingBox}>
                    <Ionicons name="time-outline" size={16} color="#d97706" />
                    <Text style={styles.pendingText}>
                        {totalPending}টি আইটেম সিঙ্ক হয়নি
                    </Text>
                    <View style={styles.pendingChips}>
                        {pending.medicines > 0 && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>
                                    ঔষধ {pending.medicines}
                                </Text>
                            </View>
                        )}
                        {pending.sales > 0 && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>
                                    বিক্রয় {pending.sales}
                                </Text>
                            </View>
                        )}
                        {pending.customers > 0 && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>
                                    কাস্টমার {pending.customers}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Login */}
            {!isLoggedIn && (
                <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={() => router.push("/login")}
                >
                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                    <Text style={styles.loginBtnText}>লগইন / রেজিস্টার</Text>
                </TouchableOpacity>
            )}

            {/* Sync Now */}
            {isLoggedIn && (
                <>
                    <TouchableOpacity
                        style={[
                            styles.syncBtn,
                            syncing && { opacity: 0.6 },
                            totalPending === 0 && { backgroundColor: "#6b7280" },
                        ]}
                        onPress={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? (
                            <>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.syncBtnText}>সিঙ্ক হচ্ছে...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="sync-outline" size={20} color="#fff" />
                                <Text style={styles.syncBtnText}>
                                    {totalPending > 0
                                        ? `এখনই সিঙ্ক করুন (${totalPending})`
                                        : "এখনই সিঙ্ক করুন"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Auto Sync Toggle */}
                    <View style={styles.autoRow}>
                        <View style={styles.autoIcon}>
                            <Ionicons name="time-outline" size={18} color="#0d9488" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.autoTitle}>অটো সিঙ্ক</Text>
                            <Text style={styles.autoSub}>
                                প্রতি ৫ মিনিটে স্বয়ংক্রিয়
                            </Text>
                        </View>
                        <Switch
                            value={autoSync}
                            onValueChange={toggleAutoSync}
                            trackColor={{ false: "#e5e7eb", true: "#0d9488" }}
                            thumbColor="#fff"
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
                        <Text style={styles.logoutText}>লগআউট</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 18 },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: "#374151",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    loadingBox: { padding: 30, alignItems: "center" },

    statusCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    statusIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    statusTitle: { fontSize: 14, fontWeight: "800" },
    statusSub: { fontSize: 11, color: "#6b7280", marginTop: 2 },
    lastSync: { fontSize: 10, color: "#9ca3af", marginTop: 2 },

    pendingBox: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fef3c7",
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#fde68a",
    },
    pendingText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#92400e",
        flex: 1,
    },
    pendingChips: { flexDirection: "row", gap: 4 },
    chip: {
        backgroundColor: "#fff",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    chipText: { fontSize: 10, color: "#92400e", fontWeight: "700" },

    loginBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#0d9488",
        paddingVertical: 14,
        borderRadius: 12,
    },
    loginBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

    syncBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#3b82f6",
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    syncBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

    autoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        marginBottom: 8,
    },
    autoIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#f0fdfa",
        alignItems: "center",
        justifyContent: "center",
    },
    autoTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
    autoSub: { fontSize: 11, color: "#6b7280", marginTop: 2 },

    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#fecaca",
        backgroundColor: "#fff",
    },
    logoutText: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
});