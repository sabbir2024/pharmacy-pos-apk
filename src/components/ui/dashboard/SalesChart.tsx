import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import type { DayWiseSales } from "../../../db/dashboard";
import { formatTk } from "../../../utils/format";

type Props = {
    data: DayWiseSales[];
};

const screenWidth = Dimensions.get("window").width;

export default function SalesChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>এই সময়ে কোনো বিক্রয় নেই</Text>
            </View>
        );
    }

    const sliced = data.slice(-30);

    const labels = sliced.map((d) => {
        const dt = new Date(d.date);
        return `${dt.getDate()}/${dt.getMonth() + 1}`;
    });

    const values = sliced.map((d) => d.total);

    const maxVal = Math.max(...values);
    if (maxVal === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>এই সময়ে কোনো বিক্রয় নেই</Text>
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            <LineChart
                data={{
                    labels,
                    datasets: [{ data: values }],
                }}
                width={screenWidth - 60}
                height={220}
                yAxisLabel="৳"
                yAxisSuffix=""
                chartConfig={{
                    backgroundColor: "#fff",
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    style: { borderRadius: 12 },
                    propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#0d9488",
                    },
                    propsForBackgroundLines: {
                        strokeDasharray: "4 4",
                        stroke: "#f1f5f9",
                    },
                }}
                bezier
                style={styles.chart}
                fromZero
                withInnerLines
                withShadow={false}
                segments={4}
                formatYLabel={(v) => {
                    const n = Number(v);
                    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
                    return String(n);
                }}
            />

            <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>
                    {sliced.length} দিনে মোট
                </Text>
                <Text style={styles.totalValue}>
                    {formatTk(values.reduce((s, v) => s + v, 0))}
                </Text>
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
    chart: {
        borderRadius: 12,
        marginLeft: -10,
    },
    totalBox: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: { fontSize: 12, color: "#6b7280" },
    totalValue: { fontSize: 18, fontWeight: "800", color: "#0d9488" },
    empty: {
        padding: 40,
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    emptyText: { fontSize: 13, color: "#9ca3af" },
});