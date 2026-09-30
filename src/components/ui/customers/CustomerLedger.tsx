import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    SafeAreaProvider,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
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

// ============================
// Inner content (with insets)
// ============================
function LedgerContent({
    customer,
    onClose,
}: {
    customer: Customer;
    onClose: () => void;
}) {
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [loadingExcel, setLoadingExcel] = useState(false);
    const insets = useSafeAreaInsets();

    const summary = getCustomerLedgerSummary(customer.id!);
    const entries = summary?.entries || [];
    const totalDebit = summary?.totalDebit || 0;
    const totalCredit = summary?.totalCredit || 0;
    const currentDue = summary?.currentDue || 0;
    const totalSales = summary?.totalSales || 0;
    const totalPaid = summary?.totalPaid || 0;
    const openingBalance = summary?.openingBalance || 0;
    const grandTotalPaid = totalCredit + totalPaid;

    // ============================
    // PDF
    // ============================
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

    // ============================
    // Excel
    // ============================
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

    const topPadding = Math.max(
        insets.top,
        Platform.OS === "android" ? 24 : 0
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
                <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>
                        {customer.name}
                    </Text>
                    <Text style={styles.subtitle}>{entries.length}টি লেনদেন</Text>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={handleExcel}
                        disabled={loadingExcel}
                        style={styles.headerBtn}
                    >
                        {loadingExcel ? (
                            <ActivityIndicator size="small" color="#16a34a" />
                        ) : (
                            <Ionicons name="grid-outline" size={20} color="#16a34a" />
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
                            <Ionicons
                                name="download-outline"
                                size={20}
                                color="#0d9488"
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Scroll content */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom, 16) + 24 },
                ]}
            >
                {/* Customer info */}
                {(customer.phone || customer.address) && (
                    <View style={styles.infoBox}>
                        {!!customer.phone && (
                            <View style={styles.infoRow}>
                                <Ionicons name="call-outline" size={14} color="#6b7280" />
                                <Text style={styles.infoText}>{customer.phone}</Text>
                            </View>
                        )}
                        {!!customer.address && (
                            <View style={styles.infoRow}>
                                <Ionicons
                                    name="location-outline"
                                    size={14}
                                    color="#6b7280"
                                />
                                <Text style={styles.infoText}>{customer.address}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Summary - Row 1 */}
                <View style={styles.totalsBox}>
                    <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>মোট বিক্রয়</Text>
                        <Text style={[styles.totalValue, { color: "#0d9488" }]}>
                            {formatTk(totalSales + openingBalance)}
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

                {/* Summary - Row 2 */}
                <View style={styles.totalsBox2}>
                    {openingBalance > 0 && (
                        <View style={styles.totalItem2}>
                            <Text style={styles.totalLabel2}>পুরনো বাকি</Text>
                            <Text style={[styles.totalValue2, { color: "#3b82f6" }]}>
                                {formatTk(openingBalance)}
                            </Text>
                        </View>
                    )}
                    <View style={styles.totalItem2}>
                        <Text style={styles.totalLabel2}>বিলে বাকি</Text>
                        <Text style={[styles.totalValue2, { color: "#dc2626" }]}>
                            {formatTk(totalDebit - openingBalance)}
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

                {/* Section title */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>লেনদেনের হিসাব</Text>
                </View>

                {/* Empty */}
                {entries.length === 0 && (
                    <View style={styles.emptyBox}>
                        <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>কোনো লেনদেন নেই</Text>
                    </View>
                )}

                {/* Entries */}
                {entries.map((e, idx) => {
                    // entry type এর রঙ
                    const isOpening = e.type === "opening";
                    const isSale = e.type === "sale";
                    const isPayment = e.type === "payment";

                    const iconBg = isOpening
                        ? "#dbeafe"
                        : isSale
                            ? "#fee2e2"
                            : "#dcfce7";

                    const iconName = isOpening
                        ? "flag-outline"
                        : isSale
                            ? "cart-outline"
                            : "cash-outline";

                    const iconColor = isOpening
                        ? "#3b82f6"
                        : isSale
                            ? "#dc2626"
                            : "#16a34a";

                    const typeLabel = isOpening
                        ? "পুরনো বাকি"
                        : isSale
                            ? "বিক্রয়"
                            : "জমা";

                    return (
                        <View
                            key={`${e.type}-${e.id}-${idx}`}
                            style={[
                                styles.entry,
                                isOpening && { borderLeftWidth: 3, borderLeftColor: "#3b82f6" },
                            ]}
                        >
                            {/* Entry header */}
                            <View style={styles.entryHeader}>
                                <View style={[styles.entryIcon, { backgroundColor: iconBg }]}>
                                    <Ionicons
                                        name={iconName as any}
                                        size={16}
                                        color={iconColor}
                                    />
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.entryType, { color: iconColor }]}>
                                        {typeLabel}
                                    </Text>
                                    <Text style={styles.entryDate}>
                                        {formatDateTime(e.date)}
                                    </Text>
                                </View>
                            </View>

                            {/* Opening description */}
                            {isOpening && (
                                <Text style={styles.paymentNote}>{e.description}</Text>
                            )}

                            {/* Sale summary */}
                            {isSale && (
                                <View style={styles.saleSummary}>
                                    <View style={styles.saleItem}>
                                        <Text style={styles.saleItemLabel}>মোট</Text>
                                        <Text style={styles.saleItemValue}>
                                            {formatTk(e.total ?? 0)}
                                        </Text>
                                    </View>
                                    <View style={styles.saleItem}>
                                        <Text style={styles.saleItemLabel}>পরিশোধিত</Text>
                                        <Text
                                            style={[styles.saleItemValue, { color: "#16a34a" }]}
                                        >
                                            {formatTk(e.paid ?? 0)}
                                        </Text>
                                    </View>
                                    <View style={styles.saleItem}>
                                        <Text style={styles.saleItemLabel}>বাকি</Text>
                                        <Text
                                            style={[styles.saleItemValue, { color: "#dc2626" }]}
                                        >
                                            {formatTk(e.dueAmount ?? 0)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Sale items */}
                            {isSale && e.items && e.items.length > 0 && (
                                <View style={styles.itemsBox}>
                                    {e.items.map((item, i) => (
                                        <View key={i} style={styles.itemRow}>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemQty}>
                                                {item.qty} × {formatTk(item.price)}
                                            </Text>
                                            <Text style={styles.itemSubtotal}>
                                                {formatTk(item.subtotal)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Payment description */}
                            {isPayment && (
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
                    );
                })}
            </ScrollView>
        </View>
    );
}

// ============================
// Wrapper Modal
// ============================
export default function CustomerLedger({
    visible,
    customer,
    onClose,
}: Props) {
    if (!customer) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent={false}
            presentationStyle="fullScreen"
        >
            <SafeAreaProvider>
                <LedgerContent customer={customer} onClose={onClose} />
            </SafeAreaProvider>
        </Modal>
    );
}

// ============================
// Styles
// ============================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9fafb",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    backBtn: { padding: 6, borderRadius: 8 },
    title: { fontSize: 17, fontWeight: "800", color: "#111827" },
    subtitle: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
    headerActions: { flexDirection: "row", gap: 6 },
    headerBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
    },

    scrollContent: {
        padding: 16,
        paddingTop: 12,
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
        borderWidth: 1,
        borderColor: "#f1f5f9",
        flexWrap: "wrap",
    },
    totalItem2: {
        flex: 1,
        minWidth: 70,
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
    sectionTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },

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
    itemRow: { flexDirection: "row", alignItems: "center", gap: 6 },
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