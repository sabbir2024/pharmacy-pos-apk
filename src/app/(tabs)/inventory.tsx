import {
    AddProductModal,
    ProductList,
    SearchBar,
    type Product,
} from "@/components/ui/stock";
import {
    addProduct,
    deleteProduct,
    getAllProducts,
    updateProduct,
} from "@/db/products";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";

export default function Inventory() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);

    const loadProducts = () => {
        try {
            const data = getAllProducts();
            setProducts(data);
        } catch (e) {
            console.error("Load error:", e);
        }
    };

    // স্ক্রিনে ফোকাস হলে রিফ্রেশ
    useFocusEffect(
        useCallback(() => {
            loadProducts();
        }, [])
    );

    const filtered = search.trim()
        ? products.filter(
            (p) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.company?.toLowerCase().includes(search.toLowerCase()) ||
                p.barcode?.includes(search)
        )
        : products;

    const handleSave = (product: Product) => {
        try {
            if (product.id) {
                updateProduct(product);
            } else {
                addProduct(product);
            }
            loadProducts();
            setEditing(null);
        } catch (e) {
            Alert.alert("ত্রুটি", "সেভ করা যায়নি");
            console.error(e);
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert("ডিলিট", "আপনি কি নিশ্চিত?", [
            { text: "না", style: "cancel" },
            {
                text: "হ্যাঁ",
                style: "destructive",
                onPress: () => {
                    deleteProduct(id);
                    loadProducts();
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <SearchBar value={search} onChangeText={setSearch} />
            <ProductList
                products={filtered}
                onEdit={(p) => {
                    setEditing(p);
                    setModalOpen(true);
                }}
                onDelete={handleDelete}
            />

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
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
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
});