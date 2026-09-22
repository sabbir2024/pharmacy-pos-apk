import {
    DataManagement,
    DateRangePicker,
    ExpiryList,
    LowStockList,
    QuickActions,
    SalesChart,
    SalesSummary,
    StatCard,
    TopProductsChart,
    TopSellingList,
} from "@/components/ui/dashboard";
import {
    getDashboardStats,
    getDuePaymentStats,
    getExpiringItems,
    getLowStockItems,
    getRangeSummary,
    getRecentDuePayments,
    getSalesByDateRange,
    getStockStats,
    getTopSelling,
    getTopSellingByRange,
    monthStartStr,
    todayStr,
    type DashboardStats,
    type DateRange,
    type DayWiseSales,
    type DuePaymentItem,
    type DuePaymentStats,
    type RangeSummary,
    type StockItem,
    type StockStats,
    type TopSelling,
} from "@/db/dashboard";
import { formatDateTime, formatTk } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function Dashboard() {
    const router = useRouter();

    const [stats, setStats] = useState<DashboardStats>({
        todaySales: 0,
        todayBills: 0,
        monthSales: 0,
        monthBills: 0,
        totalDue: 0,
        totalProfitToday: 0,
        todayCollected: 0,
        todayPayments: 0,
    });

    const [stock, setStock] = useState<StockStats>({
        totalMedicines: 0,
        totalStockValue: 0,
        totalCostValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        expiredCount: 0,
        expiringSoonCount: 0,
    });

    const [lowStock, setLowStock] = useState<StockItem[]>([]);
    const [expiring, setExpiring] = useState<StockItem[]>([]);
    const [topSelling, setTopSelling] = useState<TopSelling[]>([]);

    // Date range
    const [range, setRange] = useState<DateRange>({
        from: monthStartStr(),
        to: todayStr(),
    });
    const [chartData, setChartData] = useState<DayWiseSales[]>([]);
    const [rangeSummary, setRangeSummary] = useState<RangeSummary>({
        totalSales: 0,
        totalBills: 0,
        totalDue: 0,
        totalProfit: 0,
        avgBill: 0,
        dueCollected: 0,
    });
    const [topProducts, setTopProducts] = useState<TopSelling[]>([]);

    // 🆕 Due Payment
    const [dueStats, setDueStats] = useState<DuePaymentStats>({
        todayCollected: 0,
        todayPayments: 0,
        monthCollected: 0,
        monthPayments: 0,
        totalDueCustomers: 0,
        totalDueAmount: 0,
    });
    const [recentPayments, setRecentPayments] = useState<DuePaymentItem[]>([]);

    const [refreshing, setRefreshing] = useState(false);

    const load = () => {
        try {
            setStats(getDashboardStats());
            setStock(getStockStats());
            setLowStock(getLowStockItems());
            setExpiring(getExpiringItems());
            setTopSelling(getTopSelling());

            setChartData(getSalesByDateRange(range));
            setRangeSummary(getRangeSummary(range));
            setTopProducts(getTopSellingByRange(range, 5));

            // 🆕 Due payment
            setDueStats(getDuePaymentStats());
            setRecentPayments(getRecentDuePayments(5));
        } catch (e) {
            console.error("Dashboard load error:", e);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            load();
        }, [])
    );

    const handleRangeChange = (r: DateRange) => {
        setRange(r);
        setChartData(getSalesByDateRange(r));
        setRangeSummary(getRangeSummary(r));
        setTopProducts(getTopSellingByRange(r, 5));
    };

    const onRefresh = () => {
        setRefreshing(true);
        load();
        setRefreshing(false);
    };

    const profit = stock.totalStockValue - stock.totalCostValue;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 30 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* ১. আজকের বিক্রয় — Hero */}
            <View style={styles.heroCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.heroLabel}>আজকের বিক্রয়</Text>
                    <Text style={styles.heroValue}>{formatTk(stats.todaySales)}</Text>
                    <View style={styles.heroRow}>
                        <View style={styles.heroBadge}>
                            <Ionicons name="receipt-outline" size={12} color="#0f766e" />
                            <Text style={styles.heroBadgeText}>{stats.todayBills} বিল</Text>
                        </View>
                        <View style={styles.heroBadge}>
                            <Ionicons name="trending-up-outline" size={12} color="#0f766e" />
                            <Text style={styles.heroBadgeText}>
                                লাভ {formatTk(stats.totalProfitToday)}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.heroIcon}>
                    <Ionicons name="cash-outline" size={40} color="#0d9488" />
                </View>
            </View>

            {/* ২. Quick Actions */}
            <View style={styles.section}>
                <QuickActions />
            </View>

            {/* ৩. বিক্রয় রিপোর্ট — চার্ট */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>বিক্রয় রিপোর্ট</Text>

                <DateRangePicker value={range} onChange={handleRangeChange} />

                <View style={{ marginTop: 12 }}>
                    <SalesSummary summary={rangeSummary} />
                </View>

                <View style={{ marginTop: 12 }}>
                    <Text style={styles.chartTitle}>দিন ভিত্তিক বিক্রয়</Text>
                    <SalesChart data={chartData} />
                </View>

                <View style={{ marginTop: 12 }}>
                    <TopProductsChart data={topProducts} />
                </View>
            </View>

            {/* ৪. 🆕 বাকি কালেকশন */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>বাকি কালেকশন</Text>

                <View style={styles.grid}>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="আজকের কালেকশন"
                            value={formatTk(dueStats.todayCollected)}
                            icon="cash-outline"
                            color="#16a34a"
                            bgColor="#dcfce7"
                            sub={`${dueStats.todayPayments}টি পেমেন্ট`}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="এই মাসের কালেকশন"
                            value={formatTk(dueStats.monthCollected)}
                            icon="calendar-outline"
                            color="#0d9488"
                            bgColor="#f0fdfa"
                            sub={`${dueStats.monthPayments}টি পেমেন্ট`}
                        />
                    </View>
                </View>

                <View style={[styles.grid, { marginTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="বাকি কাস্টমার"
                            value={`${dueStats.totalDueCustomers}`}
                            icon="people-outline"
                            color="#d97706"
                            bgColor="#fef3c7"
                            sub={`মোট ${formatTk(dueStats.totalDueAmount)}`}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <TouchableOpacity
                            style={styles.dueBtn}
                            onPress={() => router.push("/(tabs)/due")}
                        >
                            <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                            <Text style={styles.dueBtnText}>সব কাস্টমার</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* সাম্প্রতিক পেমেন্ট */}
                {recentPayments.length > 0 && (
                    <View style={[styles.listBox, { marginTop: 12 }]}>
                        {recentPayments.map((p, idx) => (
                            <View
                                key={p.id}
                                style={[
                                    styles.paymentRow,
                                    idx !== recentPayments.length - 1 && styles.paymentBorder,
                                ]}
                            >
                                <View style={styles.payIcon}>
                                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.payName}>
                                        {p.customerName || "কাস্টমার"}
                                    </Text>
                                    <Text style={styles.payDate}>
                                        {formatDateTime(p.createdAt)}
                                    </Text>
                                </View>
                                <Text style={styles.payAmount}>{formatTk(p.amount)}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* ৫. এই মাসের সামারি */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>এই মাসের সামারি</Text>
                <View style={styles.grid}>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="মাসিক বিক্রয়"
                            value={formatTk(stats.monthSales)}
                            icon="calendar-outline"
                            color="#3b82f6"
                            bgColor="#dbeafe"
                            sub={`${stats.monthBills} বিল`}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="মোট বাকি"
                            value={formatTk(stats.totalDue)}
                            icon="alert-circle-outline"
                            color="#d97706"
                            bgColor="#fef3c7"
                            sub="Due"
                        />
                    </View>
                </View>
            </View>

            {/* ৬. স্টক সামারি */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>স্টক সামারি</Text>

                <View style={styles.grid}>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="মোট ঔষধ"
                            value={`${stock.totalMedicines}`}
                            icon="medkit-outline"
                            color="#0d9488"
                            bgColor="#f0fdfa"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="স্টক মূল্য"
                            value={formatTk(stock.totalStockValue)}
                            icon="pricetags-outline"
                            color="#8b5cf6"
                            bgColor="#ede9fe"
                            sub={`লাভ ${formatTk(profit)}`}
                        />
                    </View>
                </View>

                <View style={[styles.grid, { marginTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="কম স্টক"
                            value={`${stock.lowStockCount}`}
                            icon="warning-outline"
                            color="#f59e0b"
                            bgColor="#fef3c7"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="স্টক শেষ"
                            value={`${stock.outOfStockCount}`}
                            icon="close-circle-outline"
                            color="#dc2626"
                            bgColor="#fee2e2"
                        />
                    </View>
                </View>

                <View style={[styles.grid, { marginTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="এক্সপায়ার্ড"
                            value={`${stock.expiredCount}`}
                            icon="alert-circle-outline"
                            color="#dc2626"
                            bgColor="#fee2e2"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="৯০ দিনে এক্সপায়ার"
                            value={`${stock.expiringSoonCount}`}
                            icon="time-outline"
                            color="#f97316"
                            bgColor="#ffedd5"
                        />
                    </View>
                </View>
            </View>

            {/* ৭. কম স্টক */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>কম স্টক</Text>
                    {lowStock.length > 0 && (
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/inventory")}
                        >
                            <Text style={styles.seeAll}>সব দেখুন</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.listBox}>
                    <LowStockList items={lowStock} />
                </View>
            </View>

            {/* ৮. এক্সপায়ারি */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>এক্সপায়ারি অ্যালার্ট</Text>
                    {expiring.length > 0 && (
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/inventory")}
                        >
                            <Text style={styles.seeAll}>সব দেখুন</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.listBox}>
                    <ExpiryList items={expiring} />
                </View>
            </View>

            {/* ৯. টপ সেলিং */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>টপ সেলিং (এই মাসে)</Text>
                <View style={styles.listBox}>
                    <TopSellingList items={topSelling} />
                </View>
            </View>

            {/* ১০. ডেটা ম্যানেজমেন্ট */}
            <View style={styles.section}>
                <DataManagement />
            </View>
            <View style={{ alignItems: "center", gap: 8 }}>
                <View style={styles.heroIcon}>
                    <Ionicons name="cash-outline" size={40} color="#0d9488" />
                </View>
                <TouchableOpacity
                    style={styles.settingsBtn}
                    onPress={() => router.push("/(tabs)/settings")}
                >
                    <Ionicons name="settings-outline" size={18} color="#0d9488" />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 14, backgroundColor: "#f9fafb" },
    heroCard: {
        flexDirection: "row",
        backgroundColor: "#f0fdfa",
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: "#ccfbf1",
        marginBottom: 14,
    },
    heroLabel: { fontSize: 13, color: "#0f766e", fontWeight: "600" },
    heroValue: {
        fontSize: 32,
        fontWeight: "800",
        color: "#0d9488",
        marginTop: 6,
    },
    heroRow: { flexDirection: "row", gap: 8, marginTop: 10 },
    heroBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ccfbf1",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    heroBadgeText: { fontSize: 11, color: "#0f766e", fontWeight: "700" },
    heroIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#ccfbf1",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
    },
    section: { marginBottom: 18 },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#374151",
        marginBottom: 8,
    },
    chartTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#6b7280",
        marginBottom: 6,
    },
    seeAll: { fontSize: 12, color: "#0d9488", fontWeight: "700" },
    grid: { flexDirection: "row", gap: 10 },
    listBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },

    // 🆕 Due styles
    dueBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#0d9488",
        borderRadius: 12,
        paddingVertical: 14,
    },
    dueBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    paymentRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 10,
    },
    paymentBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    payIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#dcfce7",
        alignItems: "center",
        justifyContent: "center",
    },
    settingsBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#ccfbf1",
    },
    payName: { fontSize: 13, fontWeight: "700", color: "#111827" },
    payDate: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
    payAmount: { fontSize: 14, fontWeight: "800", color: "#16a34a" },
});