import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { RangeSummary } from "../../../db/dashboard";
import { formatTk } from "../../../utils/format";

type Props = {
    summary: RangeSummary;
};

export default function SalesSummary({ summary }: Props) {
    const cards = [
        {
            label: "মোট বিক্রয়",
            value: formatTk(summary.totalSales),
            icon: "cash-outline",
            color: "#0d9488",
            bg: "#f0fdfa",
        },
        {
            label: "মোট বিল",
            value: `${summary.totalBills}টি`,
            icon: "receipt-outline",
            color: "#3b82f6",
            bg: "#dbeafe",
        },
        {
            label: "মোট লাভ",
            value: formatTk(summary.totalProfit),
            icon: "trending-up-outline",
            color: "#16a34a",
            bg: "#dcfce7",
        },
        {
            label: "মোট বাকি",
            value: formatTk(summary.totalDue),
            icon: "alert-circle-outline",
            color: "#d97706",
            bg: "#fef3c7",
        },
    ];

    return (
        <View style={styles.wrap}>
            <View style={styles.grid}>
                {cards.map((c) => (
                    <View key={c.label} style={styles.card}>
                        <View style={[styles.iconBox, { backgroundColor: c.bg }]}>
                            <Ionicons name={c.icon as any} size={18} color={c.color} />
                        </View>
                        <Text style={styles.label}>{c.label}</Text>
                        <Text style={[styles.value, { color: c.color }]}>{c.value}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.avgBox}>
                <Ionicons name="analytics-outline" size={16} color="#8b5cf6" />
                <Text style={styles.avgLabel}>প্রতি বিলের গড়</Text>
                <Text style={styles.avgValue}>{formatTk(summary.avgBill)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 10 },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    card: {
        flex: 1,
        minWidth: "47%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    label: { fontSize: 11, color: "#6b7280" },
    value: { fontSize: 15, fontWeight: "800", marginTop: 2 },
    avgBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#faf5ff",
        padding: 10,
        borderRadius: 10,
    },
    avgLabel: { fontSize: 12, color: "#6b21a8", flex: 1 },
    avgValue: { fontSize: 14, fontWeight: "800", color: "#8b5cf6" },
});