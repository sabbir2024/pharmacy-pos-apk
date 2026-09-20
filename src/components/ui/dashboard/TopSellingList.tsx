import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { TopSelling } from "../../../db/dashboard";
import { formatTk } from "../../../utils/format";

type Props = {
    items: TopSelling[];
};

export default function TopSellingList({ items }: Props) {
    if (items.length === 0) {
        return (
            <View style={styles.empty}>
                <Ionicons name="analytics-outline" size={22} color="#9ca3af" />
                <Text style={styles.emptyText}>এই মাসে এখনো কোনো বিক্রয় নেই</Text>
            </View>
        );
    }

    return (
        <View>
            {items.map((item, idx) => (
                <View key={item.name} style={styles.row}>
                    <View style={styles.rank}>
                        <Text style={styles.rankText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={styles.qty}>{item.totalQty} পিস</Text>
                    </View>
                    <Text style={styles.amount}>{formatTk(item.totalAmount)}</Text>
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
        gap: 10,
    },
    rank: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "#f0fdfa",
        alignItems: "center",
        justifyContent: "center",
    },
    rankText: { fontSize: 12, fontWeight: "800", color: "#0d9488" },
    name: { fontSize: 13, fontWeight: "700", color: "#111827" },
    qty: { fontSize: 11, color: "#6b7280", marginTop: 2 },
    amount: { fontSize: 13, fontWeight: "800", color: "#0d9488" },
    empty: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 20,
    },
    emptyText: { fontSize: 13, color: "#9ca3af" },
});