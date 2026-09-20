import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    getCustomerLedger,
    type Customer,
    type LedgerEntry,
} from "../../../db/customers";
import { formatDateTime, formatTk } from "../../../utils/format";
import {
    generateCustomerLedgerPDF,
    sharePDF,
} from "../../../utils/pdf";

type Props = {
    visible: boolean;
    customer: Customer | null;
    onClose: () => void;
};

export default function CustomerLedger({ visible, customer, onClose }: Props) {
    const [loading, setLoading] = useState(false);

    if (!customer) return null;

    const ledger: LedgerEntry[] = customer.id
        ? getCustomerLedger(customer.id)
        : [];

    const totalDebit = ledger.reduce((s, e) => s + e.debit, 0);
    const totalCredit = ledger.reduce((s, e) => s + e.credit, 0);

    const handleDownload = async () => {
        try {
            setLoading(true);
            const uri = await generateCustomerLedgerPDF(customer, ledger);
            await sharePDF(uri, `${customer.name} — স্টেটমেন্ট PDF`);
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "PDF তৈরি করা যায়নি");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* হেডার */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.title} numberOfLines={1}>
                        {customer.name}
                    </Text>
                    <TouchableOpacity onPress={handleDownload} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#0d9488" />
                        ) : (
                            <Ionicons name="download-outline" size={24} color="#0d9488" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* কাস্টমার তথ্য */}
                <View style={styles.infoBox}>
                    {!!customer.phone && (
                        <Text style={styles.infoText}>📞 {customer.phone}</Text>
                    )}
                    {!!customer.address && (
                        <Text style={styles.infoText}>📍 {customer.address}</Text>
                    )}
                </View>

                {/* টোটাল */}
                <View style={styles.totalsBox}>
                    <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>মোট বাকি</Text>
                        <Text style={[styles.totalValue, { color: "#dc2626" }]}>
                            {formatTk(totalDebit)}
                        </Text>
                    </View>
                    <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>মোট জমা</Text>
                        <Text style={[styles.totalValue, { color: "#16a34a" }]}>
                            {formatTk(totalCredit)}
                        </Text>
                    </View>
                    <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>বর্তমান</Text>
                        <Text style={[styles.totalValue, { color: "#d97706" }]}>
                            {formatTk(customer.totalDue)}
                        </Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>লেনদেনের হিসাব</Text>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {ledger.length === 0 && (
                        <Text style={styles.empty}>কোনো লেনদেন নেই</Text>
                    )}

                    {ledger.map((e, idx) => (
                        <View key={`${e.type}-${e.id}-${idx}`} style={styles.entry}>
                            <View
                                style={[
                                    styles.entryIcon,
                                    {
                                        backgroundColor:
                                            e.type === "sale" ? "#fee2e2" : "#dcfce7",
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={e.type === "sale" ? "cart-outline" : "cash-outline"}
                                    size={16}
                                    color={e.type === "sale" ? "#dc2626" : "#16a34a"}
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={styles.entryDesc} numberOfLines={2}>
                                    {e.description}
                                </Text>
                                <Text style={styles.entryDate}>{formatDateTime(e.date)}</Text>
                            </View>

                            <View style={{ alignItems: "flex-end" }}>
                                <Text
                                    style={[
                                        styles.entryAmount,
                                        {
                                            color: e.type === "sale" ? "#dc2626" : "#16a34a",
                                        },
                                    ]}
                                >
                                    {e.type === "sale"
                                        ? `+ ${formatTk(e.debit)}`
                                        : `− ${formatTk(e.credit)}`}
                                </Text>
                                <Text style={styles.entryBalance}>
                                    ব্যালান্স: {formatTk(e.balance)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
        flex: 1,
        textAlign: "center",
        marginHorizontal: 8,
    },
    infoBox: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    infoText: { fontSize: 13, color: "#374151", marginVertical: 2 },
    totalsBox: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    totalItem: { flex: 1, alignItems: "center" },
    totalLabel: { fontSize: 11, color: "#6b7280" },
    totalValue: { fontSize: 15, fontWeight: "800", marginTop: 4 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 6,
    },
    empty: {
        textAlign: "center",
        color: "#9ca3af",
        paddingVertical: 30,
        fontSize: 13,
    },
    entry: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    entryIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    entryDesc: { fontSize: 13, fontWeight: "600", color: "#111827" },
    entryDate: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
    entryAmount: { fontSize: 14, fontWeight: "800" },
    entryBalance: { fontSize: 10, color: "#6b7280", marginTop: 2 },
});