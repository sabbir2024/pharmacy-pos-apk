import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Biometric
import {
    getBiometricIcon,
    getBiometricLabel,
    isBiometricAvailable,
    requireBiometric,
} from "@/utils/biometric";

// Sync
import { SyncSection } from "@/components/ui/sync";
import { getToken, isLoggedIn } from "@/db/sync";

// 🆕 Network ও Role hooks
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useUserRole } from "@/hooks/useUserRole";

// Backup
import {
    clearAllData,
    createBackup,
    formatBytes,
    getBackupStats,
    parseBackupFile,
    restoreBackup,
    shareBackup,
    type BackupStats,
} from "@/db/backup";

// Data helpers
import { getAllCustomers } from "@/db/customers";
import { getAllProducts } from "@/db/products";
import { exportCustomersToExcel, exportProductsToExcel } from "@/utils/excel";

const BIOMETRIC_KEY = "@pharmacy_biometric_enabled";

// ⚠️ আপনার PC-র IP
const API_URL = "https://pharmacy-backend-omega.vercel.app/api";

export default function Settings() {
    const [stats, setStats] = useState<BackupStats>({
        medicines: 0,
        sales: 0,
        saleItems: 0,
        dueCustomers: 0,
        duePayments: 0,
    });

    const [loading, setLoading] = useState<
        "backup" | "restore" | "clear" | "excel" | null
    >(null);

    // Biometric
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricType, setBiometricType] = useState<
        "fingerprint" | "face" | "iris" | "none"
    >("none");
    const [biometricReason, setBiometricReason] = useState<string>("");
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    // 🆕 Network ও Role
    const { isOnline } = useNetworkStatus();
    const { isAdmin, loading: roleLoading } = useUserRole();

    // Clear button দেখাবে কি?
    const canClearData = isOnline && isAdmin && !roleLoading;

    // ============================
    // Load
    // ============================
    const loadStats = () => {
        try {
            setStats(getBackupStats());
        } catch (e) {
            console.error(e);
        }
    };

    const checkBiometric = async () => {
        const result = await isBiometricAvailable();
        setBiometricSupported(result.available);
        setBiometricType(result.type);
        setBiometricReason(result.reason || "");

        const saved = await AsyncStorage.getItem(BIOMETRIC_KEY);
        setBiometricEnabled(saved === "true");
    };

    useFocusEffect(
        React.useCallback(() => {
            loadStats();
            checkBiometric();
        }, [])
    );

    // ============================
    // Biometric Toggle
    // ============================
    const toggleBiometric = async (value: boolean) => {
        if (value && !biometricSupported) {
            Alert.alert(
                "সাপোর্টেড নয়",
                biometricReason || "ডিভাইসে বায়োমেট্রিক সেটআপ নেই"
            );
            return;
        }

        if (value) {
            const { authenticateWithBiometric } = await import(
                "@/utils/biometric"
            );
            const { success, error } = await authenticateWithBiometric(
                "বায়োমেট্রিক লক চালু করুন"
            );
            if (!success) {
                Alert.alert("যাচাই ব্যর্থ", error || "সেট করা যায়নি");
                return;
            }
        }

        setBiometricEnabled(value);
        await AsyncStorage.setItem(BIOMETRIC_KEY, value ? "true" : "false");
    };

    // ============================
    // Backup
    // ============================
    const handleBackup = async () => {
        try {
            setLoading("backup");
            const { uri, size } = await createBackup();
            await shareBackup(uri);
            Alert.alert(
                "✅ ব্যাকআপ সফল",
                `সাইজ: ${formatBytes(size)}\nফাইল: ${uri.split("/").pop()}`
            );
        } catch (e: any) {
            console.error(e);
            Alert.alert("ত্রুটি", e?.message || "ব্যাকআপ তৈরি করা যায়নি");
        } finally {
            setLoading(null);
        }
    };

    // ============================
    // Restore (Biometric Protected)
    // ============================
    const handleRestore = () => {
        Alert.alert(
            "⚠️ সতর্কতা",
            "বর্তমান সব ডেটা মুছে ফেলে ব্যাকআপ থেকে পুনরুদ্ধার করা হবে। আপনি কি নিশ্চিত?",
            [
                { text: "বাতিল", style: "cancel" },
                {
                    text: "চালিয়ে যান",
                    style: "destructive",
                    onPress: () => {
                        if (biometricEnabled) {
                            requireBiometric("ডেটা পুনরুদ্ধারের অনুমতি দিন", doRestore);
                        } else {
                            doRestore();
                        }
                    },
                },
            ]
        );
    };

    const doRestore = async () => {
        try {
            setLoading("restore");

            const result = await DocumentPicker.getDocumentAsync({
                type: ["application/json", "*/*"],
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                setLoading(null);
                return;
            }

            const file = result.assets[0];
            const data = await parseBackupFile(file.uri);
            const { restored } = restoreBackup(data);
            loadStats();

            const summary = Object.entries(restored)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n");

            Alert.alert("✅ পুনরুদ্ধার সফল", summary);
        } catch (e: any) {
            console.error(e);
            Alert.alert("ত্রুটি", e?.message || "ফাইল পড়া যায়নি বা অবৈধ");
        } finally {
            setLoading(null);
        }
    };

    // ============================
    // Clear Local + Cloud
    // ============================
    const handleClear = () => {
        // 🆕 আগে চেক
        if (!isOnline) {
            Alert.alert(
                "❌ ইন্টারনেট নেই",
                "Clear করার আগে ইন্টারনেট চালু করুন। নইলে MongoDB থেকে ডেটা ফিরে আসবে।"
            );
            return;
        }

        if (!isAdmin) {
            Alert.alert(
                "🔒 অনুমতি নেই",
                "শুধু Admin role এর user Clear করতে পারবেন।"
            );
            return;
        }

        Alert.alert(
            "🚨 সব ডেটা মুছবেন?",
            "লোকাল ও ক্লাউড (MongoDB) — দুই জায়গা থেকেই সব ঔষধ, বিক্রয়, বাকি মুছে যাবে। এটা ফেরানো যাবে না!",
            [
                { text: "বাতিল", style: "cancel" },
                {
                    text: "মুছে ফেলুন",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert(
                            "নিশ্চিত করুন",
                            "শেষবার জিজ্ঞেস করছি। সব ডেটা মুছে যাবে।",
                            [
                                { text: "না", style: "cancel" },
                                {
                                    text: "হ্যাঁ, মুছে ফেলুন",
                                    style: "destructive",
                                    onPress: () => {
                                        if (biometricEnabled) {
                                            requireBiometric(
                                                "ডেটা মুছে ফেলার অনুমতি দিন",
                                                doClear
                                            );
                                        } else {
                                            doClear();
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    const doClear = async () => {
        try {
            setLoading("clear");

            // ১. Local SQLite clear
            clearAllData();

            // ২. Cloud MongoDB clear (login থাকলে)
            const loggedIn = await isLoggedIn();
            if (loggedIn) {
                try {
                    const token = await getToken();
                    const res = await fetch(`${API_URL}/admin/clear-mongodb`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            tables: ["medicines", "sales", "customers"],
                        }),
                    });

                    const json = await res.json();

                    loadStats();

                    if (json.success) {
                        Alert.alert(
                            "✅ সফল",
                            `লোকাল ও ক্লাউড — সব ডেটা মুছে ফেলা হয়েছে\n\n` +
                            `Medicines: ${json.deleted?.medicines ?? 0}\n` +
                            `Sales: ${json.deleted?.sales ?? 0}\n` +
                            `Customers: ${json.deleted?.customers ?? 0}`
                        );
                    } else {
                        Alert.alert(
                            "⚠️ আংশিক সফল",
                            `লোকাল ডেটা মুছে গেছে, কিন্তু ক্লাউডে সমস্যা:\n${json.error || "Unknown"
                            }`
                        );
                    }
                } catch (cloudErr: any) {
                    loadStats();
                    Alert.alert(
                        "⚠️ আংশিক সফল",
                        `লোকাল ডেটা মুছে গেছে, কিন্তু ক্লাউডে পৌঁছানো যায়নি:\n${cloudErr?.message || "Network error"
                        }`
                    );
                }
            } else {
                loadStats();
                Alert.alert(
                    "✅ লোকাল সফল",
                    "লোকাল ডেটা মুছে গেছে।\n\nক্লাউড সিঙ্ক বন্ধ (login নেই)।"
                );
            }
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message || "মুছে ফেলা যায়নি");
        } finally {
            setLoading(null);
        }
    };

    // ============================
    // Excel Export
    // ============================
    const handleExcelExport = async () => {
        try {
            setLoading("excel");

            const products = getAllProducts();
            const customers = getAllCustomers();

            Alert.alert("Excel Export", "কোনটা এক্সপোর্ট করবেন?", [
                {
                    text: "প্রোডাক্ট",
                    onPress: async () => {
                        if (products.length === 0) {
                            Alert.alert("খালি", "কোনো প্রোডাক্ট নেই");
                            setLoading(null);
                            return;
                        }
                        await exportProductsToExcel(products);
                        setLoading(null);
                    },
                },
                {
                    text: "কাস্টমার",
                    onPress: async () => {
                        if (customers.length === 0) {
                            Alert.alert("খালি", "কোনো কাস্টমার নেই");
                            setLoading(null);
                            return;
                        }
                        await exportCustomersToExcel(customers);
                        setLoading(null);
                    },
                },
                {
                    text: "বাতিল",
                    style: "cancel",
                    onPress: () => setLoading(null),
                },
            ]);
        } catch (e: any) {
            console.error(e);
            Alert.alert("ত্রুটি", e?.message || "এক্সপোর্ট করা যায়নি");
            setLoading(null);
        }
    };

    const biometricLabel = getBiometricLabel(biometricType);
    const biometricIcon = getBiometricIcon(biometricType);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
        >
            {/* বর্তমান ডেটা */}
            <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>বর্তমান ডেটা</Text>
                <View style={styles.statsGrid}>
                    <StatItem
                        label="ঔষধ"
                        value={stats.medicines}
                        icon="medkit-outline"
                        color="#0d9488"
                    />
                    <StatItem
                        label="বিক্রয়"
                        value={stats.sales}
                        icon="cart-outline"
                        color="#3b82f6"
                    />
                    <StatItem
                        label="আইটেম"
                        value={stats.saleItems}
                        icon="list-outline"
                        color="#8b5cf6"
                    />
                    <StatItem
                        label="বাকি কাস্টমার"
                        value={stats.dueCustomers}
                        icon="people-outline"
                        color="#d97706"
                    />
                    <StatItem
                        label="পেমেন্ট"
                        value={stats.duePayments}
                        icon="cash-outline"
                        color="#16a34a"
                    />
                </View>
            </View>

            {/* ক্লাউড সিঙ্ক */}
            <SyncSection />

            {/* নিরাপত্তা */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔒 নিরাপত্তা</Text>

                <View style={styles.biometricRow}>
                    <View
                        style={[
                            styles.iconBox,
                            {
                                backgroundColor: biometricSupported
                                    ? "#dcfce7"
                                    : "#f3f4f6",
                            },
                        ]}
                    >
                        <Ionicons
                            name={biometricIcon}
                            size={22}
                            color={biometricSupported ? "#16a34a" : "#9ca3af"}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>
                            {biometricSupported
                                ? `${biometricLabel} লক`
                                : "বায়োমেট্রিক লক"}
                        </Text>
                        <Text style={styles.rowSubtitle}>
                            {biometricSupported
                                ? "Restore ও Clear করার আগে যাচাই"
                                : biometricReason || "সাপোর্টেড নয়"}
                        </Text>
                    </View>
                    <Switch
                        value={biometricEnabled}
                        onValueChange={toggleBiometric}
                        disabled={!biometricSupported}
                        trackColor={{ false: "#e5e7eb", true: "#0d9488" }}
                        thumbColor={biometricEnabled ? "#fff" : "#f9fafb"}
                    />
                </View>

                {biometricEnabled && (
                    <View style={styles.infoBanner}>
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={16}
                            color="#16a34a"
                        />
                        <Text style={styles.infoText}>
                            Restore ও Clear All Data এখন{" "}
                            <Text style={{ fontWeight: "800" }}>{biometricLabel}/PIN</Text>{" "}
                            দিয়ে সুরক্ষিত
                        </Text>
                    </View>
                )}
            </View>

            {/* ডেটা ব্যাকআপ */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>💾 ডেটা ব্যাকআপ</Text>

                <SettingRow
                    icon="download-outline"
                    iconBg="#dcfce7"
                    iconColor="#16a34a"
                    title="Full Backup"
                    subtitle="সব ডেটা JSON ফাইলে ডাউনলোড"
                    onPress={handleBackup}
                    loading={loading === "backup"}
                />

                <SettingRow
                    icon="cloud-upload-outline"
                    iconBg="#dbeafe"
                    iconColor="#3b82f6"
                    title="Data Restore"
                    subtitle={
                        biometricEnabled
                            ? `🔒 ${biometricLabel}/PIN যাচাই লাগবে`
                            : "ব্যাকআপ ফাইল থেকে ডেটা ফিরিয়ে আনুন"
                    }
                    onPress={handleRestore}
                    loading={loading === "restore"}
                />

                <SettingRow
                    icon="grid-outline"
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                    title="Excel Export"
                    subtitle="প্রোডাক্ট / কাস্টমার Excel এ সেভ"
                    onPress={handleExcelExport}
                    loading={loading === "excel"}
                />
            </View>

            {/* ⚠️ ডেঞ্জার জোন — শুধু Admin + Online */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: "#dc2626" }]}>
                    ⚠️ ডেঞ্জার জোন
                </Text>

                {roleLoading ? (
                    // Loading state
                    <View style={styles.dangerRowDisabled}>
                        <View style={[styles.iconBox, { backgroundColor: "#f3f4f6" }]}>
                            <ActivityIndicator color="#9ca3af" size="small" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rowTitle, { color: "#9ca3af" }]}>
                                Checking access...
                            </Text>
                        </View>
                    </View>
                ) : canClearData ? (
                    // ✅ Admin + Online → Button দেখাও
                    <TouchableOpacity
                        style={styles.dangerRow}
                        onPress={handleClear}
                        activeOpacity={0.7}
                        disabled={loading !== null}
                    >
                        <View style={[styles.iconBox, { backgroundColor: "#fee2e2" }]}>
                            {loading === "clear" ? (
                                <ActivityIndicator color="#dc2626" size="small" />
                            ) : (
                                <Ionicons
                                    name="trash-outline"
                                    size={22}
                                    color="#dc2626"
                                />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rowTitle, { color: "#dc2626" }]}>
                                Clear All Data
                            </Text>
                            <Text style={styles.rowSubtitle}>
                                {biometricEnabled
                                    ? `🔒 ${biometricLabel}/PIN যাচাই লাগবে · লোকাল + ক্লাউড`
                                    : "লোকাল ও ক্লাউড — সব মুছে যাবে"}
                            </Text>
                        </View>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#9ca3af"
                        />
                    </TouchableOpacity>
                ) : (
                    // ❌ Admin নয় বা Offline → Disabled message
                    <View style={styles.dangerRowDisabled}>
                        <View style={[styles.iconBox, { backgroundColor: "#f3f4f6" }]}>
                            <Ionicons
                                name={
                                    !isOnline
                                        ? "cloud-offline-outline"
                                        : "lock-closed-outline"
                                }
                                size={22}
                                color="#9ca3af"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rowTitle, { color: "#9ca3af" }]}>
                                Clear All Data
                            </Text>
                            <Text style={styles.rowSubtitle}>
                                {!isOnline
                                    ? "⚠️ ইন্টারনেট সংযোগ নেই — বন্ধ"
                                    : "🔒 শুধু Admin এই কাজ করতে পারবেন"}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Info message */}
                {!canClearData && !roleLoading && (
                    <View style={styles.warningBox}>
                        <Ionicons
                            name="information-circle-outline"
                            size={16}
                            color="#92400e"
                        />
                        <Text style={styles.warningText}>
                            {!isOnline
                                ? "Clear করার আগে ইন্টারনেট চালু করুন — নইলে MongoDB থেকে ডেটা ফিরে আসবে।"
                                : "শুধু Admin role এর user Clear করতে পারবেন। Cloud Sync এ Admin দিয়ে Login করুন।"}
                        </Text>
                    </View>
                )}
            </View>

            {/* About */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ℹ️ অ্যাপ সম্পর্কে</Text>

                <View style={styles.aboutCard}>
                    <View style={styles.aboutHeader}>
                        <View style={styles.appIcon}>
                            <Ionicons name="medkit" size={32} color="#0d9488" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.appName}>Pharmacy POS</Text>
                            <Text style={styles.appVersion}>Version 1.0.0</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <AboutRow label="ডাটাবেস" value="SQLite (Local)" />
                    <AboutRow label="মোট টেবিল" value="5" />
                    <AboutRow label="ব্যাকআপ ফরম্যাট" value="JSON" />
                    <AboutRow label="নিরাপত্তা" value="Biometric" />
                    <AboutRow label="ক্লাউড" value="MongoDB" />
                    <AboutRow label="অ্যাপ টাইপ" value="Offline-first" />
                </View>
            </View>

            <Text style={styles.footer}>
                © 2026 Pharmacy POS · Made with ❤️
            </Text>
        </ScrollView>
    );
}

// ============================
// Helper Components
// ============================
function StatItem({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: number;
    icon: any;
    color: string;
}) {
    return (
        <View style={styles.statItem}>
            <Ionicons name={icon} size={16} color={color} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function SettingRow({
    icon,
    iconBg,
    iconColor,
    title,
    subtitle,
    onPress,
    loading,
}: {
    icon: any;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    loading?: boolean;
}) {
    return (
        <TouchableOpacity
            style={styles.row}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={loading}
        >
            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                {loading ? (
                    <ActivityIndicator color={iconColor} size="small" />
                ) : (
                    <Ionicons name={icon} size={22} color={iconColor} />
                )}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
    );
}

function AboutRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{label}</Text>
            <Text style={styles.aboutValue}>{value}</Text>
        </View>
    );
}

// ============================
// Styles
// ============================
const styles = StyleSheet.create({
    container: { flex: 1, padding: 14, backgroundColor: "#f9fafb" },

    statsCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        marginBottom: 18,
    },
    statsTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: "#374151",
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    statItem: {
        flex: 1,
        minWidth: "30%",
        alignItems: "center",
        padding: 10,
        backgroundColor: "#f9fafb",
        borderRadius: 10,
    },
    statValue: {
        fontSize: 16,
        fontWeight: "800",
        color: "#111827",
        marginTop: 4,
    },
    statLabel: { fontSize: 10, color: "#6b7280", marginTop: 2 },

    section: { marginBottom: 18 },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: "#374151",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    dangerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#fecaca",
    },
    dangerRowDisabled: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#f9fafb",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    biometricRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    rowTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
    rowSubtitle: { fontSize: 11, color: "#6b7280", marginTop: 2 },

    infoBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#f0fdf4",
        padding: 10,
        borderRadius: 10,
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    infoText: {
        fontSize: 11,
        color: "#166534",
        flex: 1,
        lineHeight: 16,
    },

    warningBox: {
        flexDirection: "row",
        gap: 6,
        backgroundColor: "#fef3c7",
        borderRadius: 10,
        padding: 10,
        marginTop: 8,
    },
    warningText: {
        flex: 1,
        fontSize: 11,
        color: "#92400e",
        lineHeight: 16,
    },

    aboutCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    aboutHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    appIcon: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: "#f0fdfa",
        alignItems: "center",
        justifyContent: "center",
    },
    appName: { fontSize: 16, fontWeight: "800", color: "#111827" },
    appVersion: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    divider: {
        height: 1,
        backgroundColor: "#f1f5f9",
        marginVertical: 12,
    },
    aboutRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
    },
    aboutLabel: { fontSize: 12, color: "#6b7280" },
    aboutValue: { fontSize: 12, fontWeight: "700", color: "#111827" },

    footer: {
        textAlign: "center",
        fontSize: 11,
        color: "#9ca3af",
        marginTop: 20,
        marginBottom: 10,
    },
});