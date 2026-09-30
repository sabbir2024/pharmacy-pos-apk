import {
    CustomerLedger,
    CustomerList,
    OpeningBalanceModal,
} from "@/components/ui/customers";
import {
    addCustomer,
    deleteCustomer,
    getAllCustomers,
    payDue,
    updateCustomer,
    type Customer,
} from "@/db/customers";
import { formatTk } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useMemo, useState } from "react";
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

type TabKey = "all" | "due" | "paid";

export default function DueCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<TabKey>("all"); // 🆕

    const [payModal, setPayModal] = useState(false);
    const [addModal, setAddModal] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [openingModal, setOpeningModal] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);

    const [selected, setSelected] = useState<Customer | null>(null);
    const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
    const [payAmount, setPayAmount] = useState("");

    const [formName, setFormName] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formAddress, setFormAddress] = useState("");
    const [saving, setSaving] = useState(false);

    // ============================
    // Load
    // ============================
    const load = () => {
        try {
            setCustomers(getAllCustomers());
        } catch (e) {
            console.error(e);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            load();
        }, [])
    );

    // ============================
    // 🆕 Counts
    // ============================
    const counts = useMemo(() => {
        const all = customers.length;
        const due = customers.filter((c) => c.totalDue > 0).length;
        const paid = customers.filter((c) => c.totalDue <= 0).length;
        return { all, due, paid };
    }, [customers]);

    const totalDue = customers.reduce((s, c) => s + c.totalDue, 0);

    // ============================
    // 🆕 Tab + Search filter
    // ============================
    const filtered = useMemo(() => {
        // Step 1: Tab filter
        let list = customers;
        if (tab === "due") {
            list = list.filter((c) => c.totalDue > 0);
        } else if (tab === "paid") {
            list = list.filter((c) => c.totalDue <= 0);
        }

        // Step 2: Search filter
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            list = list.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    c.phone?.includes(q) ||
                    c.address?.toLowerCase().includes(q)
            );
        }

        return list;
    }, [customers, search, tab]);

    // ============================
    // Delete
    // ============================
    const handleDelete = (id: number) => {
        Alert.alert("ডিলিট", "কাস্টমার মুছে ফেলবেন?", [
            { text: "না", style: "cancel" },
            {
                text: "হ্যাঁ",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteCustomer(id);
                        load();
                    } catch (e: any) {
                        Alert.alert("ত্রুটি", e?.message);
                    }
                },
            },
        ]);
    };

    // ============================
    // Payment
    // ============================
    const handlePay = async () => {
        if (!selected) return;

        const amt = parseFloat(payAmount);
        if (!amt || amt <= 0) {
            Alert.alert("ত্রুটি", "সঠিক পরিমাণ দিন");
            return;
        }
        if (amt > selected.totalDue) {
            Alert.alert(
                "ত্রুটি",
                `বাকির চেয়ে বেশি দিতে পারবেন না। বাকি: ${formatTk(
                    selected.totalDue
                )}`
            );
            return;
        }

        try {
            await payDue(selected.id!, amt, "ক্যাশ পেমেন্ট");
            load();
            setPayModal(false);
            setSelected(null);
            setPayAmount("");
            Alert.alert("✅ সফল", `${formatTk(amt)} জমা নেওয়া হয়েছে`);
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message);
        }
    };

    // ============================
    // Add
    // ============================
    const openAddModal = () => {
        setFormName("");
        setFormPhone("");
        setFormAddress("");
        setAddModal(true);
    };

    const handleAdd = async () => {
        if (!formName.trim()) {
            Alert.alert("ত্রুটি", "নাম দিন");
            return;
        }

        try {
            setSaving(true);
            await addCustomer({
                name: formName.trim(),
                phone: formPhone.trim(),
                address: formAddress.trim(),
                totalDue: 0,
            });
            setAddModal(false);
            load();
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message || "সেভ করা যায়নি");
        } finally {
            setSaving(false);
        }
    };

    // ============================
    // Edit
    // ============================
    const openEditModal = (customer: Customer) => {
        setSelected(customer);
        setFormName(customer.name);
        setFormPhone(customer.phone || "");
        setFormAddress(customer.address || "");
        setEditModal(true);
    };

    const handleEditSave = async () => {
        if (!selected) return;
        if (!formName.trim()) {
            Alert.alert("ত্রুটি", "নাম দিন");
            return;
        }

        try {
            setSaving(true);
            await updateCustomer({
                id: selected.id,
                name: formName.trim(),
                phone: formPhone.trim(),
                address: formAddress.trim(),
                totalDue: selected.totalDue,
            });
            setEditModal(false);
            setSelected(null);
            load();
            Alert.alert("✅ সফল", "কাস্টমার আপডেট হয়েছে");
        } catch (e: any) {
            Alert.alert("ত্রুটি", e?.message || "আপডেট করা যায়নি");
        } finally {
            setSaving(false);
        }
    };

    const openOpeningModal = () => {
        setEditModal(false);
        setOpeningModal(true);
    };

    // ============================
    // Tab config
    // ============================
    const tabs: { key: TabKey; label: string; count: number; color: string }[] = [
        { key: "all", label: "সব", count: counts.all, color: "#0d9488" },
        { key: "due", label: "বাকি আছে", count: counts.due, color: "#d97706" },
        { key: "paid", label: "পরিশোধিত", count: counts.paid, color: "#16a34a" },
    ];

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
                            {counts.all} কাস্টমার
                        </Text>
                    </View>
                </View>
            </View>

            {/* 🆕 Tabs */}
            <View style={styles.tabBar}>
                {tabs.map((t) => {
                    const active = tab === t.key;
                    return (
                        <TouchableOpacity
                            key={t.key}
                            style={[
                                styles.tabBtn,
                                active && { backgroundColor: t.color },
                            ]}
                            onPress={() => setTab(t.key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    active && styles.tabTextActive,
                                ]}
                            >
                                {t.label}
                            </Text>
                            <View
                                style={[
                                    styles.tabBadge,
                                    active
                                        ? { backgroundColor: "rgba(255,255,255,0.25)" }
                                        : { backgroundColor: "#f3f4f6" },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.tabBadgeText,
                                        active && { color: "#fff" },
                                    ]}
                                >
                                    {t.count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Search Bar */}
            <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#9ca3af" />
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="নাম / ফোন / ঠিকানা..."
                    placeholderTextColor="#9ca3af"
                />
                {search.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSearch("")}
                        style={styles.clearIcon}
                    >
                        <Ionicons name="close-circle" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Result count */}
            {(search.trim().length > 0 || tab !== "all") && (
                <View style={styles.resultInfo}>
                    <Text style={styles.resultText}>
                        {filtered.length}টি কাস্টমার পাওয়া গেছে
                    </Text>
                </View>
            )}

            {/* List */}
            <CustomerList
                customers={filtered}
                onView={(c) => {
                    setLedgerCustomer(c);
                    setLedgerOpen(true);
                }}
                onEdit={openEditModal}
                onPay={(c) => {
                    setSelected(c);
                    setPayAmount(String(c.totalDue));
                    setPayModal(true);
                }}
                onDelete={handleDelete}
            />

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={openAddModal}>
                <Ionicons name="person-add" size={26} color="#fff" />
            </TouchableOpacity>

            {/* Pay Modal */}
            <Modal visible={payModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
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

                        {selected && (
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
                </KeyboardAvoidingView>
            </Modal>

            {/* Add Modal */}
            <Modal visible={addModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>নতুন কাস্টমার</Text>
                            <TouchableOpacity onPress={() => setAddModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={styles.label}>নাম *</Text>
                            <TextInput
                                style={styles.input}
                                value={formName}
                                onChangeText={setFormName}
                                placeholder="কাস্টমারের নাম"
                                placeholderTextColor="#9ca3af"
                                autoFocus
                            />

                            <Text style={styles.label}>ফোন</Text>
                            <TextInput
                                style={styles.input}
                                value={formPhone}
                                onChangeText={setFormPhone}
                                keyboardType="phone-pad"
                                placeholder="01XXXXXXXXX"
                                placeholderTextColor="#9ca3af"
                            />

                            <Text style={styles.label}>ঠিকানা</Text>
                            <TextInput
                                style={styles.input}
                                value={formAddress}
                                onChangeText={setFormAddress}
                                placeholder="গ্রাম / শহর"
                                placeholderTextColor="#9ca3af"
                            />

                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setAddModal(false)}
                                    disabled={saving}
                                >
                                    <Text style={styles.cancelText}>বাতিল</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                                    onPress={handleAdd}
                                    disabled={saving}
                                >
                                    <Text style={styles.saveText}>
                                        {saving ? "সেভ হচ্ছে..." : "সেভ"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Edit Modal */}
            <Modal visible={editModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>কাস্টমার এডিট</Text>
                            <TouchableOpacity onPress={() => setEditModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={styles.label}>নাম *</Text>
                            <TextInput
                                style={styles.input}
                                value={formName}
                                onChangeText={setFormName}
                                placeholder="কাস্টমারের নাম"
                                placeholderTextColor="#9ca3af"
                                autoFocus
                            />

                            <Text style={styles.label}>ফোন</Text>
                            <TextInput
                                style={styles.input}
                                value={formPhone}
                                onChangeText={setFormPhone}
                                keyboardType="phone-pad"
                                placeholder="01XXXXXXXXX"
                                placeholderTextColor="#9ca3af"
                            />

                            <Text style={styles.label}>ঠিকানা</Text>
                            <TextInput
                                style={styles.input}
                                value={formAddress}
                                onChangeText={setFormAddress}
                                placeholder="গ্রাম / শহর"
                                placeholderTextColor="#9ca3af"
                            />

                            {selected && (
                                <View style={styles.dueInfoBox}>
                                    <Ionicons
                                        name="information-circle-outline"
                                        size={16}
                                        color="#d97706"
                                    />
                                    <Text style={styles.dueInfoText}>
                                        বর্তমান বাকি: {formatTk(selected.totalDue)} (পরিবর্তন হবে
                                        না)
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.openingBtn}
                                onPress={openOpeningModal}
                            >
                                <Ionicons name="flag-outline" size={18} color="#3b82f6" />
                                <Text style={styles.openingBtnText}>
                                    পুরনো বাকি সেট করুন
                                </Text>
                                {selected?.openingBalance ? (
                                    <Text style={styles.openingAmount}>
                                        {formatTk(selected.openingBalance)}
                                    </Text>
                                ) : null}
                            </TouchableOpacity>

                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setEditModal(false)}
                                    disabled={saving}
                                >
                                    <Text style={styles.cancelText}>বাতিল</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                                    onPress={handleEditSave}
                                    disabled={saving}
                                >
                                    <Text style={styles.saveText}>
                                        {saving ? "সেভ হচ্ছে..." : "আপডেট"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Opening Balance Modal */}
            <OpeningBalanceModal
                visible={openingModal}
                customer={selected}
                onClose={() => {
                    setOpeningModal(false);
                    setSelected(null);
                }}
                onSuccess={load}
            />

            {/* Ledger */}
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
    summaryRight: { flexDirection: "row", gap: 6 },
    summaryChip: {
        backgroundColor: "#fff",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    summaryChipText: {
        fontSize: 10,
        color: "#92400e",
        fontWeight: "700",
    },

    // 🆕 Tab styles
    tabBar: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginBottom: 10,
        gap: 4,
    },
    tabBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: "#f9fafb",
    },
    tabText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#6b7280",
    },
    tabTextActive: {
        color: "#fff",
    },
    tabBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
        minWidth: 22,
        alignItems: "center",
    },
    tabBadgeText: {
        fontSize: 11,
        fontWeight: "800",
        color: "#6b7280",
    },

    // Search
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginBottom: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 15,
        color: "#111827",
    },
    clearIcon: { padding: 4 },

    resultInfo: { marginBottom: 8 },
    resultText: {
        fontSize: 11,
        color: "#6b7280",
        fontStyle: "italic",
    },

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
        justifyContent: "flex-end",
    },
    modalBox: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#0d9488" },
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
    quickRow: { flexDirection: "row", gap: 6, marginTop: 10 },
    quickBtn: {
        flex: 1,
        paddingVertical: 8,
        backgroundColor: "#f3f4f6",
        borderRadius: 8,
        alignItems: "center",
    },
    quickText: { fontSize: 12, fontWeight: "700", color: "#374151" },
    row: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 8 },
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
    dueInfoBox: {
        flexDirection: "row",
        gap: 6,
        backgroundColor: "#fef3c7",
        padding: 10,
        borderRadius: 10,
        marginTop: 12,
        alignItems: "center",
    },
    dueInfoText: {
        fontSize: 11,
        color: "#92400e",
        fontWeight: "600",
        flex: 1,
    },
    openingBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: "#eff6ff",
        borderWidth: 1,
        borderColor: "#bfdbfe",
        marginTop: 12,
    },
    openingBtnText: {
        flex: 1,
        color: "#3b82f6",
        fontWeight: "700",
        fontSize: 13,
    },
    openingAmount: {
        color: "#3b82f6",
        fontWeight: "800",
        fontSize: 14,
    },
});