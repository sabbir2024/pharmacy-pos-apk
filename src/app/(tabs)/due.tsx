import {
    CustomerLedger,
    CustomerList,
} from "@/components/ui/customers";
import {
    addCustomer,
    deleteCustomer,
    getAllCustomers,
    payDue,
    type Customer,
} from "@/db/customers";
import { formatTk } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function DueCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [payModal, setPayModal] = useState(false);
    const [addModal, setAddModal] = useState(false);
    const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [selected, setSelected] = useState<Customer | null>(null);
    const [payAmount, setPayAmount] = useState("");

    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newAddress, setNewAddress] = useState("");

    // ============================
    // Load Customers
    // ============================
    const load = () => {
        try {
            const data = getAllCustomers();
            setCustomers(data);
        } catch (e) {
            console.error("Load customers error:", e);
        }
    };

    // ✅ প্রতি বার ফোকাস হলে রিফ্রেশ
    useFocusEffect(
        React.useCallback(() => {
            load();
        }, [])
    );

    const totalDue = customers.reduce((s, c) => s + c.totalDue, 0);

    // ============================
    // Delete
    // ============================
    const handleDelete = (id: number) => {
        Alert.alert("ডিলিট", "কাস্টমার মুছে ফেলবেন?", [
            { text: "না", style: "cancel" },
            {
                text: "হ্যাঁ",
                style: "destructive",
                onPress: () => {
                    deleteCustomer(id);
                    load();
                },
            },
        ]);
    };

    // ============================
    // ✅ Payment নেওয়া
    // ============================
    const handlePay = () => {
        if (!selected) return;

        const amt = parseFloat(payAmount);
        if (!amt || amt <= 0) {
            Alert.alert("ত্রুটি", "সঠিক পরিমাণ দিন");
            return;
        }
        if (amt > selected.totalDue) {
            Alert.alert(
                "ত্রুটি",
                `বাকির চেয়ে বেশি দিতে পারবেন না। বাকি: ৳${selected.totalDue}`
            );
            return;
        }

        try {
            payDue(selected.id!, amt, "ক্যাশ পেমেন্ট");

            // ✅ Customer list রিফ্রেশ
            load();

            // Modal বন্ধ
            setPayModal(false);
            setSelected(null);
            setPayAmount("");

            Alert.alert(
                "✅ সফল",
                `৳${amt} জমা নেওয়া হয়েছে\n\nবাকি: ৳${selected.totalDue - amt}`
            );
        } catch (e: any) {
            console.error("Payment error:", e);
            Alert.alert("ত্রুটি", e?.message || "পেমেন্ট নেওয়া যায়নি");
        }
    };

    // ============================
    // নতুন Customer
    // ============================
    const handleAddNew = () => {
        if (!newName.trim()) {
            Alert.alert("ত্রুটি", "নাম দিন");
            return;
        }
        try {
            addCustomer({
                name: newName.trim(),
                phone: newPhone.trim(),
                address: newAddress.trim(),
                totalDue: 0,
            });
            setAddModal(false);
            setNewName("");
            setNewPhone("");
            setNewAddress("");
            load();
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message || "সেভ করা যায়নি");
        }
    };

    return (
        <View style={styles.container}>
            {/* Summary */}
            <View style={styles.summary}>
                <View>
                    <Text style={styles.sumLabel}>মোট বাকি</Text>
                    <Text style={styles.sumValue}>{formatTk(totalDue)}</Text>
                </View>
                <View style={styles.summaryRight}>
                    <View style={styles.summaryChip}>
                        <Text style={styles.summaryChipText}>
                            {customers.length} কাস্টমার
                        </Text>
                    </View>
                    <View style={styles.summaryChip}>
                        <Text style={styles.summaryChipText}>
                            {customers.filter((c) => c.totalDue > 0).length} বাকি
                        </Text>
                    </View>
                </View>
            </View>

            {/* Customer List */}
            <CustomerList
                customers={customers}
                onView={(c) => {
                    setLedgerCustomer(c);
                    setLedgerOpen(true);
                }}
                onPay={(c) => {
                    setSelected(c);
                    setPayAmount(String(c.totalDue));
                    setPayModal(true);
                }}
                onDelete={handleDelete}
            />

            {/* FAB — Add Customer */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setAddModal(true)}
            >
                <Ionicons name="person-add" size={26} color="#fff" />
            </TouchableOpacity>

            {/* ============================ */}
            {/* Pay Modal */}
            {/* ============================ */}
            <Modal visible={payModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>পেমেন্ট নিন</Text>
                            <TouchableOpacity onPress={() => setPayModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSub}>{selected?.name}</Text>
                        <Text style={styles.modalDue}>
                            মোট বাকি: {formatTk(selected?.totalDue ?? 0)}
                        </Text>

                        <Text style={styles.label}>টাকার পরিমাণ</Text>
                        <TextInput
                            style={styles.input}
                            value={payAmount}
                            onChangeText={setPayAmount}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#9ca3af"
                        />

                        {/* Quick amounts */}
                        {selected && selected.totalDue > 0 && (
                            <View style={styles.quickRow}>
                                {[100, 500, 1000].map((amt) => (
                                    <TouchableOpacity
                                        key={amt}
                                        style={styles.quickBtn}
                                        onPress={() => setPayAmount(String(amt))}
                                    >
                                        <Text style={styles.quickText}>৳{amt}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={[styles.quickBtn, { backgroundColor: "#0d9488" }]}
                                    onPress={() => setPayAmount(String(selected.totalDue))}
                                >
                                    <Text style={[styles.quickText, { color: "#fff" }]}>
                                        সম্পূর্ণ
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Remaining preview */}
                        {selected && parseFloat(payAmount) > 0 && (
                            <View style={styles.previewBox}>
                                <Text style={styles.previewLabel}>জমার পর বাকি থাকবে:</Text>
                                <Text style={styles.previewValue}>
                                    {formatTk(
                                        Math.max(
                                            0,
                                            selected.totalDue - (parseFloat(payAmount) || 0)
                                        )
                                    )}
                                </Text>
                            </View>
                        )}

                        <View style={styles.row}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setPayModal(false)}
                            >
                                <Text style={styles.cancelText}>বাতিল</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handlePay}>
                                <Text style={styles.saveText}>জমা নিন</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ============================ */}
            {/* Add Customer Modal */}
            {/* ============================ */}
            <Modal visible={addModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>নতুন কাস্টমার</Text>
                            <TouchableOpacity onPress={() => setAddModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>নাম *</Text>
                        <TextInput
                            style={styles.input}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="কাস্টমারের নাম"
                            placeholderTextColor="#9ca3af"
                        />

                        <Text style={styles.label}>ফোন</Text>
                        <TextInput
                            style={styles.input}
                            value={newPhone}
                            onChangeText={setNewPhone}
                            keyboardType="phone-pad"
                            placeholder="01XXXXXXXXX"
                            placeholderTextColor="#9ca3af"
                        />

                        <Text style={styles.label}>ঠিকানা</Text>
                        <TextInput
                            style={styles.input}
                            value={newAddress}
                            onChangeText={setNewAddress}
                            placeholder="গ্রাম / শহর"
                            placeholderTextColor="#9ca3af"
                        />

                        <View style={styles.row}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setAddModal(false)}
                            >
                                <Text style={styles.cancelText}>বাতিল</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleAddNew}>
                                <Text style={styles.saveText}>সেভ</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ============================ */}
            {/* Ledger Modal */}
            {/* ============================ */}
            <CustomerLedger
                visible={ledgerOpen}
                customer={ledgerCustomer}
                onClose={() => {
                    setLedgerOpen(false);
                    setLedgerCustomer(null);
                    load(); // ✅ Refreshed when closed
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 14, backgroundColor: "#f9fafb" },

    summary: {
        backgroundColor: "#fef3c7",
        padding: 14,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sumLabel: { fontSize: 13, color: "#92400e", fontWeight: "600" },
    sumValue: { fontSize: 22, fontWeight: "800", color: "#d97706" },
    summaryRight: {
        flexDirection: "row",
        gap: 6,
    },
    summaryChip: {
        backgroundColor: "#fff",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    summaryChipText: { fontSize: 10, color: "#92400e", fontWeight: "700" },

    fab: {
        position: "absolute",
        right: 20,
        bottom: 24,
        backgroundColor: "#0d9488",
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
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
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0d9488",
    },
    modalSub: { fontSize: 14, color: "#374151", fontWeight: "600" },
    modalDue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#d97706",
        marginTop: 4,
        marginBottom: 14,
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
        paddingVertical: 10,
        fontSize: 15,
        backgroundColor: "#f9fafb",
        color: "#111827",
    },

    quickRow: {
        flexDirection: "row",
        gap: 6,
        marginTop: 10,
    },
    quickBtn: {
        flex: 1,
        paddingVertical: 8,
        backgroundColor: "#f3f4f6",
        borderRadius: 8,
        alignItems: "center",
    },
    quickText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#374151",
    },

    previewBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f0fdf4",
        padding: 12,
        borderRadius: 10,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    previewLabel: { fontSize: 12, color: "#166534" },
    previewValue: { fontSize: 16, fontWeight: "800", color: "#16a34a" },

    row: { flexDirection: "row", gap: 8, marginTop: 16 },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
    },
    cancelText: { color: "#374151", fontWeight: "700" },
    saveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#0d9488",
        alignItems: "center",
    },
    saveText: { color: "#fff", fontWeight: "700" },
});