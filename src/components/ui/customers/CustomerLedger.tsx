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
    getCustomerLedgerSummary,
    type Customer,
} from "../../../db/customers";
import { formatDateTime, formatTk } from "../../../utils/format";
import { exportLedgerToExcel } from "../../../utils/ledgerExcel";
import { generateLedgerPDF, sharePDF } from "../../../utils/ledgerPdf";

type Props = {
    visible: boolean;
    customer: Customer | null;
    onClose: () => void;
};

export default function CustomerLedger({
    visible,
    customer,
    onClose,
}: Props) {
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [loadingExcel, setLoadingExcel] = useState(false);

    if (!customer) return null;

    const summary = getCustomerLedgerSummary(customer.id!);
    const entries = summary?.entries || [];
    const totalDebit = summary?.totalDebit || 0;
    const totalCredit = summary?.totalCredit || 0;
    const currentDue = summary?.currentDue || 0;
    const totalSales = summary?.totalSales || 0;
    const totalPaid = summary?.totalPaid || 0;
    const grandTotalPaid = totalCredit + totalPaid;

    // PDF
    const handlePDF = async () => {
        if (!summary) return;
        try {
            setLoadingPdf(true);
            const uri = await generateLedgerPDF(summary);
            await sharePDF(uri, `${customer.name} — লেজার PDF`);
        } catch (e: any) {
            console.error(e);
            Alert.alert("ত্রুটি", e?.message || "PDF তৈরি করা যায়নি");
        } finally {
            setLoadingPdf(false);
        }
    };

    // Excel
    const handleExcel = async () => {
        if (!summary) return;
        try {
            setLoadingExcel(true);
            await exportLedgerToExcel(summary);
        } catch (e: any) {
            console.error(e);
            Alert.alert("ত্রুটি", e?.message || "Excel তৈরি করা যায়নি");
        } finally {
            setLoadingExcel(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.title} numberOfLines={1}>
                        {customer.name}
                    </Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={handleExcel}
                            disabled={loadingExcel}
                            style={styles.headerBtn}
                        >
                            {loadingExcel ? (
                                <ActivityIndicator size="small" color="#16a34a" />
                            ) : (
                                <Ionicons name="grid-outline" size={22} color="#16a34a" />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handlePDF}
                            disabled={loadingPdf}
                            style={styles.headerBtn}
                        >
                            {loadingPdf ? (
                                <ActivityIndicator size="small" color="#0d9488" />
                            ) : (
                                <Ionicons name="download-outline" size={22} color="#0d9488" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.infoBox}>
                    {!!customer.phone && (
                        <View style={styles.infoRow}>
                            <Ionicons name="call-outline" size={14} color="#6b7280" />
                            <Text style={styles.infoText}>{customer.phone}</Text>
                        </View>
                    )}
                    {!!customer.address && (
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={14} color="#6b7280" />
                            <Text style={styles.infoText}>{customer.address}</Text>
                        </View>
                    )}
                </View>

                {/* Summary - First row */}
                <View style={styles.totalsBox}>
                    <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>মোট বিক্রয়</Text>
                        <Text style={[styles.totalValue, { color: "#0d9488" }]}>
                            {formatTk(totalSales)}
                        </Text>
                    </View>
                    <View style={styles.totalDivider} />
                    <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>মোট জমা</Text>
                        <Text style={[styles.totalValue, { color: "#16a34a" }]}>
                            {formatTk(grandTotalPaid)}
                        </Text>
                    </View>
                    <View style={styles.totalDivider} />
                    <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>বর্তমান বাকি</Text>
                        <Text style={[styles.totalValue, { color: "#d97706" }]}>
                            {formatTk(currentDue)}
                        </Text>
                    </View>
                </View>

                {/* Second row — breakdown */}
                <View style={styles.totalsBox2}>
                    <View style={styles.totalItem2}>
                        <Text style={styles.totalLabel2}>বিলে বাকি</Text>
                        <Text style={[styles.totalValue2, { color: "#dc2626" }]}>
                            {formatTk(totalDebit)}
                        </Text>
                    </View>
                    <View style={styles.totalItem2}>
                        <Text style={styles.totalLabel2}>বিলে পরিশোধ</Text>
                        <Text style={[styles.totalValue2, { color: "#16a34a" }]}>
                            {formatTk(totalPaid)}
                        </Text>
                    </View>
                    <View style={styles.totalItem2}>
                        <Text style={styles.totalLabel2}>পরে জমা</Text>
                        <Text style={[styles.totalValue2, { color: "#16a34a" }]}>
                            {formatTk(totalCredit)}
                        </Text>
                    </View>
                </View>

                {/* Section Title */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>লেনদেনের হিসাব</Text>
                    <Text style={styles.entryCount}>{entries.length}টি লেনদেন</Text>
                </View>

                {/* Ledger Entries */}
                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {entries.length === 0 && (
                        <View style={styles.emptyBox}>
                            <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>কোনো লেনদেন নেই</Text>
                        </View>
                    )}

                    {entries.map((e, idx) => (
                        <View key={`${e.type}-${e.id}-${idx}`} style={styles.entry}>
                            {/* Header */}
                            <View style={styles.entryHeader}>
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
                                    <View style={styles.entryTitleRow}>
                                        <Text
                                            style={[
                                                styles.entryType,
                                                {
                                                    color: e.type === "sale" ? "#dc2626" : "#16a34a",
                                                },
                                            ]}
                                        >
                                            {e.type === "sale" ? "বিক্রয়" : "জমা"}
                                        </Text>
                                        <Text style={styles.entryDate}>
                                            {formatDateTime(e.date)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Sale — Total/Paid/Due summary */}
                            {e.type === "sale" && (
                                <View style={styles.saleSummary}>
                                    <View style={styles.saleItem}>
                                        <Text style={styles.saleItemLabel}>মোট</Text>
                                        <Text style={styles.saleItemValue}>
                                            ৳{e.total ?? 0}
                                        </Text>
                                    </View>
                                    <View style={styles.saleItem}>
                                        <Text style={styles.saleItemLabel}>পরিশোধিত</Text>
                                        <Text
                                            style={[styles.saleItemValue, { color: "#16a34a" }]}
                                        >
                                            ৳{e.paid ?? 0}
                                        </Text>
                                    </View>
                                    <View style={styles.saleItem}>
                                        <Text style={styles.saleItemLabel}>বাকি</Text>
                                        <Text
                                            style={[styles.saleItemValue, { color: "#dc2626" }]}
                                        >
                                            ৳{e.dueAmount ?? 0}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Sale items */}
                            {e.type === "sale" && e.items && e.items.length > 0 && (
                                <View style={styles.itemsBox}>
                                    {e.items.map((item, i) => (
                                        <View key={i} style={styles.itemRow}>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemQty}>
                                                {item.qty} × ৳{item.price}
                                            </Text>
                                            <Text style={styles.itemSubtotal}>
                                                ৳{item.subtotal}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Payment note */}
                            {e.type === "payment" && (
                                <Text style={styles.paymentNote}>{e.description}</Text>
                            )}

                            {/* Amount + Balance */}
                            <View style={styles.amountRow}>
                                <View style={styles.amountLeft}>
                                    {e.debit > 0 && (
                                        <Text style={styles.debitText}>
                                            + {formatTk(e.debit)}
                                        </Text>
                                    )}
                                    {e.credit > 0 && (
                                        <Text style={styles.creditText}>
                                            − {formatTk(e.credit)}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.balanceBox}>
                                    <Text style={styles.balanceLabel}>ব্যালান্স</Text>
                                    <Text style={styles.balanceValue}>
                                        {formatTk(e.balance)}
                                    </Text>
                                </View>
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
        marginBottom: 12,
        gap: 8,
    },
    backBtn: { padding: 4 },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
        flex: 1,
    },
    headerActions: { flexDirection: "row", gap: 6 },
    headerBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
    },

    infoBox: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        gap: 6,
    },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    infoText: { fontSize: 12, color: "#374151" },

    totalsBox: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        alignItems: "center",
    },
    totalItem: { flex: 1, alignItems: "center" },
    totalDivider: {
        width: 1,
        height: 30,
        backgroundColor: "#f1f5f9",
    },
    totalLabel: { fontSize: 10, color: "#6b7280" },
    totalValue: { fontSize: 14, fontWeight: "800", marginTop: 4 },

    totalsBox2: {
        flexDirection: "row",
        backgroundColor: "#f9fafb",
        borderRadius: 10,
        padding: 8,
        marginBottom: 14,
        gap: 6,
    },
    totalItem2: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 6,
    },
    totalLabel2: { fontSize: 9, color: "#6b7280" },
    totalValue2: { fontSize: 12, fontWeight: "800", marginTop: 2 },

    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
    },
    entryCount: { fontSize: 11, color: "#9ca3af" },

    emptyBox: { alignItems: "center", paddingVertical: 60 },
    emptyText: { marginTop: 10, color: "#9ca3af", fontSize: 13 },

    entry: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    entryHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },
    entryIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
    },
    entryTitleRow: { flex: 1 },
    entryType: { fontSize: 13, fontWeight: "800" },
    entryDate: { fontSize: 10, color: "#9ca3af", marginTop: 2 },

    saleSummary: {
        flexDirection: "row",
        backgroundColor: "#f9fafb",
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        gap: 6,
    },
    saleItem: { flex: 1, alignItems: "center" },
    saleItemLabel: { fontSize: 9, color: "#6b7280" },
    saleItemValue: {
        fontSize: 12,
        fontWeight: "800",
        color: "#111827",
        marginTop: 2,
    },

    itemsBox: {
        backgroundColor: "#f9fafb",
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        gap: 4,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    itemName: {
        flex: 1,
        fontSize: 12,
        color: "#374151",
        fontWeight: "600",
    },
    itemQty: { fontSize: 11, color: "#6b7280" },
    itemSubtotal: {
        fontSize: 12,
        fontWeight: "700",
        color: "#0d9488",
        minWidth: 60,
        textAlign: "right",
    },

    paymentNote: {
        fontSize: 12,
        color: "#374151",
        marginBottom: 8,
        fontStyle: "italic",
    },

    amountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
    },
    amountLeft: { flex: 1 },
    debitText: { fontSize: 14, fontWeight: "800", color: "#dc2626" },
    creditText: { fontSize: 14, fontWeight: "800", color: "#16a34a" },
    balanceBox: { alignItems: "flex-end" },
    balanceLabel: { fontSize: 9, color: "#9ca3af" },
    balanceValue: {
        fontSize: 13,
        fontWeight: "700",
        color: "#0d9488",
        marginTop: 2,
    },
});