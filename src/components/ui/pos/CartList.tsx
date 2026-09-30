import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import type { CartItem } from "../../../db/sales";

type Props = {
    items: CartItem[];
    onChangeQty: (medicineId: number, delta: number) => void;
    onSetQty: (medicineId: number, qty: number) => void;
    onRemove: (medicineId: number) => void;
};

export default function CartList({
    items,
    onChangeQty,
    onSetQty,
    onRemove,
}: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [tempQty, setTempQty] = useState("");

    // ============================
    // Edit mode
    // ============================
    const startEdit = (item: CartItem) => {
        setEditingId(item.medicineId);
        setTempQty(String(item.qty));
    };

    const commitEdit = (item: CartItem) => {
        const qty = parseInt(tempQty);

        if (isNaN(qty) || qty <= 0) {
            Alert.alert("ত্রুটি", "সঠিক পরিমাণ দিন (০ এর বেশি)");
            setEditingId(null);
            setTempQty("");
            return;
        }

        onSetQty(item.medicineId, qty);
        setEditingId(null);
        setTempQty("");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setTempQty("");
    };

    if (items.length === 0) {
        return (
            <View style={styles.empty}>
                <Ionicons name="cart-outline" size={54} color="#d1d5db" />
                <Text style={styles.emptyText}>কার্ট খালি</Text>
                <Text style={styles.emptySub}>ঔষধ সার্চ করে যোগ করুন</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={items}
            keyExtractor={(i) => String(i.medicineId)}
            renderItem={({ item }) => {
                const isEditing = editingId === item.medicineId;

                return (
                    <View style={styles.row}>
                        {/* Left: name + price */}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name} numberOfLines={2}>
                                {item.name}
                            </Text>
                            <Text style={styles.sub}>
                                ৳ {item.price} × {item.qty} {item.unit}
                            </Text>
                        </View>

                        {/* Middle: qty controls */}
                        <View style={styles.qtyBox}>
                            {isEditing ? (
                                // Edit mode — input + ok
                                <>
                                    <TextInput
                                        style={styles.qtyInput}
                                        value={tempQty}
                                        onChangeText={setTempQty}
                                        keyboardType="numeric"
                                        autoFocus
                                        selectTextOnFocus
                                        onSubmitEditing={() => commitEdit(item)}
                                        returnKeyType="done"
                                        maxLength={5}
                                    />
                                    <TouchableOpacity
                                        style={styles.commitBtn}
                                        onPress={() => commitEdit(item)}
                                    >
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={cancelEdit}
                                    >
                                        <Ionicons name="close" size={16} color="#6b7280" />
                                    </TouchableOpacity>
                                </>
                            ) : (
                                // Normal mode — - / qty / +
                                <>
                                    <TouchableOpacity
                                        style={styles.qtyBtn}
                                        onPress={() => onChangeQty(item.medicineId, -1)}
                                    >
                                        <Ionicons name="remove" size={16} color="#0d9488" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.qtyTextBtn}
                                        onPress={() => startEdit(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.qtyText}>{item.qty}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.qtyBtn}
                                        onPress={() => onChangeQty(item.medicineId, 1)}
                                    >
                                        <Ionicons name="add" size={16} color="#0d9488" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* Subtotal */}
                        <Text style={styles.subtotal}>
                            ৳ {(item.price * item.qty).toFixed(0)}
                        </Text>

                        {/* Delete */}
                        <TouchableOpacity
                            style={styles.delBtn}
                            onPress={() => onRemove(item.medicineId)}
                        >
                            <Ionicons name="close" size={18} color="#dc2626" />
                        </TouchableOpacity>
                    </View>
                );
            }}
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        />
    );
}

const styles = StyleSheet.create({
    empty: { alignItems: "center", paddingVertical: 50 },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
    },
    emptySub: { marginTop: 4, fontSize: 12, color: "#9ca3af" },

    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    name: { fontSize: 14, fontWeight: "700", color: "#111827" },
    sub: { fontSize: 11, color: "#6b7280", marginTop: 2 },

    // Qty controls
    qtyBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        borderRadius: 8,
        paddingHorizontal: 4,
        marginRight: 8,
        minHeight: 36,
    },
    qtyBtn: { padding: 6 },
    qtyTextBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 42,
        alignItems: "center",
    },
    qtyText: {
        fontSize: 15,
        fontWeight: "800",
        color: "#111827",
    },

    // Edit mode
    qtyInput: {
        backgroundColor: "#fff",
        borderWidth: 2,
        borderColor: "#0d9488",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 14,
        fontWeight: "700",
        color: "#111827",
        minWidth: 55,
        textAlign: "center",
    },
    commitBtn: {
        backgroundColor: "#0d9488",
        padding: 6,
        borderRadius: 6,
        marginLeft: 4,
    },
    cancelBtn: {
        backgroundColor: "#f3f4f6",
        padding: 6,
        borderRadius: 6,
        marginLeft: 4,
    },

    subtotal: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0d9488",
        minWidth: 60,
        textAlign: "right",
    },
    delBtn: { padding: 6, marginLeft: 4 },
});