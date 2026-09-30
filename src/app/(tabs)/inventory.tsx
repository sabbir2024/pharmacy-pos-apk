import {
    AddProductModal,
    ImportExcelModal,
    ProductList,
    SearchBar,
    type Product,
} from "@/components/ui/stock";
import {
    addProduct,
    bulkAddProducts,
    deleteProduct,
    getAllProducts,
    updateProduct,
} from "@/db/products";
import { exportProductsToExcel } from "@/utils/excel";
import {
    generateLowStockPDF,
    generateProductsPDF,
    sharePDF,
} from "@/utils/pdf";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type TabKey = "all" | "inStock" | "outOfStock";

type StockRange = "1-10" | "1-30" | "1-50" | "1-99" | "100+";

// ✅ Remarks সহ Stock Ranges
const STOCK_RANGES: {
    key: StockRange;
    label: string;
    min: number;
    max: number;
    remark: string;
    color: string;
}[] = [
        {
            key: "1-10",
            label: "1-10",
            min: 1,
            max: 10,
            remark: "খুব কম — দ্রুত রিফিল",
            color: "#dc2626",
        },
        {
            key: "1-30",
            label: "1-30",
            min: 1,
            max: 30,
            remark: "কম স্টক",
            color: "#f97316",
        },
        {
            key: "1-50",
            label: "1-50",
            min: 1,
            max: 50,
            remark: "মাঝারি স্টক",
            color: "#d97706",
        },
        {
            key: "1-99",
            label: "1-99",
            min: 1,
            max: 99,
            remark: "সন্তোষজনক",
            color: "#16a34a",
        },
        {
            key: "100+",
            label: "100+",
            min: 100,
            max: Infinity,
            remark: "পর্যাপ্ত স্টক",
            color: "#0d9488",
        },
    ];

export default function Inventory() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<TabKey>("all");
    const [stockRange, setStockRange] = useState<StockRange | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [importOpen, setImportOpen] = useState(false);

    const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

    // Load
    const loadProducts = useCallback(() => {
        try {
            setProducts(getAllProducts());
        } catch (e) {
            console.error("Load error:", e);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadProducts();
        }, [loadProducts])
    );

    // Counts
    const counts = useMemo(() => {
        const all = products.length;
        const inStock = products.filter((p) => p.stock > 0).length;
        const outOfStock = products.filter((p) => p.stock <= 0).length;
        return { all, inStock, outOfStock };
    }, [products]);

    // Range counts
    const rangeCounts = useMemo(() => {
        const inStockItems = products.filter((p) => p.stock > 0);

        const counts: Record<StockRange, number> = {
            "1-10": 0,
            "1-30": 0,
            "1-50": 0,
            "1-99": 0,
            "100+": 0,
        };

        for (const item of inStockItems) {
            if (item.stock >= 1 && item.stock <= 10) counts["1-10"]++;
            if (item.stock >= 1 && item.stock <= 30) counts["1-30"]++;
            if (item.stock >= 1 && item.stock <= 50) counts["1-50"]++;
            if (item.stock >= 1 && item.stock <= 99) counts["1-99"]++;
            if (item.stock >= 100) counts["100+"]++;
        }

        return counts;
    }, [products]);

    // ✅ Active range info
    const activeRange = useMemo(() => {
        if (tab !== "inStock" || !stockRange) return null;
        return STOCK_RANGES.find((r) => r.key === stockRange) || null;
    }, [tab, stockRange]);

    // Filtered
    const filtered = useMemo(() => {
        let list = products;

        if (tab === "inStock") {
            list = list.filter((p) => p.stock > 0);
        } else if (tab === "outOfStock") {
            list = list.filter((p) => p.stock <= 0);
        }

        if (tab === "inStock" && stockRange) {
            const range = STOCK_RANGES.find((r) => r.key === stockRange);
            if (range) {
                list = list.filter(
                    (p) => p.stock >= range.min && p.stock <= range.max
                );
            }
        }

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            list = list.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.company?.toLowerCase().includes(q) ||
                    p.barcode?.includes(q)
            );
        }

        return list;
    }, [products, search, tab, stockRange]);

    const handleTabChange = (newTab: TabKey) => {
        setTab(newTab);
        if (newTab !== "inStock") {
            setStockRange(null);
        }
    };

    // Save
    const handleSave = async (product: Product) => {
        try {
            if (product.id) {
                await updateProduct(product);
            } else {
                await addProduct(product);
            }
            loadProducts();
            setEditing(null);
        } catch (e) {
            Alert.alert("ত্রুটি", "সেভ করা যায়নি");
            console.error(e);
        }
    };

    // Delete
    const handleDelete = (id: number) => {
        Alert.alert("ডিলিট", "আপনি কি নিশ্চিত?", [
            { text: "না", style: "cancel" },
            {
                text: "হ্যাঁ",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteProduct(id);
                        loadProducts();
                    } catch (e) {
                        console.error("Delete error:", e);
                        Alert.alert("ত্রুটি", "মুছে ফেলা যায়নি");
                    }
                },
            },
        ]);
    };

    // Import
    const handleImport = async (items: Omit<Product, "id">[]) => {
        try {
            const { inserted, skipped } = await bulkAddProducts(items);
            loadProducts();
            Alert.alert(
                "সফল",
                `${inserted}টি ঔষধ অ্যাড হয়েছে${skipped > 0 ? `\n${skipped}টি বাদ পড়েছে (ডুপ্লিকেট/ভুল)` : ""
                }`
            );
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "ইমপোর্ট করা যায়নি");
        }
    };

    // PDF Export
    const handlePDFExport = async () => {
        try {
            if (filtered.length === 0) {
                Alert.alert("খালি", "এই tab এ কোনো ঔষধ নেই");
                return;
            }

            setExporting("pdf");

            const tabLabel =
                tab === "all"
                    ? "সব ঔষধ"
                    : tab === "inStock"
                        ? "স্টক আছে"
                        : "স্টক শেষ";

            const rangeLabel =
                tab === "inStock" && stockRange ? ` (স্টক ${stockRange})` : "";

            let uri: string;
            if (tab === "outOfStock") {
                uri = await generateLowStockPDF(filtered);
            } else {
                uri = await generateProductsPDF(filtered);
            }

            await sharePDF(uri, `${tabLabel}${rangeLabel} — PDF`);
        } catch (e: any) {
            console.error("PDF export error:", e);
            Alert.alert("ত্রুটি", e?.message || "PDF তৈরি করা যায়নি");
        } finally {
            setExporting(null);
        }
    };

    // CSV Export
    const handleCSVExport = async () => {
        try {
            if (filtered.length === 0) {
                Alert.alert("খালি", "এই tab এ কোনো ঔষধ নেই");
                return;
            }

            setExporting("csv");
            await exportProductsToExcel(filtered);
        } catch (e: any) {
            console.error("CSV export error:", e);
            Alert.alert("ত্রুটি", e?.message || "CSV তৈরি করা যায়নি");
        } finally {
            setExporting(null);
        }
    };

    const lowStock = products.filter(
        (p) => p.stock > 0 && p.stock <= 10
    ).length;

    const tabs: {
        key: TabKey;
        label: string;
        count: number;
        color: string;
    }[] = [
            { key: "all", label: "সব", count: counts.all, color: "#0d9488" },
            {
                key: "inStock",
                label: "স্টক আছে",
                count: counts.inStock,
                color: "#16a34a",
            },
            {
                key: "outOfStock",
                label: "স্টক শেষ",
                count: counts.outOfStock,
                color: "#dc2626",
            },
        ];

    return (
        <View style={styles.container}>
            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>মোট ঔষধ</Text>
                    <Text style={[styles.statValue, { color: "#0d9488" }]}>
                        {counts.all}
                    </Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>কম স্টক</Text>
                    <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                        {lowStock}
                    </Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>শেষ</Text>
                    <Text style={[styles.statValue, { color: "#dc2626" }]}>
                        {counts.outOfStock}
                    </Text>
                </View>
            </View>

            {/* Top Bar: Import / PDF / CSV */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.topBtn}
                    onPress={() => setImportOpen(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color="#0d9488"
                    />
                    <Text style={[styles.topBtnText, { color: "#0d9488" }]}>
                        Import
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.topBtn, { borderColor: "#dc2626" }]}
                    onPress={handlePDFExport}
                    disabled={exporting !== null}
                    activeOpacity={0.7}
                >
                    {exporting === "pdf" ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                        <Ionicons
                            name="document-text-outline"
                            size={18}
                            color="#dc2626"
                        />
                    )}
                    <Text style={[styles.topBtnText, { color: "#dc2626" }]}>
                        PDF
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.topBtn, { borderColor: "#16a34a" }]}
                    onPress={handleCSVExport}
                    disabled={exporting !== null}
                    activeOpacity={0.7}
                >
                    {exporting === "csv" ? (
                        <ActivityIndicator size="small" color="#16a34a" />
                    ) : (
                        <Ionicons name="grid-outline" size={18} color="#16a34a" />
                    )}
                    <Text style={[styles.topBtnText, { color: "#16a34a" }]}>
                        CSV
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {tabs.map((t) => {
                    const active = tab === t.key;
                    return (
                        <TouchableOpacity
                            key={t.key}
                            style={[
                                styles.tabBtn,
                                active && { backgroundColor: t.color },
                            ]}
                            onPress={() => handleTabChange(t.key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    active && styles.tabTextActive,
                                ]}
                            >
                                {t.label}
                            </Text>
                            <View
                                style={[
                                    styles.tabBadge,
                                    active
                                        ? { backgroundColor: "rgba(255,255,255,0.25)" }
                                        : { backgroundColor: "#f3f4f6" },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.tabBadgeText,
                                        active && { color: "#fff" },
                                    ]}
                                >
                                    {t.count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ✅ Stock Range Chips with Remarks (only inStock tab) */}
            {tab === "inStock" && (
                <View style={styles.rangeWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.rangeScroll}
                    >
                        {STOCK_RANGES.map((r) => {
                            const active = stockRange === r.key;
                            const count = rangeCounts[r.key];

                            return (
                                <TouchableOpacity
                                    key={r.key}
                                    style={[
                                        styles.rangeChip,
                                        active && {
                                            backgroundColor: r.color,
                                            borderColor: r.color,
                                        },
                                    ]}
                                    onPress={() =>
                                        setStockRange(active ? null : r.key)
                                    }
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.rangeChipText,
                                            active && styles.rangeChipTextActive,
                                        ]}
                                    >
                                        {r.label}
                                    </Text>
                                    <View
                                        style={[
                                            styles.rangeBadge,
                                            active
                                                ? { backgroundColor: "rgba(255,255,255,0.25)" }
                                                : { backgroundColor: "#f0fdf4" },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.rangeBadgeText,
                                                active
                                                    ? { color: "#fff" }
                                                    : { color: r.color },
                                            ]}
                                        >
                                            {count}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* ✅ Active Range Remark */}
                    {activeRange && (
                        <View
                            style={[
                                styles.remarkBox,
                                {
                                    backgroundColor: activeRange.color + "15",
                                    borderColor: activeRange.color + "40",
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.remarkDot,
                                    { backgroundColor: activeRange.color },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.remarkText,
                                    { color: activeRange.color },
                                ]}
                            >
                                <Text style={{ fontWeight: "800" }}>
                                    {activeRange.label}:
                                </Text>{" "}
                                {activeRange.remark}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setStockRange(null)}
                                style={styles.remarkClose}
                            >
                                <Ionicons
                                    name="close-circle"
                                    size={16}
                                    color={activeRange.color}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ✅ Legend (all remarks) */}
                    {!activeRange && (
                        <View style={styles.legendBox}>
                            {STOCK_RANGES.map((r) => (
                                <View key={r.key} style={styles.legendItem}>
                                    <View
                                        style={[
                                            styles.legendDot,
                                            { backgroundColor: r.color },
                                        ]}
                                    />
                                    <Text style={styles.legendText}>
                                        <Text style={{ fontWeight: "700" }}>
                                            {r.label}
                                        </Text>
                                        {" · "}
                                        {r.remark}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Search */}
            <SearchBar value={search} onChangeText={setSearch} />

            {/* Result count */}
            {(search.trim().length > 0 ||
                tab !== "all" ||
                stockRange !== null) && (
                    <View style={styles.resultInfo}>
                        <Text style={styles.resultText}>
                            {filtered.length}টি ঔষধ পাওয়া গেছে
                            {tab === "inStock" && stockRange
                                ? ` (স্টক ${stockRange})`
                                : ""}
                        </Text>
                    </View>
                )}

            {/* Product List */}
            <ProductList
                products={filtered}
                onEdit={(p) => {
                    setEditing(p);
                    setModalOpen(true);
                }}
                onDelete={handleDelete}
            />

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    setEditing(null);
                    setModalOpen(true);
                }}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            <AddProductModal
                visible={modalOpen}
                initialData={editing}
                onClose={() => {
                    setModalOpen(false);
                    setEditing(null);
                }}
                onSave={handleSave}
            />

            <ImportExcelModal
                visible={importOpen}
                onClose={() => setImportOpen(false)}
                onImport={handleImport}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },

    statsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        alignItems: "center",
    },
    statLabel: { fontSize: 10, color: "#6b7280" },
    statValue: { fontSize: 18, fontWeight: "800", marginTop: 2 },

    topBar: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    topBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: "#0d9488",
        backgroundColor: "#fff",
        minHeight: 42,
    },
    topBtnText: {
        fontWeight: "800",
        fontSize: 12,
    },

    tabBar: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginBottom: 10,
        gap: 4,
    },
    tabBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: "#f9fafb",
    },
    tabText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#6b7280",
    },
    tabTextActive: { color: "#fff" },
    tabBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
        minWidth: 22,
        alignItems: "center",
    },
    tabBadgeText: {
        fontSize: 11,
        fontWeight: "800",
        color: "#6b7280",
    },

    // Range chips
    rangeWrapper: {
        marginBottom: 10,
    },
    rangeScroll: {
        gap: 6,
        paddingRight: 8,
        paddingVertical: 2,
    },
    rangeChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    rangeChipText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#374151",
    },
    rangeChipTextActive: { color: "#fff" },
    rangeBadge: {
        paddingHorizontal: 5,
        paddingVertical: 0,
        borderRadius: 8,
        minWidth: 18,
        alignItems: "center",
    },
    rangeBadgeText: {
        fontSize: 10,
        fontWeight: "800",
    },

    // ✅ Active range remark
    remarkBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 8,
    },
    remarkDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    remarkText: {
        flex: 1,
        fontSize: 12,
        fontWeight: "600",
    },
    remarkClose: {
        padding: 2,
    },

    // ✅ Legend (all remarks)
    legendBox: {
        marginTop: 10,
        backgroundColor: "#f9fafb",
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        gap: 6,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: "#6b7280",
    },

    resultInfo: { marginBottom: 8, marginTop: 4 },
    resultText: {
        fontSize: 11,
        color: "#6b7280",
        fontStyle: "italic",
    },

    fab: {
        position: "absolute",
        right: 20,
        bottom: 24,
        backgroundColor: "#0d9488",
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
    },
});