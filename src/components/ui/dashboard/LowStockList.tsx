import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { StockItem } from "../../../db/dashboard";

type Props = {
    items: StockItem[];
};

export default function LowStockList({ items }: Props) {
    if (items.length === 0) {
        return (
            <View style={styles.empty}>
                <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
                <Text style={styles.emptyText}>সব ঔষধ পর্যাপ্ত স্টকে আছে</Text>
            </View>
        );
    }

    return (
        <View>
            {items.slice(0, 5).map((item) => (
                <View key={item.id} style={styles.row}>
                    <View style={styles.dot} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={styles.company}>{item.company}</Text>
                    </View>
                    <View
                        style={[
                            styles.badge,
                            item.stock <= 0 ? styles.badgeRed : styles.badgeYellow,
                        ]}
                    >
                        <Text
                            style={[
                                styles.badgeText,
                                item.stock <= 0
                                    ? { color: "#991b1b" }
                                    : { color: "#92400e" },
                            ]}
                        >
                            {item.stock <= 0 ? "শেষ" : `${item.stock} ${item.unit}`}
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#f59e0b",
        marginRight: 10,
    },
    name: { fontSize: 13, fontWeight: "700", color: "#111827" },
    company: { fontSize: 11, color: "#6b7280", marginTop: 2 },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    badgeYellow: { backgroundColor: "#fef3c7" },
    badgeRed: { backgroundColor: "#fee2e2" },
    badgeText: { fontSize: 11, fontWeight: "700" },
    empty: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 20,
    },
    emptyText: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
});