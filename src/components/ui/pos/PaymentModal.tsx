import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { formatTk } from "../../../utils/format";

type Props = {
    visible: boolean;
    total: number;
    onClose: () => void;
    onConfirm: (paid: number, method: "cash" | "card" | "bkash") => void;
};

const METHODS: {
    key: "cash" | "card" | "bkash";
    label: string;
    icon: any;
}[] = [
        { key: "cash", label: "ক্যাশ", icon: "cash-outline" },
        { key: "card", label: "কার্ড", icon: "card-outline" },
        { key: "bkash", label: "বিকাশ", icon: "phone-portrait-outline" },
    ];

export default function PaymentModal({
    visible,
    total,
    onClose,
    onConfirm,
}: Props) {
    const [paid, setPaid] = useState("");
    const [method, setMethod] = useState<"cash" | "card" | "bkash">("cash");

    const paidNum = parseFloat(paid) || 0;
    const change = paidNum - total;

    const handleConfirm = () => {
        if (paidNum <= 0) {
            Alert.alert("ত্রুটি", "টাকার পরিমাণ দিন");
            return;
        }
        onConfirm(paidNum, method);
        setPaid("");
        setMethod("cash");
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {/* ✅ KeyboardAvoidingView — পুরো screen wrap */}
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <Text style={styles.title}>পেমেন্ট</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.totalBox}>
                            <Text style={styles.totalLabel}>মোট দিতে হবে</Text>
                            <Text style={styles.totalValue}>{formatTk(total)}</Text>
                        </View>

                        <Text style={styles.label}>পেমেন্ট মেথড</Text>
                        <View style={styles.methodRow}>
                            {METHODS.map((m) => (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[
                                        styles.methodBtn,
                                        method === m.key && styles.methodBtnActive,
                                    ]}
                                    onPress={() => setMethod(m.key)}
                                >
                                    <Ionicons
                                        name={m.icon}
                                        size={20}
                                        color={method === m.key ? "#fff" : "#0d9488"}
                                    />
                                    <Text
                                        style={[
                                            styles.methodText,
                                            method === m.key && { color: "#fff" },
                                        ]}
                                    >
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>পরিশোধিত (৳)</Text>
                        <TextInput
                            style={styles.input}
                            value={paid}
                            onChangeText={setPaid}
                            keyboardType="numeric"
                            placeholder={String(Math.round(total))}
                            placeholderTextColor="#9ca3af"
                            returnKeyType="done"
                            onSubmitEditing={handleConfirm}
                        />

                        {paidNum > 0 && (
                            <View style={styles.changeBox}>
                                <Text style={styles.changeLabel}>
                                    {change >= 0 ? "ফেরত" : "বাকি থাকবে"}
                                </Text>
                                <Text
                                    style={[
                                        styles.changeValue,
                                        { color: change >= 0 ? "#16a34a" : "#d97706" },
                                    ]}
                                >
                                    {formatTk(Math.abs(change))}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={handleConfirm}
                        >
                            <Ionicons
                                name={
                                    paidNum >= total ? "checkmark-circle" : "people-outline"
                                }
                                size={22}
                                color="#fff"
                            />
                            <Text style={styles.confirmText}>
                                {paidNum >= total ? "বিল কনফার্ম" : "বাকি হিসেবে সেভ"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 30,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    title: { fontSize: 18, fontWeight: "bold", color: "#0d9488" },
    totalBox: {
        backgroundColor: "#f0fdfa",
        padding: 14,
        borderRadius: 12,
        marginBottom: 14,
        alignItems: "center",
    },
    totalLabel: { fontSize: 12, color: "#0f766e" },
    totalValue: {
        fontSize: 26,
        fontWeight: "800",
        color: "#0d9488",
        marginTop: 4,
    },
    label: {
        fontSize: 13,
        color: "#374151",
        fontWeight: "600",
        marginBottom: 6,
        marginTop: 8,
    },
    methodRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
    methodBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#0d9488",
        gap: 6,
    },
    methodBtnActive: { backgroundColor: "#0d9488" },
    methodText: { fontSize: 13, fontWeight: "600", color: "#0d9488" },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: "#f9fafb",
        color: "#111827",
    },
    changeBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
        backgroundColor: "#f9fafb",
        padding: 12,
        borderRadius: 10,
    },
    changeLabel: { fontSize: 13, color: "#6b7280" },
    changeValue: { fontSize: 16, fontWeight: "800" },
    confirmBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0d9488",
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 16,
        gap: 6,
    },
    confirmText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});