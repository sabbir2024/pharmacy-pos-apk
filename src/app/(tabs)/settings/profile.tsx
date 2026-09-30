import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
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
import {
    fullSync,
    getToken,
    getUser,
    isLoggedIn,
    logout,
} from "@/db/sync";

// Profile (SQLite → MongoDB sync)
import { getProfile, saveProfile } from "@/db/profile";

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

// Data
import { getAllCustomers } from "@/db/customers";
import { getAllProducts } from "@/db/products";
import { exportCustomersToExcel, exportProductsToExcel } from "@/utils/excel";

// Components
import {
    ProfileHeader,
    SettingsRow,
    SettingsSection,
} from "@/components/ui/settings";

// Hooks
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useUserRole } from "@/hooks/useUserRole";

const BIOMETRIC_KEY = "@pharmacy_biometric_enabled";
const API_URL = "https://pharmacy-backend-omega.vercel.app/api";

export default function ProfileScreen() {
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [loggedIn, setLoggedIn] = useState(false);

    const [stats, setStats] = useState<BackupStats>({
        medicines: 0,
        sales: 0,
        saleItems: 0,
        dueCustomers: 0,
        duePayments: 0,
    });

    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricType, setBiometricType] = useState<
        "fingerprint" | "face" | "iris" | "none"
    >("none");
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    const [loading, setLoading] = useState<
        "backup" | "restore" | "clear" | "excel" | null
    >(null);

    const [profileModalOpen, setProfileModalOpen] = useState(false);

    const { isOnline } = useNetworkStatus();
    const { isAdmin } = useUserRole();

    const canClearData = isOnline && isAdmin;

    // ============================
    // Load
    // ============================
    const loadAll = async () => {
        try {
            setStats(getBackupStats());

            const logged = await isLoggedIn();
            setLoggedIn(logged);

            if (logged) {
                const authUser = await getUser();

                // ✅ SQLite থেকে profile পড়ুন (sync এর source of truth)
                const sqliteProfile = getProfile();

                // Local cache (fallback)
                const localRaw = await AsyncStorage.getItem("@profile_override");
                const local = localRaw ? JSON.parse(localRaw) : {};

                // Merge: SQLite → local → auth user
                setUser({
                    ...authUser,
                    name:
                        sqliteProfile?.name ||
                        local.name ||
                        authUser?.name ||
                        "",
                    shopName:
                        sqliteProfile?.shopName ||
                        local.shopName ||
                        authUser?.shopName ||
                        "",
                    address:
                        sqliteProfile?.address ||
                        authUser?.address ||
                        "",
                    phone:
                        sqliteProfile?.phone ||
                        authUser?.phone ||
                        "",
                    businessType:
                        sqliteProfile?.businessType ||
                        authUser?.businessType ||
                        "pharmacy",
                });
            }
        } catch (e) {
            console.error("Load error:", e);
        }
    };

    const loadBiometric = async () => {
        const result = await isBiometricAvailable();
        setBiometricSupported(result.available);
        setBiometricType(result.type);

        const saved = await AsyncStorage.getItem(BIOMETRIC_KEY);
        setBiometricEnabled(saved === "true");
    };

    useFocusEffect(
        React.useCallback(() => {
            loadAll();
            loadBiometric();
        }, [])
    );

    // ============================
    // Profile Edit Form
    // ============================
    const [profileName, setProfileName] = useState("");
    const [profileShop, setProfileShop] = useState("");
    const [profileAddress, setProfileAddress] = useState("");
    const [profilePhone, setProfilePhone] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);

    const openProfileModal = () => {
        setProfileName(user?.name || "");
        setProfileShop(user?.shopName || "");
        setProfileAddress(user?.address || "");
        setProfilePhone(user?.phone || "");
        setProfileModalOpen(true);
    };

    // ============================
    // ✅ Save Profile → SQLite + MongoDB Sync
    // ============================
    const handleSaveProfile = async () => {
        if (!profileName.trim() && !profileShop.trim()) {
            Alert.alert("ত্রুটি", "নাম বা ফার্মেসির নাম দিন");
            return;
        }

        try {
            setSavingProfile(true);

            // ১. SQLite তে save (sync pending flag সহ)
            await saveProfile({
                name: profileName.trim(),
                shopName: profileShop.trim(),
                address: profileAddress.trim(),
                phone: profilePhone.trim(),
                businessType: user?.businessType || "pharmacy",
            });

            // ২. Local cache (PDF header fallback)
            await AsyncStorage.setItem(
                "@profile_override",
                JSON.stringify({
                    name: profileName.trim(),
                    shopName: profileShop.trim(),
                })
            );

            console.log("✅ Profile saved to SQLite (pending)");

            setProfileModalOpen(false);
            loadAll();

            Alert.alert(
                "✅ সফল",
                "Profile আপডেট হয়েছে\nক্লাউডে সিঙ্ক করা হচ্ছে..."
            );

            // ৩. ✅ Auto-sync (background)
            fullSync()
                .then((result) => {
                    if (result.success) {
                        console.log("✅ Profile synced to MongoDB");
                    } else {
                        console.log("⚠️ Sync failed:", result.error);
                    }
                })
                .catch((e) => {
                    console.log("⚠️ Sync error:", e);
                });
        } catch (e: any) {
            console.error("Save profile error:", e);
            Alert.alert("ত্রুটি", e?.message || "সেভ করা যায়নি");
        } finally {
            setSavingProfile(false);
        }
    };

    // ============================
    // Biometric Toggle
    // ============================
    const toggleBiometric = async (value: boolean) => {
        if (value && !biometricSupported) {
            Alert.alert("সাপোর্টেড নয়", "ডিভাইসে বায়োমেট্রিক সেটআপ নেই");
            return;
        }

        if (value) {
            const { authenticateWithBiometric } = await import(
                "@/utils/biometric"
            );
            const { success } = await authenticateWithBiometric(
                "বায়োমেট্রিক লক চালু করুন"
            );
            if (!success) return;
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
            Alert.alert("✅ সফল", `সাইজ: ${formatBytes(size)}`);
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message);
        } finally {
            setLoading(null);
        }
    };

    // ============================
    // Restore
    // ============================
    const handleRestore = () => {
        Alert.alert(
            "⚠️ সতর্কতা",
            "বর্তমান সব ডেটা মুছে ফেলে ব্যাকআপ থেকে পুনরুদ্ধার হবে?",
            [
                { text: "বাতিল", style: "cancel" },
                {
                    text: "চালিয়ে যান",
                    style: "destructive",
                    onPress: () => {
                        if (biometricEnabled) {
                            requireBiometric("পুনরুদ্ধারের অনুমতি দিন", doRestore);
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
            const data = await parseBackupFile(result.assets[0].uri);
            restoreBackup(data);
            loadAll();
            Alert.alert("✅ সফল", "ডেটা পুনরুদ্ধার হয়েছে");
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message);
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
            Alert.alert("ত্রুটি", e?.message);
            setLoading(null);
        }
    };

    // ============================
    // Clear All Data
    // ============================
    const handleClear = () => {
        if (!isOnline) {
            Alert.alert(
                "❌ ইন্টারনেট নেই",
                "Clear করার আগে ইন্টারনেট চালু করুন।"
            );
            return;
        }
        if (!isAdmin) {
            Alert.alert("🔒 অনুমতি নেই", "শুধু Admin Clear করতে পারবেন।");
            return;
        }

        Alert.alert(
            "🚨 সব ডেটা মুছবেন?",
            "লোকাল ও ক্লাউড — সব ডেটা মুছে যাবে। এটা ফেরানো যাবে না!",
            [
                { text: "বাতিল", style: "cancel" },
                {
                    text: "মুছে ফেলুন",
                    style: "destructive",
                    onPress: () => {
                        if (biometricEnabled) {
                            requireBiometric("ডেটা মুছে ফেলার অনুমতি দিন", doClear);
                        } else {
                            doClear();
                        }
                    },
                },
            ]
        );
    };

    const doClear = async () => {
        try {
            setLoading("clear");
            clearAllData();

            if (loggedIn) {
                try {
                    const token = await getToken();
                    await fetch(`${API_URL}/admin/clear-mongodb`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            tables: ["medicines", "sales", "customers"],
                        }),
                    });
                } catch { }
            }

            loadAll();
            Alert.alert("✅ সফল", "সব ডেটা মুছে ফেলা হয়েছে");
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message);
        } finally {
            setLoading(null);
        }
    };

    // ============================
    // Logout
    // ============================
    const handleLogout = () => {
        Alert.alert("লগআউট", "লগআউট করবেন?", [
            { text: "বাতিল", style: "cancel" },
            {
                text: "লগআউট",
                style: "destructive",
                onPress: async () => {
                    await logout();
                    router.back();
                },
            },
        ]);
    };

    const biometricLabel = getBiometricLabel(biometricType);
    const biometricIcon = getBiometricIcon(biometricType);
    const appVersion = Constants.expoConfig?.version || "3.0.4";
    const versionCode = Constants.expoConfig?.android?.versionCode || 4;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                >
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>প্রোফাইল</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header */}
                <ProfileHeader
                    name={user?.name || "User"}
                    email={user?.email || ""}
                    shopName={user?.shopName}
                    role={user?.role}
                    isLoggedIn={loggedIn}
                    lastSyncAt={null}
                    onPress={loggedIn ? openProfileModal : undefined}
                    onLoginPress={() => router.push("/login")}
                />

                {/* Profile Info */}
                <SettingsSection title="👤 প্রোফাইল তথ্য">
                    <SettingsRow
                        icon="person-outline"
                        title="নাম"
                        value={user?.name || "—"}
                        onPress={loggedIn ? openProfileModal : undefined}
                    />
                    <SettingsRow
                        icon="mail-outline"
                        title="ইমেইল"
                        value={user?.email || "—"}
                    />
                    <SettingsRow
                        icon="shield-outline"
                        title="Role"
                        value={user?.role || "—"}
                    />
                    <SettingsRow
                        icon="storefront-outline"
                        title="ফার্মেসির নাম"
                        value={user?.shopName || "—"}
                        onPress={loggedIn ? openProfileModal : undefined}
                    />
                    <SettingsRow
                        icon="location-outline"
                        title="ঠিকানা"
                        value={user?.address || "—"}
                        onPress={loggedIn ? openProfileModal : undefined}
                    />
                    <SettingsRow
                        icon="call-outline"
                        title="ফার্মেসির ফোন"
                        value={user?.phone || "—"}
                        onPress={loggedIn ? openProfileModal : undefined}
                    />
                </SettingsSection>

                {/* Security */}
                <SettingsSection title="🔒 নিরাপত্তা">
                    <SettingsRow
                        icon={biometricIcon}
                        title={`${biometricLabel} লক`}
                        subtitle={
                            biometricSupported
                                ? "Restore ও Clear করার আগে যাচাই"
                                : "ডিভাইসে সেটআপ নেই"
                        }
                        rightElement={
                            <Switch
                                value={biometricEnabled}
                                onValueChange={toggleBiometric}
                                disabled={!biometricSupported}
                                trackColor={{ false: "#e5e7eb", true: "#0d9488" }}
                                thumbColor="#fff"
                            />
                        }
                    />

                    {biometricEnabled && (
                        <View style={styles.infoBanner}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={14}
                                color="#16a34a"
                            />
                            <Text style={styles.infoText}>
                                Restore ও Clear এখন {biometricLabel} দিয়ে সুরক্ষিত
                            </Text>
                        </View>
                    )}
                </SettingsSection>

                {/* Cloud Sync */}
                <SyncSection />

                {/* Backup */}
                <SettingsSection title="💾 ডেটা ব্যাকআপ">
                    <SettingsRow
                        icon="download-outline"
                        iconBg="#dcfce7"
                        iconColor="#16a34a"
                        title="Full Backup"
                        subtitle="সব ডেটা JSON ফাইলে"
                        onPress={handleBackup}
                        loading={loading === "backup"}
                    />

                    <SettingsRow
                        icon="cloud-upload-outline"
                        iconBg="#dbeafe"
                        iconColor="#3b82f6"
                        title="Data Restore"
                        subtitle={
                            biometricEnabled
                                ? `🔒 ${biometricLabel} যাচাই লাগবে`
                                : "ব্যাকআপ ফাইল থেকে"
                        }
                        onPress={handleRestore}
                        loading={loading === "restore"}
                    />

                    <SettingsRow
                        icon="grid-outline"
                        iconBg="#fef3c7"
                        iconColor="#d97706"
                        title="Excel Export"
                        subtitle="প্রোডাক্ট / কাস্টমার"
                        onPress={handleExcelExport}
                        loading={loading === "excel"}
                    />
                </SettingsSection>

                {/* Stats */}
                <SettingsSection title="📊 বর্তমান ডেটা">
                    <View style={styles.statsGrid}>
                        <StatBox
                            label="ঔষধ"
                            value={stats.medicines}
                            color="#0d9488"
                        />
                        <StatBox
                            label="বিক্রয়"
                            value={stats.sales}
                            color="#3b82f6"
                        />
                        <StatBox
                            label="আইটেম"
                            value={stats.saleItems}
                            color="#8b5cf6"
                        />
                        <StatBox
                            label="বাকি কাস্টমার"
                            value={stats.dueCustomers}
                            color="#d97706"
                        />
                        <StatBox
                            label="পেমেন্ট"
                            value={stats.duePayments}
                            color="#16a34a"
                        />
                    </View>
                </SettingsSection>

                {/* Danger Zone */}
                <SettingsSection title="⚠️ ডেঞ্জার জোন" danger>
                    {canClearData ? (
                        <SettingsRow
                            icon="trash-outline"
                            title="Clear All Data"
                            subtitle="লোকাল ও ক্লাউড — সব মুছে যাবে"
                            onPress={handleClear}
                            loading={loading === "clear"}
                            danger
                        />
                    ) : (
                        <View style={styles.disabledRow}>
                            <View
                                style={[
                                    styles.iconBox,
                                    { backgroundColor: "#f3f4f6" },
                                ]}
                            >
                                <Ionicons
                                    name={
                                        !isOnline
                                            ? "cloud-offline-outline"
                                            : "lock-closed-outline"
                                    }
                                    size={20}
                                    color="#9ca3af"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.disabledTitle}>Clear All Data</Text>
                                <Text style={styles.disabledSub}>
                                    {!isOnline
                                        ? "⚠️ ইন্টারনেট নেই"
                                        : "🔒 শুধু Admin"}
                                </Text>
                            </View>
                        </View>
                    )}
                </SettingsSection>

                {/* About */}
                <SettingsSection title="ℹ️ অ্যাপ সম্পর্কে">
                    <SettingsRow
                        icon="information-circle-outline"
                        title="Version"
                        value={appVersion}
                    />
                    <SettingsRow
                        icon="code-outline"
                        title="Version Code"
                        value={String(versionCode)}
                    />
                    <SettingsRow
                        icon="server-outline"
                        title="ডাটাবেস"
                        value="SQLite (Local)"
                    />
                    <SettingsRow
                        icon="cloud-outline"
                        title="ক্লাউড"
                        value="MongoDB"
                    />
                    <SettingsRow
                        icon="phone-portrait-outline"
                        title="অ্যাপ টাইপ"
                        value="Offline-First"
                    />
                    <SettingsRow
                        icon="mail-outline"
                        title="Support"
                        value="support@pharmacy.com"
                        onPress={() =>
                            Linking.openURL("mailto:support@pharmacy.com")
                        }
                    />
                </SettingsSection>

                {loggedIn && (
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="log-out-outline"
                            size={20}
                            color="#dc2626"
                        />
                        <Text style={styles.logoutText}>লগআউট</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.footer}>
                    © 2026 Pharmacy POS · Made with ❤️
                </Text>
            </ScrollView>

            {/* ============================ */}
            {/* Profile Edit Modal */}
            {/* ============================ */}
            <Modal
                visible={profileModalOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setProfileModalOpen(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: "flex-end",
                        }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.modalBox}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>প্রোফাইল এডিট</Text>
                                <TouchableOpacity
                                    onPress={() => setProfileModalOpen(false)}
                                >
                                    <Ionicons name="close" size={24} color="#374151" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>আপনার নাম</Text>
                            <TextInput
                                style={styles.input}
                                value={profileName}
                                onChangeText={setProfileName}
                                placeholder="আপনার নাম"
                                placeholderTextColor="#9ca3af"
                                autoFocus
                            />

                            <Text style={styles.label}>ফার্মেসির নাম</Text>
                            <TextInput
                                style={styles.input}
                                value={profileShop}
                                onChangeText={setProfileShop}
                                placeholder="ফার্মেসির নাম"
                                placeholderTextColor="#9ca3af"
                            />

                            <Text style={styles.label}>ফার্মেসির ঠিকানা</Text>
                            <TextInput
                                style={styles.input}
                                value={profileAddress}
                                onChangeText={setProfileAddress}
                                placeholder="গ্রাম / শহর"
                                placeholderTextColor="#9ca3af"
                            />

                            <Text style={styles.label}>ফার্মেসির ফোন</Text>
                            <TextInput
                                style={styles.input}
                                value={profilePhone}
                                onChangeText={setProfilePhone}
                                placeholder="01XXXXXXXXX"
                                placeholderTextColor="#9ca3af"
                                keyboardType="phone-pad"
                            />

                            <View style={styles.infoBox}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={14}
                                    color="#0284c7"
                                />
                                <Text style={styles.infoBoxText}>
                                    এই তথ্য PDF ইনভয়েস, রিপোর্ট ও লেজারে auto দেখাবে এবং
                                    ক্লাউডে সিঙ্ক হবে।
                                </Text>
                            </View>

                            <View style={styles.modalRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setProfileModalOpen(false)}
                                    disabled={savingProfile}
                                >
                                    <Text style={styles.cancelText}>বাতিল</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.saveBtn,
                                        savingProfile && { opacity: 0.6 },
                                    ]}
                                    onPress={handleSaveProfile}
                                    disabled={savingProfile}
                                >
                                    {savingProfile ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.saveText}>সেভ ও সিঙ্ক</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ============================
// Stat Box
// ============================
function StatBox({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
    );
}

// ============================
// Styles
// ============================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb" },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
        paddingTop: Platform.OS === "ios" ? 50 : 14,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: "#111827",
    },

    infoBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#f0fdf4",
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    infoText: {
        flex: 1,
        fontSize: 11,
        color: "#166534",
        fontWeight: "600",
    },

    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    statBox: {
        flex: 1,
        minWidth: "30%",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        alignItems: "center",
    },
    statLabel: { fontSize: 10, color: "#6b7280" },
    statValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },

    disabledRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#f9fafb",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    disabledTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#9ca3af",
    },
    disabledSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },

    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#fecaca",
        marginBottom: 16,
    },
    logoutText: { fontSize: 14, fontWeight: "700", color: "#dc2626" },
    footer: {
        textAlign: "center",
        fontSize: 11,
        color: "#9ca3af",
        marginTop: 8,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalBox: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#0d9488" },
    label: {
        fontSize: 13,
        color: "#374151",
        fontWeight: "600",
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        backgroundColor: "#f9fafb",
        color: "#111827",
    },
    infoBox: {
        flexDirection: "row",
        gap: 6,
        backgroundColor: "#eff6ff",
        padding: 10,
        borderRadius: 10,
        marginTop: 12,
    },
    infoBoxText: {
        flex: 1,
        fontSize: 11,
        color: "#1e40af",
        lineHeight: 16,
    },
    modalRow: { flexDirection: "row", gap: 8, marginTop: 16 },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
        justifyContent: "center",
    },
    cancelText: { color: "#374151", fontWeight: "700" },
    saveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#0d9488",
        alignItems: "center",
        justifyContent: "center",
    },
    saveText: { color: "#fff", fontWeight: "700" },
});