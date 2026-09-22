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
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function Inventory() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [importOpen, setImportOpen] = useState(false);

    // ============================
    // Load Products
    // ============================
    const loadProducts = useCallback(() => {
        try {
            const data = getAllProducts();
            setProducts(data);
        } catch (e) {
            console.error("Load error:", e);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadProducts();
        }, [loadProducts])
    );

    const filtered = search.trim()
        ? products.filter(
            (p) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.company?.toLowerCase().includes(search.toLowerCase()) ||
                p.barcode?.includes(search)
        )
        : products;

    // ============================
    // ✅ Save (async)
    // ============================
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

    // ============================
    // ✅ Delete (async)
    // ============================
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

    // ============================
    // ✅ Import (async)
    // ============================
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

    // ============================
    // Export
    // ============================
    const handleExport = async () => {
        if (products.length === 0) {
            Alert.alert("খালি", "কোনো ঔষধ নেই");
            return;
        }
        try {
            await exportProductsToExcel(products);
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "এক্সপোর্ট করা যায়নি");
        }
    };

    // ============================
    // Stats
    // ============================
    const totalProducts = products.length;
    const lowStock = products.filter(
        (p) => p.stock > 0 && p.stock <= 10
    ).length;
    const outOfStock = products.filter((p) => p.stock <= 0).length;

    return (
        <View style={styles.container}>
            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>মোট ঔষধ</Text>
                    <Text style={[styles.statValue, { color: "#0d9488" }]}>
                        {totalProducts}
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
                        {outOfStock}
                    </Text>
                </View>
            </View>

            {/* Top Actions */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.topBtn}
                    onPress={() => setImportOpen(true)}
                >
                    <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color="#0d9488"
                    />
                    <Text style={styles.topBtnText}>ইমপোর্ট</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.topBtn} onPress={handleExport}>
                    <Ionicons
                        name="cloud-download-outline"
                        size={18}
                        color="#0d9488"
                    />
                    <Text style={styles.topBtnText}>এক্সপোর্ট</Text>
                </TouchableOpacity>
            </View>

            <SearchBar value={search} onChangeText={setSearch} />

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
    statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
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
    topBar: { flexDirection: "row", gap: 8, marginBottom: 12 },
    topBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#0d9488",
        backgroundColor: "#fff",
    },
    topBtnText: { color: "#0d9488", fontWeight: "700", fontSize: 13 },
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