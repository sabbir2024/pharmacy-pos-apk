import { useRef } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { formatTk } from "../../../utils/format";

type Props = {
    subtotal: number;
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
    const vatRef = useRef<TextInput>(null);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
            <View style={styles.box}>
                <Row label="সাবটোটাল" value={formatTk(subtotal)} />

                <View style={styles.editRow}>
                    <Text style={styles.editLabel}>ডিসকাউন্ট (৳)</Text>
                    <TextInput
                        style={styles.editInput}
                        value={discount === 0 ? "" : String(discount)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        onChangeText={(t) => onChangeDiscount(parseFloat(t) || 0)}
                        returnKeyType="next"
                        onSubmitEditing={() => vatRef.current?.focus()}
                    />
                </View>

                <View style={styles.editRow}>
                    <Text style={styles.editLabel}>VAT (৳)</Text>
                    <TextInput
                        ref={vatRef}
                        style={styles.editInput}
                        value={vat === 0 ? "" : String(vat)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        onChangeText={(t) => onChangeVat(parseFloat(t) || 0)}
                        returnKeyType="done"
                    />
                </View>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>মোট</Text>
                    <Text style={styles.totalValue}>{formatTk(total)}</Text>
                </View>
            </View>
        </KeyboardAvoidingView>
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