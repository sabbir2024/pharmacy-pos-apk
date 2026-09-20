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

    const load = () => setCustomers(getAllCustomers());

    useFocusEffect(
        React.useCallback(() => {
            load();
        }, [])
    );

    const totalDue = customers.reduce((s, c) => s + c.totalDue, 0);

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

    const handlePay = () => {
        if (!selected) return;
        const amt = parseFloat(payAmount);
        if (!amt || amt <= 0) {
            Alert.alert("ত্রুটি", "সঠিক পরিমাণ দিন");
            return;
        }
        if (amt > selected.totalDue) {
            Alert.alert("ত্রুটি", "বাকির চেয়ে বেশি দিতে পারবেন না");
            return;
        }
        payDue(selected.id!, amt, "ক্যাশ পেমেন্ট");
        setPayModal(false);
        setSelected(null);
        setPayAmount("");
        load();
    };

    const handleAddNew = () => {
        if (!newName.trim()) {
            Alert.alert("ত্রুটি", "নাম দিন");
            return;
        }
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
    };

    return (
        <View style={styles.container}>
            <View style={styles.summary}>
                <Text style={styles.sumLabel}>মোট বাকি</Text>
                <Text style={styles.sumValue}>{formatTk(totalDue)}</Text>
            </View>

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

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setAddModal(true)}
            >
                <Ionicons name="person-add" size={26} color="#fff" />
            </TouchableOpacity>

            {/* পে মডাল */}
            <Modal visible={payModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>পেমেন্ট নিন</Text>
                        <Text style={styles.modalSub}>{selected?.name}</Text>
                        <Text style={styles.modalDue}>
                            বাকি: {formatTk(selected?.totalDue ?? 0)}
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={payAmount}
                            onChangeText={setPayAmount}
                            keyboardType="numeric"
                            placeholder="টাকার পরিমাণ"
                            placeholderTextColor="#9ca3af"
                        />
                        <View style={styles.row}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setPayModal(false)}
                            >
                                <Text style={styles.cancelText}>বাতিল</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handlePay}>
                                <Text style={styles.saveText}>নিন</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* নতুন কাস্টমার মডাল */}
            <Modal visible={addModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>নতুন কাস্টমার</Text>
                        <TextInput
                            style={styles.input}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="নাম *"
                            placeholderTextColor="#9ca3af"
                        />
                        <TextInput
                            style={styles.input}
                            value={newPhone}
                            onChangeText={setNewPhone}
                            keyboardType="phone-pad"
                            placeholder="ফোন"
                            placeholderTextColor="#9ca3af"
                        />
                        <TextInput
                            style={styles.input}
                            value={newAddress}
                            onChangeText={setNewAddress}
                            placeholder="ঠিকানা"
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

            {/* লেজার মডাল */}
            <CustomerLedger
                visible={ledgerOpen}
                customer={ledgerCustomer}
                onClose={() => {
                    setLedgerOpen(false);
                    setLedgerCustomer(null);
                    load();
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        padding: 20,
    },
    modalBox: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0d9488",
        marginBottom: 8,
    },
    modalSub: { fontSize: 14, color: "#374151" },
    modalDue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#d97706",
        marginBottom: 10,
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
        marginBottom: 10,
    },
    row: { flexDirection: "row", gap: 8, marginTop: 6 },
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