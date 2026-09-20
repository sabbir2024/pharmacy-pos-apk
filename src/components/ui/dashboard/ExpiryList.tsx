import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { StockItem } from "../../../db/dashboard";
import { formatDate } from "../../../utils/format";

type Props = {
    items: StockItem[];
};

function dayDiff(date: string): number {
    const d = new Date(date).getTime();
    const now = Date.now();
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

export default function ExpiryList({ items }: Props) {
    if (items.length === 0) {
        return (
            <View style={styles.empty}>
                <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
                <Text style={styles.emptyText}>কোনো ঔষধ শীঘ্রই এক্সপায়ার হবে না</Text>
            </View>
        );
    }

    return (
        <View>
            {items.slice(0, 5).map((item) => {
                const diff = dayDiff(item.expiry);
                const expired = diff < 0;
                const soon = diff >= 0 && diff <= 30;

                return (
                    <View key={item.id} style={styles.row}>
                        <View
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: expired
                                        ? "#dc2626"
                                        : soon
                                            ? "#f97316"
                                            : "#f59e0b",
                                },
                            ]}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={styles.company}>
                                {formatDate(item.expiry)}
                                {expired
                                    ? " (এক্সপায়ার্ড)"
                                    : soon
                                        ? ` (${diff} দিন বাকি)`
                                        : ""}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.badge,
                                expired
                                    ? styles.badgeRed
                                    : soon
                                        ? styles.badgeOrange
                                        : styles.badgeYellow,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.badgeText,
                                    expired
                                        ? { color: "#991b1b" }
                                        : soon
                                            ? { color: "#9a3412" }
                                            : { color: "#92400e" },
                                ]}
                            >
                                {item.stock} {item.unit}
                            </Text>
                        </View>
                    </View>
                );
            })}
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
    badgeOrange: { backgroundColor: "#ffedd5" },
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