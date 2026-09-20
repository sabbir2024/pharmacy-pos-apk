import { StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
    subtotal: number;         // 👈 এটা থাকতে হবে
    discount: number;
    vat: number;
    onChangeDiscount: (n: number) => void;
    onChangeVat: (n: number) => void;
};

export default function BillSummary({
    subtotal,
    discount,
    vat,
    onChangeDiscount,
    onChangeVat,
}: Props) {
    const total = subtotal - discount + vat;

    return (
        <View style={styles.box}>
            <Row label="সাবটোটাল" value={`৳ ${subtotal.toFixed(0)}`} />

            <View style={styles.editRow}>
                <Text style={styles.editLabel}>ডিসকাউন্ট (৳)</Text>
                <TextInput
                    style={styles.editInput}
                    value={String(discount)}
                    keyboardType="numeric"
                    onChangeText={(t) => onChangeDiscount(parseFloat(t) || 0)}
                />
            </View>

            <View style={styles.editRow}>
                <Text style={styles.editLabel}>VAT (৳)</Text>
                <TextInput
                    style={styles.editInput}
                    value={String(vat)}
                    keyboardType="numeric"
                    onChangeText={(t) => onChangeVat(parseFloat(t) || 0)}
                />
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>মোট</Text>
                <Text style={styles.totalValue}>৳ {total.toFixed(0)}</Text>
            </View>
        </View>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        marginTop: 10,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    label: { fontSize: 13, color: "#6b7280" },
    value: { fontSize: 13, fontWeight: "600", color: "#111827" },
    editRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    editLabel: { fontSize: 13, color: "#6b7280" },
    editInput: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        width: 90,
        textAlign: "right",
        fontSize: 13,
        color: "#111827",
        backgroundColor: "#f9fafb",
    },
    divider: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginVertical: 8,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
    totalValue: { fontSize: 20, fontWeight: "800", color: "#0d9488" },
});