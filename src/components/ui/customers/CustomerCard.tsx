import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Customer } from "../../../db/customers";
import { formatTk } from "../../../utils/format";

type Props = {
    customer: Customer;
    onView: (c: Customer) => void;
    onPay: (c: Customer) => void;
    onDelete: (id: number) => void;
};

export default function CustomerCard({
    customer,
    onView,
    onPay,
    onDelete,
}: Props) {
    const hasDue = customer.totalDue > 0;

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => onView(customer)}
        >
            <View style={{ flex: 1 }}>
                <Text style={styles.name}>{customer.name}</Text>
                {!!customer.phone && (
                    <Text style={styles.phone}>📞 {customer.phone}</Text>
                )}
                {!!customer.address && (
                    <Text style={styles.addr}>📍 {customer.address}</Text>
                )}

                <View style={styles.dueRow}>
                    <Text style={styles.dueLabel}>মোট বাকি:</Text>
                    <Text
                        style={[
                            styles.dueValue,
                            { color: hasDue ? "#dc2626" : "#16a34a" },
                        ]}
                    >
                        {formatTk(customer.totalDue)}
                    </Text>
                </View>
            </View>

            <View style={styles.actions}>
                {hasDue && (
                    <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: "#dcfce7" }]}
                        onPress={() => onPay(customer)}
                    >
                        <Ionicons name="cash-outline" size={20} color="#16a34a" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => customer.id && onDelete(customer.id)}
                >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    name: { fontSize: 16, fontWeight: "700", color: "#111827" },
    phone: { fontSize: 12, color: "#6b7280", marginTop: 3 },
    addr: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    dueRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
    dueLabel: { fontSize: 12, color: "#6b7280" },
    dueValue: { fontSize: 15, fontWeight: "800" },
    actions: { justifyContent: "center", gap: 8, marginLeft: 8 },
    iconBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#f9fafb",
    },
});