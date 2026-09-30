import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
import { setOpeningBalance, type Customer } from "../../../db/customers";
import { formatTk } from "../../../utils/format";

type Props = {
    visible: boolean;
    customer: Customer | null;
    onClose: () => void;
    onSuccess: () => void;
};

export default function OpeningBalanceModal({
    visible,
    customer,
    onClose,
    onSuccess,
}: Props) {
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("পুরনো বাকি");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible && customer) {
            setAmount(
                customer.openingBalance ? String(customer.openingBalance) : ""
            );
            setNote(customer.openingNote || "পুরনো বাকি");
        }
    }, [visible, customer]);

    const handleSave = async () => {
        if (!customer) return;

        const amt = parseFloat(amount);
        if (isNaN(amt) || amt < 0) {
            Alert.alert("ত্রুটি", "সঠিক পরিমাণ দিন");
            return;
        }

        try {
            setSaving(true);
            await setOpeningBalance(customer.id!, amt, note.trim());
            Alert.alert("✅ সফল", "পুরনো বাকি সেট হয়েছে");
            onSuccess();
            onClose();
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message || "সেভ করা যায়নি");
        } finally {
            setSaving(false);
        }
    };

    const handleClear = () => {
        Alert.alert("মুছে ফেলবেন?", "Opening balance মুছে ফেলবেন?", [
            { text: "বাতিল", style: "cancel" },
            {
                text: "মুছুন",
                style: "destructive",
                onPress: async () => {
                    try {
                        await setOpeningBalance(customer!.id!, 0, "");
                        onSuccess();
                        onClose();
                    } catch (e: any) {
                        Alert.alert("ত্রুটি", e?.message);
                    }
                },
            },
        ]);
    };

    if (!customer) return null;

    const hasExisting = (customer.openingBalance || 0) > 0;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <Text style={styles.title}>পুরনো বাকি সেট</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.infoBanner}>
                            <Ionicons
                                name="information-circle-outline"
                                size={18}
                                color="#0284c7"
                            />
                            <Text style={styles.infoText}>
                                আগের সব বাকি এখানে সেট করুন। এটা ledger এ "Opening Balance"
                                হিসাবে দেখাবে।
                            </Text>
                        </View>

                        <View style={styles.customerBox}>
                            <Text style={styles.customerName}>{customer.name}</Text>
                            <Text style={styles.customerDue}>
                                বর্তমান বাকি: {formatTk(customer.totalDue)}
                            </Text>
                            {hasExisting && (
                                <Text style={styles.existingOpening}>
                                    বর্তমান Opening: {formatTk(customer.openingBalance || 0)}
                                </Text>
                            )}
                        </View>

                        <Text style={styles.label}>পুরনো বাকির পরিমাণ (৳) *</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="যেমন: 5000"
                            placeholderTextColor="#9ca3af"
                            autoFocus
                        />

                        <Text style={styles.label}>নোট / বিবরণ</Text>
                        <TextInput
                            style={styles.input}
                            value={note}
                            onChangeText={setNote}
                            placeholder="যেমন: পুরনো খাতার বাকি"
                            placeholderTextColor="#9ca3af"
                        />

                        <View style={styles.warningBox}>
                            <Ionicons name="warning-outline" size={16} color="#92400e" />
                            <Text style={styles.warningText}>
                                ⚠️ এটা total_due এ যোগ হবে না, শুধু ledger এ দেখাবে।
                            </Text>
                        </View>

                        <View style={styles.actions}>
                            {hasExisting ? (
                                <TouchableOpacity
                                    style={styles.clearBtn}
                                    onPress={handleClear}
                                    disabled={saving}
                                >
                                    <Text style={styles.clearText}>মুছুন</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={onClose}
                                    disabled={saving}
                                >
                                    <Text style={styles.cancelText}>বাতিল</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                <Text style={styles.saveText}>
                                    {saving ? "সেভ হচ্ছে..." : "সেভ"}
                                </Text>
                            </TouchableOpacity>
                        </View>
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
    scrollContent: { flexGrow: 1, justifyContent: "flex-end" },
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
    title: { fontSize: 18, fontWeight: "700", color: "#0d9488" },
    infoBanner: {
        flexDirection: "row",
        gap: 6,
        backgroundColor: "#eff6ff",
        padding: 10,
        borderRadius: 10,
        marginBottom: 12,
    },
    infoText: { flex: 1, fontSize: 11, color: "#1e40af", lineHeight: 16 },
    customerBox: {
        backgroundColor: "#f9fafb",
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
    },
    customerName: { fontSize: 15, fontWeight: "700", color: "#111827" },
    customerDue: {
        fontSize: 12,
        color: "#d97706",
        marginTop: 4,
        fontWeight: "600",
    },
    existingOpening: {
        fontSize: 11,
        color: "#3b82f6",
        marginTop: 4,
        fontWeight: "600",
    },
    label: {
        fontSize: 13,
        color: "#374151",
        fontWeight: "600",
        marginTop: 8,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: "#f9fafb",
        color: "#111827",
    },
    warningBox: {
        flexDirection: "row",
        gap: 6,
        backgroundColor: "#fef3c7",
        padding: 10,
        borderRadius: 10,
        marginTop: 12,
    },
    warningText: { flex: 1, fontSize: 11, color: "#92400e", lineHeight: 16 },
    actions: { flexDirection: "row", gap: 8, marginTop: 16 },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
    },
    cancelText: { color: "#374151", fontWeight: "700" },
    clearBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#fee2e2",
        alignItems: "center",
    },
    clearText: { color: "#dc2626", fontWeight: "700" },
    saveBtn: {
        flex: 2,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#0d9488",
        alignItems: "center",
    },
    saveText: { color: "#fff", fontWeight: "700" },
});