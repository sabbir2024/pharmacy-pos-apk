import { login, register } from "@/db/sync";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Mode = "login" | "register";

export default function LoginScreen() {
    const router = useRouter();

    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [shopName, setShopName] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    // ============================
    // Submit (Login / Register)
    // ============================
    const handleSubmit = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert("ত্রুটি", "Email ও password দিন");
            return;
        }

        if (password.length < 6) {
            Alert.alert("ত্রুটি", "Password কমপক্ষে ৬ অক্ষর হতে হবে");
            return;
        }

        if (mode === "register" && !name.trim()) {
            Alert.alert("ত্রুটি", "আপনার নাম দিন");
            return;
        }

        try {
            setLoading(true);

            const result =
                mode === "login"
                    ? await login(email.trim(), password)
                    : await register(
                        email.trim(),
                        password,
                        name.trim(),
                        shopName.trim()
                    );

            // ============================
            // Register সফল — pending handling
            // ============================
            if (mode === "register" && result.success) {
                if (result.pending) {
                    // ⏳ Pending — waiting screen এ পাঠাও
                    Alert.alert(
                        "⏳ অপেক্ষা করুন",
                        result.message ||
                        "আপনার অ্যাকাউন্ট admin approval এর অপেক্ষায় আছে। Approve হলে login করতে পারবেন।",
                        [
                            {
                                text: "ঠিক আছে",
                                onPress: () =>
                                    router.replace({
                                        pathname: "/pending",
                                        params: { email: email.trim() },
                                    }),
                            },
                        ]
                    );
                } else if (result.user) {
                    // ✅ First user (admin) — সরাসরি ঢুকাও
                    Alert.alert(
                        "✅ স্বাগতম!",
                        `Admin অ্যাকাউন্ট তৈরি হয়েছে।\nস্বাগতম ${result.user.name || result.user.email}!`,
                        [
                            {
                                text: "চালিয়ে যান",
                                onPress: () => router.replace("/(tabs)"),
                            },
                        ]
                    );
                }
                return;
            }

            // ============================
            // Login সফল
            // ============================
            if (mode === "login" && result.success && result.user) {
                Alert.alert(
                    "✅ সফল",
                    `স্বাগতম ${result.user.name || result.user.email}!`,
                    [
                        {
                            text: "ঠিক আছে",
                            onPress: () => router.replace("/(tabs)"),
                        },
                    ]
                );
                return;
            }

            // ============================
            // Login ব্যর্থ — status check
            // ============================
            if (mode === "login" && !result.success) {
                // Pending
                if (result.userStatus === "pending" || result.error?.includes("approve")) {
                    Alert.alert(
                        "⏳ Pending",
                        result.error ||
                        "আপনার অ্যাকাউন্ট এখনো admin approve করেনি।",
                        [
                            { text: "বাতিল", style: "cancel" },
                            {
                                text: "Status দেখুন",
                                onPress: () =>
                                    router.replace({
                                        pathname: "/pending",
                                        params: { email: email.trim() },
                                    }),
                            },
                        ]
                    );
                    return;
                }

                // Rejected
                if (
                    result.userStatus === "rejected" ||
                    result.error?.toLowerCase().includes("reject")
                ) {
                    Alert.alert(
                        "❌ Rejected",
                        result.error ||
                        "আপনার অ্যাকাউন্ট admin reject করেছে।"
                    );
                    return;
                }

                // Blocked
                if (
                    result.userStatus === "blocked" ||
                    result.error?.toLowerCase().includes("block")
                ) {
                    Alert.alert(
                        "🚫 Blocked",
                        result.error ||
                        "আপনার অ্যাকাউন্ট block করা হয়েছে।"
                    );
                    return;
                }

                // সাধারণ error (network / wrong password)
                Alert.alert(
                    "❌ ব্যর্থ",
                    result.error || "ইন্টারনেট সংযোগ চেক করুন"
                );
                return;
            }

            // অন্য যেকোনো error
            Alert.alert("❌ ব্যর্থ", result.error || "কিছু ভুল হয়েছে");
        } catch (e: any) {
            console.error("Auth error:", e);
            Alert.alert("ত্রুটি", e?.message || "কিছু ভুল হয়েছে");
        } finally {
            setLoading(false);
        }
    };

    // ============================
    // Skip (Offline mode)
    // ============================
    const handleSkip = () => {
        Alert.alert(
            "স্কিপ করবেন?",
            "স্কিপ করলে ক্লাউড সিঙ্ক বন্ধ থাকবে। ডেটা শুধু এই ফোনে থাকবে। পরে Settings → ক্লাউড সিঙ্ক থেকে লগইন করতে পারবেন।",
            [
                { text: "বাতিল", style: "cancel" },
                {
                    text: "স্কিপ",
                    onPress: () => router.replace("/(tabs)"),
                },
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header / Logo */}
                <View style={styles.header}>
                    <View style={styles.logoBox}>
                        <Ionicons name="medkit" size={42} color="#0d9488" />
                    </View>
                    <Text style={styles.title}>Pharmacy POS</Text>
                    <Text style={styles.subtitle}>
                        {mode === "login"
                            ? "আপনার অ্যাকাউন্টে লগইন করুন"
                            : "নতুন অ্যাকাউন্ট তৈরি করুন"}
                    </Text>
                </View>

                {/* Mode Toggle */}
                <View style={styles.modeSwitch}>
                    <TouchableOpacity
                        style={[
                            styles.modeBtn,
                            mode === "login" && styles.modeBtnActive,
                        ]}
                        onPress={() => setMode("login")}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="log-in-outline"
                            size={16}
                            color={mode === "login" ? "#fff" : "#6b7280"}
                        />
                        <Text
                            style={[
                                styles.modeText,
                                mode === "login" && styles.modeTextActive,
                            ]}
                        >
                            লগইন
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.modeBtn,
                            mode === "register" && styles.modeBtnActive,
                        ]}
                        onPress={() => setMode("register")}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="person-add-outline"
                            size={16}
                            color={mode === "register" ? "#fff" : "#6b7280"}
                        />
                        <Text
                            style={[
                                styles.modeText,
                                mode === "register" && styles.modeTextActive,
                            ]}
                        >
                            রেজিস্টার
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {mode === "register" && (
                        <>
                            <Field label="আপনার নাম *">
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="যেমন: সাব্বির আহমেদ"
                                    placeholderTextColor="#9ca3af"
                                    autoCapitalize="words"
                                />
                            </Field>

                            <Field label="ফার্মেসির নাম">
                                <TextInput
                                    style={styles.input}
                                    value={shopName}
                                    onChangeText={setShopName}
                                    placeholder="যেমন: সেবা ফার্মেসি"
                                    placeholderTextColor="#9ca3af"
                                    autoCapitalize="words"
                                />
                            </Field>
                        </>
                    )}

                    <Field label="ইমেইল *">
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            placeholder="you@example.com"
                            placeholderTextColor="#9ca3af"
                        />
                    </Field>

                    <Field label="পাসওয়ার্ড *">
                        <View style={styles.passWrap}>
                            <TextInput
                                style={styles.passInput}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPass}
                                placeholder="কমপক্ষে ৬ অক্ষর"
                                placeholderTextColor="#9ca3af"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPass(!showPass)}
                                style={styles.eyeBtn}
                            >
                                <Ionicons
                                    name={showPass ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    color="#6b7280"
                                />
                            </TouchableOpacity>
                        </View>
                    </Field>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons
                                    name={
                                        mode === "login"
                                            ? "log-in-outline"
                                            : "person-add-outline"
                                    }
                                    size={20}
                                    color="#fff"
                                />
                                <Text style={styles.submitText}>
                                    {mode === "login" ? "লগইন করুন" : "রেজিস্টার করুন"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Skip Button */}
                    <TouchableOpacity
                        style={styles.skipBtn}
                        onPress={handleSkip}
                        disabled={loading}
                    >
                        <Text style={styles.skipText}>
                            এড়িয়ে যান → অফলাইনে চালান
                        </Text>
                    </TouchableOpacity>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Ionicons
                            name="information-circle-outline"
                            size={16}
                            color="#0284c7"
                        />
                        <Text style={styles.infoText}>
                            {mode === "register"
                                ? "রেজিস্টার করার পর admin approve করলে আপনি লগইন করতে পারবেন। অ্যাপ্রুভালের আগে আপনি অপেক্ষা স্ক্রিনে দেখতে পাবেন।"
                                : "স্কিপ করলে ডেটা শুধু এই ফোনে থাকবে। পরে Settings → ক্লাউড সিঙ্ক থেকে লগইন করতে পারবেন।"}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ============================
// Field Helper
// ============================
function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            {children}
        </View>
    );
}

// ============================
// Styles
// ============================
const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        backgroundColor: "#f9fafb",
        justifyContent: "center",
    },

    // Header
    header: { alignItems: "center", marginBottom: 24 },
    logoBox: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: "#f0fdfa",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    title: { fontSize: 24, fontWeight: "800", color: "#0d9488" },
    subtitle: { fontSize: 13, color: "#6b7280", marginTop: 4, textAlign: "center" },

    // Mode toggle
    modeSwitch: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginBottom: 20,
    },
    modeBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
    },
    modeBtnActive: { backgroundColor: "#0d9488" },
    modeText: { fontSize: 14, fontWeight: "700", color: "#6b7280" },
    modeTextActive: { color: "#fff" },

    // Form
    form: { gap: 14 },
    field: { marginBottom: 4 },
    label: {
        fontSize: 13,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: "#fff",
        color: "#111827",
    },

    // Password
    passWrap: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        backgroundColor: "#fff",
        paddingRight: 8,
    },
    passInput: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: "#111827",
    },
    eyeBtn: { padding: 6 },

    // Submit
    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#0d9488",
        paddingVertical: 15,
        borderRadius: 12,
        marginTop: 8,
    },
    submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },

    // Skip
    skipBtn: {
        alignItems: "center",
        paddingVertical: 12,
        marginTop: 4,
    },
    skipText: {
        color: "#6b7280",
        fontWeight: "700",
        fontSize: 13,
        textDecorationLine: "underline",
    },

    // Info
    infoBox: {
        flexDirection: "row",
        gap: 6,
        backgroundColor: "#eff6ff",
        padding: 10,
        borderRadius: 10,
        marginTop: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 11,
        color: "#1e40af",
        lineHeight: 16,
    },
});