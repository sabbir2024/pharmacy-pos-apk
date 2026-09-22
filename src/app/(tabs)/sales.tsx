import {
    BillSummary,
    CartList,
    MedicineSearch,
    PaymentModal,
} from "@/components/ui/pos";
import DueCustomerModal from "@/components/ui/pos/DueCustomerModal";
import InvoiceModal from "@/components/ui/pos/InvoiceModal";
import BarcodeScanner from "@/components/ui/stock/BarcodeScanner";
import { getAllProducts, type Product } from "@/db/products";
import { saveSale, type CartItem } from "@/db/sales";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type PaymentMethod = "cash" | "card" | "bkash";

export default function Sales() {
    const [products, setProducts] = useState<Product[]>([]);
    const [query, setQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState(0);
    const [vat, setVat] = useState(0);

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [lastSaleId, setLastSaleId] = useState<number | null>(null);

    // Due flow
    const [dueModalOpen, setDueModalOpen] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<{
        paid: number;
        method: PaymentMethod;
    } | null>(null);

    // স্ক্রিনে ফোকাস হলে ঔষধ লিস্ট রিফ্রেশ
    useFocusEffect(
        React.useCallback(() => {
            setProducts(getAllProducts());
        }, [])
    );

    // সার্চ রেজাল্ট
    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.company?.toLowerCase().includes(q) ||
                p.barcode?.includes(q)
        );
    }, [query, products]);

    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal - discount + vat;

    // ============================
    // কার্টে যোগ
    // ============================
    const addToCart = (p: Product) => {
        if (p.stock <= 0) {
            Alert.alert("স্টক নেই", `${p.name} এর স্টক শেষ`);
            return;
        }
        setCart((prev) => {
            const existing = prev.find((i) => i.medicineId === p.id);
            if (existing) {
                if (existing.qty + 1 > p.stock) {
                    Alert.alert("স্টক সীমিত", `মাত্র ${p.stock} ${p.unit} আছে`);
                    return prev;
                }
                return prev.map((i) =>
                    i.medicineId === p.id ? { ...i, qty: i.qty + 1 } : i
                );
            }
            return [
                ...prev,
                {
                    medicineId: p.id!,
                    name: p.name,
                    price: p.price,
                    qty: 1,
                    unit: p.unit,
                },
            ];
        });
        setQuery("");
    };

    const changeQty = (id: number, delta: number) => {
        const product = products.find((p) => p.id === id);
        if (!product) return;

        setCart((prev) =>
            prev
                .map((i) => {
                    if (i.medicineId !== id) return i;
                    const newQty = i.qty + delta;
                    if (newQty > product.stock) {
                        Alert.alert("স্টক সীমিত", `মাত্র ${product.stock} আছে`);
                        return i;
                    }
                    return { ...i, qty: newQty };
                })
                .filter((i) => i.qty > 0)
        );
    };

    const removeItem = (id: number) => {
        setCart((prev) => prev.filter((i) => i.medicineId !== id));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        Alert.alert("কার্ট খালি", "সব আইটেম মুছে ফেলবেন?", [
            { text: "না", style: "cancel" },
            {
                text: "হ্যাঁ",
                style: "destructive",
                onPress: () => {
                    setCart([]);
                    setDiscount(0);
                    setVat(0);
                },
            },
        ]);
    };

    // বারকোড স্ক্যান
    const handleBarcodeScan = (code: string) => {
        const product = products.find((p) => p.barcode === code);
        if (!product) {
            Alert.alert("পাওয়া যায়নি", `বারকোড ${code} এর কোনো ঔষধ নেই`);
            return;
        }
        addToCart(product);
    };

    // ============================
    // বিক্রয়ের পর রিসেট
    // ============================
    const resetAfterSale = () => {
        setPaymentOpen(false);
        setDueModalOpen(false);
        setPendingPayment(null);
        setCart([]);
        setDiscount(0);
        setVat(0);
        setProducts(getAllProducts());
    };

    // ============================
    // ✅ Payment Confirm (async)
    // ============================
    const handleConfirmPayment = async (
        paid: number,
        method: PaymentMethod
    ) => {
        if (paid >= total) {
            // সম্পূর্ণ পেমেন্ট
            try {
                const saleId = await saveSale({
                    items: cart,
                    discount,
                    vat,
                    paid,
                    paymentMethod: method,
                });

                setProducts(getAllProducts());
                setLastSaleId(saleId);
                resetAfterSale();
                setInvoiceOpen(true);
            } catch (e) {
                console.error("SAVE ERROR:", e);
                Alert.alert("ত্রুটি", "বিল সেভ করা যায়নি");
            }
        } else {
            // আংশিক পেমেন্ট → Due customer
            setPendingPayment({ paid, method });
            setPaymentOpen(false);
            setDueModalOpen(true);
        }
    };

    // ============================
    // ✅ Due Customer Selected (async)
    // ============================
    const handleDueCustomerSelected = async (customerId: number) => {
        if (!pendingPayment) return;
        try {
            const saleId = await saveSale({
                items: cart,
                discount,
                vat,
                paid: pendingPayment.paid,
                paymentMethod: pendingPayment.method,
                customerId,
            });

            setProducts(getAllProducts());
            setLastSaleId(saleId);
            resetAfterSale();
            setInvoiceOpen(true);
        } catch (e) {
            console.error("SAVE ERROR (DUE):", e);
            Alert.alert("ত্রুটি", "বিল সেভ করা যায়নি");
        }
    };

    const dueAmount = pendingPayment ? total - pendingPayment.paid : 0;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.container}>
                {/* সার্চ + স্ক্যান */}
                <MedicineSearch
                    query={query}
                    onChangeQuery={setQuery}
                    results={results}
                    onAdd={addToCart}
                    onOpenScanner={() => setScannerOpen(true)}
                />

                {/* কার্ট */}
                <View style={{ flex: 1, marginTop: 12 }}>
                    <CartList
                        items={cart}
                        onChangeQty={changeQty}
                        onRemove={removeItem}
                    />
                </View>

                {/* বিল সামারি */}
                {cart.length > 0 && (
                    <BillSummary
                        subtotal={subtotal}
                        discount={discount}
                        vat={vat}
                        onChangeDiscount={setDiscount}
                        onChangeVat={setVat}
                    />
                )}

                {/* অ্যাকশন বার */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
                        <Ionicons name="trash-outline" size={20} color="#dc2626" />
                        <Text style={styles.clearText}>ক্লিয়ার</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.payBtn,
                            cart.length === 0 && { opacity: 0.5 },
                        ]}
                        disabled={cart.length === 0}
                        onPress={() => setPaymentOpen(true)}
                    >
                        <Ionicons name="card-outline" size={20} color="#fff" />
                        <Text style={styles.payText}>
                            পেমেন্ট · ৳ {total.toFixed(0)}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Modals */}
                <PaymentModal
                    visible={paymentOpen}
                    total={total}
                    onClose={() => setPaymentOpen(false)}
                    onConfirm={handleConfirmPayment}
                />

                <DueCustomerModal
                    visible={dueModalOpen}
                    dueAmount={dueAmount}
                    onClose={() => {
                        setDueModalOpen(false);
                        setPendingPayment(null);
                        setPaymentOpen(true);
                    }}
                    onConfirm={handleDueCustomerSelected}
                />

                <InvoiceModal
                    visible={invoiceOpen}
                    saleId={lastSaleId}
                    onClose={() => {
                        setInvoiceOpen(false);
                        setLastSaleId(null);
                    }}
                />

                <BarcodeScanner
                    visible={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScanned={handleBarcodeScan}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 14, backgroundColor: "#f9fafb" },
    bottomBar: {
        flexDirection: "row",
        gap: 10,
        marginTop: 12,
    },
    clearBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#fecaca",
        backgroundColor: "#fff",
    },
    clearText: { color: "#dc2626", fontWeight: "700" },
    payBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#0d9488",
    },
    payText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});