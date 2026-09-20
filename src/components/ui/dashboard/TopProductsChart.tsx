import { Dimensions, StyleSheet, Text, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import type { TopSelling } from "../../../db/dashboard";
import { formatTk } from "../../../utils/format";

type Props = {
    data: TopSelling[];
};

const screenWidth = Dimensions.get("window").width;

export default function TopProductsChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>কোনো বিক্রয় নেই</Text>
            </View>
        );
    }

    const top = data.slice(0, 5);
    const labels = top.map((t) =>
        t.name.length > 8 ? t.name.substring(0, 8) + "…" : t.name
    );
    const values = top.map((t) => t.totalQty);

    return (
        <View style={styles.wrap}>
            <Text style={styles.title}>টপ {top.length}টি ঔষধ (পরিমাণে)</Text>

            <BarChart
                data={{
                    labels,
                    datasets: [{ data: values }],
                }}
                width={screenWidth - 60}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                    backgroundColor: "#fff",
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    barPercentage: 0.7,
                    propsForBackgroundLines: {
                        strokeDasharray: "4 4",
                        stroke: "#f1f5f9",
                    },
                }}
                style={styles.chart}
                fromZero
                showValuesOnTopOfBars
                withInnerLines
            />

            <View style={styles.list}>
                {top.map((t, idx) => (
                    <View key={t.name} style={styles.row}>
                        <View style={styles.rank}>
                            <Text style={styles.rankText}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name} numberOfLines={1}>
                                {t.name}
                            </Text>
                            <Text style={styles.qty}>{t.totalQty} পিস</Text>
                        </View>
                        <Text style={styles.amount}>{formatTk(t.totalAmount)}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    title: {
        fontSize: 13,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 8,
    },
    chart: {
        borderRadius: 12,
        marginLeft: -10,
    },
    list: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        gap: 10,
    },
    rank: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#ede9fe",
        alignItems: "center",
        justifyContent: "center",
    },
    rankText: { fontSize: 11, fontWeight: "800", color: "#8b5cf6" },
    name: { fontSize: 13, fontWeight: "700", color: "#111827" },
    qty: { fontSize: 11, color: "#6b7280", marginTop: 2 },
    amount: { fontSize: 13, fontWeight: "800", color: "#8b5cf6" },
    empty: {
        padding: 30,
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    emptyText: { fontSize: 13, color: "#9ca3af" },
});