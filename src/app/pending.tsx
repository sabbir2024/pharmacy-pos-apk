import { checkStatus } from "@/db/sync";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function PendingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email?: string }>();

    const [email, setEmail] = useState(params.email || "");
    const [checking, setChecking] = useState(false);

    // ============================
    // Status Check
    // ============================
    const handleCheck = async () => {
        if (!email.trim()) {
            Alert.alert("ত্রুটি", "Email দিন");
            return;
        }

        try {
            setChecking(true);
            const result = await checkStatus(email.trim());

            if (!result.success) {
                Alert.alert("ত্রুটি", result.error || "Status পাওয়া যায়নি");
                return;
            }

            if (result.status === "active") {
                Alert.alert(
                    "✅ Approved!",
                    "Admin আপনার অ্যাকাউন্ট approve করেছে। এখন login করতে পারবেন।",
                    [
                        {
                            text: "Login করুন",
                            onPress: () => router.replace("/login"),
                        },
                    ]
                );
            } else if (result.status === "rejected") {
                Alert.alert(
                    "❌ Rejected",
                    "আপনার অ্যাকাউন্ট admin reject করেছে। যোগাযোগ করুন।"
                );
            } else if (result.status === "blocked") {
                Alert.alert(
                    "🚫 Blocked",
                    "আপনার অ্যাকাউন্ট block করা হয়েছে।"
                );
            } else {
                Alert.alert(
                    "⏳ এখনো Pending",
                    "Admin এখনো approve করেনি। কিছুক্ষণ পর আবার চেষ্টা করুন।"
                );
            }
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message || "সমস্যা হয়েছে");
        } finally {
            setChecking(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {/* Icon */}
                <View style={styles.iconBox}>
                    <Ionicons name="time" size={60} color="#d97706" />
                </View>

                <Text style={styles.title}>অপেক্ষা করুন</Text>
                <Text style={styles.subtitle}>
                    আপনার অ্যাকাউন্ট admin approval এর অপেক্ষায় আছে। Approve হলে আপনি
                    login করতে পারবেন।
                </Text>

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color="#0284c7"
                    />
                    <Text style={styles.infoText}>
                        Admin approve করার পর নিচের email দিয়ে status চেক করুন।
                    </Text>
                </View>

                {/* Email input */}
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="আপনার email"
                    placeholderTextColor="#9ca3af"
                />

                {/* Check button */}
                <TouchableOpacity
                    style={[styles.checkBtn, checking && { opacity: 0.6 }]}
                    onPress={handleCheck}
                    disabled={checking}
                    activeOpacity={0.8}
                >
                    {checking ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="refresh-outline" size={20} color="#fff" />
                            <Text style={styles.checkText}>Status চেক করুন</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Back to login */}
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.replace("/login")}
                >
                    <Text style={styles.backText}>← লগইন স্ক্রিনে ফিরুন</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#f9fafb",
        justifyContent: "center",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: "#fde68a",
    },
    iconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#fef3c7",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#92400e",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "center",
        marginTop: 8,
        lineHeight: 20,
    },
    infoBox: {
        flexDirection: "row",
        gap: 6,
        backgroundColor: "#eff6ff",
        padding: 10,
        borderRadius: 10,
        marginTop: 16,
        marginBottom: 16,
    },
    infoText: {
        flex: 1,
        fontSize: 11,
        color: "#1e40af",
        lineHeight: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: "#f9fafb",
        color: "#111827",
        marginBottom: 12,
    },
    checkBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#d97706",
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    checkText: { color: "#fff", fontWeight: "800", fontSize: 14 },
    backBtn: { alignItems: "center", paddingVertical: 10 },
    backText: {
        color: "#6b7280",
        fontSize: 13,
        textDecorationLine: "underline",
    },
});