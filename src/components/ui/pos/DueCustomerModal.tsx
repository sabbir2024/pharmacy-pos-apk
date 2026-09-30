import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    addCustomer,
    getAllCustomers,
    type Customer,
} from "../../../db/customers";

type Props = {
    visible: boolean;
    dueAmount: number;
    onClose: () => void;
    onConfirm: (customerId: number) => void;
};

export default function DueCustomerModal({
    visible,
    dueAmount,
    onClose,
    onConfirm,
}: Props) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    // ============================
    // Load customers when modal opens
    // ============================
    useEffect(() => {
        if (visible) {
            try {
                setCustomers(getAllCustomers());
            } catch (e) {
                console.error("Load customers error:", e);
            }
            setShowAddForm(false);
            setSearch("");
            setName("");
            setPhone("");
            setAddress("");
        }
    }, [visible]);

    const filtered = customers.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.phone?.includes(search)
    );

    // ============================
    // ✅ Add new customer (async)
    // ============================
    const handleAddNew = async () => {
        if (!name.trim()) {
            Alert.alert("ত্রুটি", "নাম অবশ্যই দিতে হবে");
            return;
        }

        try {
            setSaving(true);
            const id = await addCustomer({
                name: name.trim(),
                phone: phone.trim(),
                address: address.trim(),
                totalDue: 0,
            });

            console.log("✅ New customer added:", id, name);

            // Reset
            setName("");
            setPhone("");
            setAddress("");
            setShowAddForm(false);

            // Callback
            onConfirm(id);
        } catch (e: any) {
            console.error("❌ addCustomer error:", e);
            Alert.alert("ত্রুটি", e?.message || "কাস্টমার যোগ করা যায়নি");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>বাকি কাস্টমার</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {/* Due banner */}
                    <View style={styles.dueBanner}>
                        <Text style={styles.dueLabel}>বাকি থাকবে</Text>
                        <Text style={styles.dueValue}>৳ {dueAmount.toFixed(0)}</Text>
                    </View>

                    {!showAddForm ? (
                        <>
                            {/* Search */}
                            <View style={styles.searchBox}>
                                <Ionicons name="search" size={18} color="#9ca3af" />
                                <TextInput
                                    style={styles.searchInput}
                                    value={search}
                                    onChangeText={setSearch}
                                    placeholder="নাম / ফোন..."
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {/* List */}
                            <FlatList
                                data={filtered}
                                keyExtractor={(i) => String(i.id)}
                                keyboardShouldPersistTaps="handled"
                                style={{ maxHeight: 300 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.custItem}
                                        onPress={() => onConfirm(item.id!)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.custName}>{item.name}</Text>
                                            {!!item.phone && (
                                                <Text style={styles.custPhone}>📞 {item.phone}</Text>
                                            )}
                                            {item.totalDue > 0 && (
                                                <Text style={styles.custDue}>
                                                    আগের বাকি: ৳ {item.totalDue.toFixed(0)}
                                                </Text>
                                            )}
                                        </View>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={20}
                                            color="#9ca3af"
                                        />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.empty}>কোনো কাস্টমার নেই</Text>
                                }
                            />

                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={() => setShowAddForm(true)}
                            >
                                <Ionicons name="person-add-outline" size={20} color="#fff" />
                                <Text style={styles.addBtnText}>নতুন কাস্টমার অ্যাড</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>নাম *</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="কাস্টমারের নাম"
                                placeholderTextColor="#9ca3af"
                                autoFocus
                            />

                            <Text style={styles.label}>ফোন</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                placeholder="01XXXXXXXXX"
                                placeholderTextColor="#9ca3af"
                            />

                            <Text style={styles.label}>ঠিকানা</Text>
                            <TextInput
                                style={styles.input}
                                value={address}
                                onChangeText={setAddress}
                                placeholder="গ্রাম / শহর"
                                placeholderTextColor="#9ca3af"
                            />

                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setShowAddForm(false)}
                                    disabled={saving}
                                >
                                    <Text style={styles.cancelText}>বাতিল</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                                    onPress={handleAddNew}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.saveText}>সেভ ও কনফার্ম</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "90%",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    title: { fontSize: 18, fontWeight: "bold", color: "#0d9488" },

    dueBanner: {
        backgroundColor: "#fef3c7",
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
        alignItems: "center",
    },
    dueLabel: { fontSize: 12, color: "#92400e" },
    dueValue: { fontSize: 22, fontWeight: "800", color: "#d97706" },

    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
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

    custItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    custName: { fontSize: 15, fontWeight: "700", color: "#111827" },
    custPhone: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    custDue: {
        fontSize: 12,
        color: "#d97706",
        marginTop: 2,
        fontWeight: "600",
    },

    empty: {
        padding: 20,
        textAlign: "center",
        color: "#9ca3af",
    },

    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#0d9488",
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 10,
    },
    addBtnText: { color: "#fff", fontWeight: "700" },

    label: {
        fontSize: 13,
        color: "#374151",
        fontWeight: "600",
        marginTop: 8,
        marginBottom: 4,
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

    row: {
        flexDirection: "row",
        gap: 8,
        marginTop: 16,
        marginBottom: 8,
    },
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
        justifyContent: "center",
    },
    saveText: { color: "#fff", fontWeight: "700" },
});