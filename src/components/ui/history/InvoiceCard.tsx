import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Invoice } from "../../../db/invoices";
import { formatDateTime, formatTk } from "../../../utils/format";

type Props = {
    invoice: Invoice;
    onPress: (inv: Invoice) => void;
};

export default function InvoiceCard({ invoice, onPress }: Props) {
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(invoice)}
            activeOpacity={0.7}
        >
            <View style={styles.iconWrap}>
                <Ionicons name="receipt-outline" size={22} color="#0d9488" />
            </View>

            <View style={{ flex: 1 }}>
                <View style={styles.topRow}>
                    <Text style={styles.invNo}>ইনভয়েস #{invoice.id}</Text>
                    {invoice.isDue ? (
                        <View style={styles.badgeDue}>
                            <Text style={styles.badgeDueText}>
                                বাকি {formatTk(invoice.dueAmount)}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.badgePaid}>
                            <Text style={styles.badgePaidText}>পরিশোধিত</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.date}>{formatDateTime(invoice.createdAt)}</Text>

                {invoice.customerName && (
                    <Text style={styles.customer}>👤 {invoice.customerName}</Text>
                )}
            </View>

            <View style={styles.amountWrap}>
                <Text style={styles.amount}>{formatTk(invoice.total)}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f0fdfa",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    invNo: { fontSize: 14, fontWeight: "700", color: "#111827" },
    badgeDue: {
        backgroundColor: "#fef3c7",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeDueText: { fontSize: 10, color: "#92400e", fontWeight: "700" },
    badgePaid: {
        backgroundColor: "#dcfce7",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgePaidText: { fontSize: 10, color: "#166534", fontWeight: "700" },
    date: { fontSize: 11, color: "#6b7280", marginTop: 3 },
    customer: { fontSize: 11, color: "#0d9488", marginTop: 2 },
    amountWrap: { alignItems: "flex-end", flexDirection: "row", gap: 4 },
    amount: { fontSize: 15, fontWeight: "800", color: "#0d9488" },
});