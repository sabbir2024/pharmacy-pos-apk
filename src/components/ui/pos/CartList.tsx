import { Ionicons } from "@expo/vector-icons";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { CartItem } from "../../../db/sales";

type Props = {
    items: CartItem[];
    onChangeQty: (medicineId: number, delta: number) => void;
    onRemove: (medicineId: number) => void;
};

export default function CartList({ items, onChangeQty, onRemove }: Props) {
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
            renderItem={({ item }) => (
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.sub}>
                            ৳ {item.price} × {item.qty} {item.unit}
                        </Text>
                    </View>

                    <View style={styles.qtyBox}>
                        <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => onChangeQty(item.medicineId, -1)}
                        >
                            <Ionicons name="remove" size={16} color="#0d9488" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.qty}</Text>
                        <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => onChangeQty(item.medicineId, 1)}
                        >
                            <Ionicons name="add" size={16} color="#0d9488" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtotal}>
                        ৳ {(item.price * item.qty).toFixed(0)}
                    </Text>

                    <TouchableOpacity
                        style={styles.delBtn}
                        onPress={() => onRemove(item.medicineId)}
                    >
                        <Ionicons name="close" size={18} color="#dc2626" />
                    </TouchableOpacity>
                </View>
            )}
            contentContainerStyle={{ paddingBottom: 8 }}
        />
    );
}

const styles = StyleSheet.create({
    empty: { alignItems: "center", paddingVertical: 50 },
    emptyText: { marginTop: 10, fontSize: 16, fontWeight: "600", color: "#374151" },
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
    qtyBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        borderRadius: 8,
        paddingHorizontal: 4,
        marginRight: 8,
    },
    qtyBtn: { padding: 6 },
    qtyText: { fontSize: 14, fontWeight: "700", paddingHorizontal: 6, color: "#111827" },
    subtotal: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0d9488",
        minWidth: 60,
        textAlign: "right",
    },
    delBtn: { padding: 6, marginLeft: 4 },
});