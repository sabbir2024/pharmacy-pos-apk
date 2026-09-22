import {
    DateRangePicker,
    SalesChart,
    SalesSummary,
    TopProductsChart,
} from "@/components/ui/dashboard";
import { InvoiceList } from "@/components/ui/history";
import InvoiceModal from "@/components/ui/pos/InvoiceModal";
import {
    getDueCollectedByRange,
    getPaymentBreakdown,
    getRangeSummary,
    getSalesByDateRange,
    getTopSellingByRange,
    monthStartStr,
    todayStr,
    type DateRange,
    type DayWiseSales,
    type PaymentBreakdown,
    type RangeSummary,
    type TopSelling,
} from "@/db/dashboard";
import { getAllInvoices, type Invoice } from "@/db/invoices";
import { formatTk } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type TabType = "reports" | "history";

export default function Reports() {
    const [tab, setTab] = useState<TabType>("reports");

    // Invoice history
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [openId, setOpenId] = useState<number | null>(null);

    // Reports
    const [range, setRange] = useState<DateRange>({
        from: monthStartStr(),
        to: todayStr(),
    });
    const [summary, setSummary] = useState<RangeSummary>({
        totalSales: 0,
        totalBills: 0,
        totalDue: 0,
        totalProfit: 0,
        avgBill: 0,
        dueCollected: 0,
    });
    const [chartData, setChartData] = useState<DayWiseSales[]>([]);
    const [topProducts, setTopProducts] = useState<TopSelling[]>([]);
    const [payments, setPayments] = useState<PaymentBreakdown[]>([]);
    const [dueCollected, setDueCollected] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const load = (r: DateRange = range) => {
        try {
            setInvoices(getAllInvoices());
            setSummary(getRangeSummary(r));
            setChartData(getSalesByDateRange(r));
            setTopProducts(getTopSellingByRange(r, 5));
            setPayments(getPaymentBreakdown(r));
            setDueCollected(getDueCollectedByRange(r));
        } catch (e) {
            console.error("Reports load error:", e);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            load();
        }, [])
    );

    const handleRangeChange = (r: DateRange) => {
        setRange(r);
        load(r);
    };

    const onRefresh = () => {
        setRefreshing(true);
        load();
        setRefreshing(false);
    };

    const totalCollected = summary.totalSales + dueCollected;

    // বিল হিস্ট্রি টোটাল
    const histTotalSale = invoices.reduce((s, i) => s + i.total, 0);
    const histTotalDue = invoices.reduce((s, i) => s + i.dueAmount, 0);

    return (
        <View style={styles.container}>
            {/* ট্যাব সুইচ */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === "reports" && styles.tabActive]}
                    onPress={() => setTab("reports")}
                >
                    <Ionicons
                        name="bar-chart-outline"
                        size={16}
                        color={tab === "reports" ? "#fff" : "#6b7280"}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            tab === "reports" && styles.tabTextActive,
                        ]}
                    >
                        রিপোর্ট
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, tab === "history" && styles.tabActive]}
                    onPress={() => setTab("history")}
                >
                    <Ionicons
                        name="receipt-outline"
                        size={16}
                        color={tab === "history" ? "#fff" : "#6b7280"}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            tab === "history" && styles.tabTextActive,
                        ]}
                    >
                        বিল হিস্ট্রি
                    </Text>
                </TouchableOpacity>
            </View>

            {/* রিপোর্ট ট্যাব */}
            {tab === "reports" ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={{ paddingBottom: 30 }}
                >
                    <DateRangePicker value={range} onChange={handleRangeChange} />

                    {/* সামারি কার্ড */}
                    <View style={{ marginTop: 14 }}>
                        <SalesSummary summary={summary} />
                    </View>

                    {/* 🆕 বাকি আদায় */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>বাকি আদায়</Text>

                        <View style={styles.dueCard}>
                            <View style={styles.dueIcon}>
                                <Ionicons name="cash-outline" size={26} color="#16a34a" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dueLabel}>
                                    এই সময়ে বাকি থেকে আদায়
                                </Text>
                                <Text style={styles.dueValue}>
                                    {formatTk(dueCollected)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.totalCard}>
                            <Ionicons name="wallet-outline" size={20} color="#0d9488" />
                            <Text style={styles.totalLabel}>সর্বমোট আদায়</Text>
                            <Text style={styles.totalValue}>
                                {formatTk(totalCollected)}
                            </Text>
                        </View>
                    </View>

                    {/* দিন ভিত্তিক চার্ট */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>দিন ভিত্তিক বিক্রয়</Text>
                        <SalesChart data={chartData} />
                    </View>

                    {/* টপ প্রোডাক্ট */}
                    <View style={styles.section}>
                        <TopProductsChart data={topProducts} />
                    </View>

                    {/* পেমেন্ট মেথড */}
                    {payments.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>পেমেন্ট মেথড</Text>
                            <View style={styles.listBox}>
                                {payments.map((p, idx) => (
                                    <View
                                        key={p.method}
                                        style={[
                                            styles.payRow,
                                            idx !== payments.length - 1 && styles.payBorder,
                                        ]}
                                    >
                                        <View style={styles.methodIcon}>
                                            <Ionicons
                                                name={
                                                    p.method === "cash"
                                                        ? "cash-outline"
                                                        : p.method === "card"
                                                            ? "card-outline"
                                                            : "phone-portrait-outline"
                                                }
                                                size={18}
                                                color="#0d9488"
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.methodName}>
                                                {p.method === "cash"
                                                    ? "ক্যাশ"
                                                    : p.method === "card"
                                                        ? "কার্ড"
                                                        : p.method === "bkash"
                                                            ? "বিকাশ"
                                                            : p.method}
                                            </Text>
                                            <Text style={styles.methodCount}>
                                                {p.count}টি বিল
                                            </Text>
                                        </View>
                                        <Text style={styles.methodAmount}>
                                            {formatTk(p.total)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            ) : (
                /* বিল হিস্ট্রি ট্যাব */
                <View style={{ flex: 1 }}>
                    <View style={styles.summary}>
                        <View style={styles.sumBox}>
                            <Text style={styles.sumLabel}>মোট বিক্রয়</Text>
                            <Text style={[styles.sumValue, { color: "#0d9488" }]}>
                                {formatTk(histTotalSale)}
                            </Text>
                        </View>
                        <View style={styles.sumBox}>
                            <Text style={styles.sumLabel}>মোট বাকি</Text>
                            <Text style={[styles.sumValue, { color: "#d97706" }]}>
                                {formatTk(histTotalDue)}
                            </Text>
                        </View>
                    </View>

                    <InvoiceList
                        invoices={invoices}
                        onPress={(inv) => setOpenId(inv.id)}
                    />
                </View>
            )}

            <InvoiceModal
                visible={openId !== null}
                saleId={openId}
                onClose={() => {
                    setOpenId(null);
                    load();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 14,
        backgroundColor: "#f9fafb",
    },

    // ট্যাব
    tabBar: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginBottom: 12,
    },
    tabBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
    },
    tabActive: { backgroundColor: "#0d9488" },
    tabText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6b7280",
    },
    tabTextActive: { color: "#fff" },

    // সেকশন
    section: { marginTop: 18 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#374151",
        marginBottom: 8,
    },

    // Due collection
    dueCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#f0fdf4",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    dueIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#dcfce7",
        alignItems: "center",
        justifyContent: "center",
    },
    dueLabel: { fontSize: 12, color: "#166534" },
    dueValue: {
        fontSize: 22,
        fontWeight: "800",
        color: "#16a34a",
        marginTop: 2,
    },

    totalCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#f0fdfa",
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: "#ccfbf1",
    },
    totalLabel: { flex: 1, fontSize: 13, color: "#0f766e", fontWeight: "700" },
    totalValue: { fontSize: 18, fontWeight: "800", color: "#0d9488" },

    // পেমেন্ট মেথড
    listBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    payRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 10,
    },
    payBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    methodIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#f0fdfa",
        alignItems: "center",
        justifyContent: "center",
    },
    methodName: { fontSize: 13, fontWeight: "700", color: "#111827" },
    methodCount: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
    methodAmount: { fontSize: 14, fontWeight: "800", color: "#0d9488" },

    // বিল হিস্ট্রি সামারি
    summary: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 12,
    },
    sumBox: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    sumLabel: { fontSize: 11, color: "#6b7280" },
    sumValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },
});