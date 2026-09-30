import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Product } from "../../../db/products";

type Props = {
    product: Product;
    onEdit: (p: Product) => void;
    onDelete: (id: number) => void;
};

const LOW_STOCK_LIMIT = 10;

export default function ProductCard({ product, onEdit, onDelete }: Props) {
    const lowStock = product.stock <= LOW_STOCK_LIMIT;
    const outOfStock = product.stock <= 0;

    const expired = !!product.expiry && new Date(product.expiry) < new Date();
    const expiringSoon =
        !expired &&
        !!product.expiry &&
        new Date(product.expiry).getTime() - Date.now() <
        1000 * 60 * 60 * 24 * 90;

    // 🧮 per-pcs হিসাব
    const pcsPerUnit = product.pcsPerUnit > 0 ? product.pcsPerUnit : 1;
    const showPerPcs = product.unit !== "pcs" && pcsPerUnit > 1;
    const pricePerPcs = showPerPcs ? product.price / pcsPerUnit : 0;
    const costPerPcs =
        showPerPcs && product.costPrice > 0
            ? product.costPrice / pcsPerUnit
            : 0;

    const profit =
        product.costPrice > 0 ? product.price - product.costPrice : null;

    return (
        <View style={styles.card}>
            <View style={{ flex: 1 }}>
                {/* নাম + কোম্পানি */}
                <Text style={styles.name} numberOfLines={1}>
                    {product.name}
                </Text>
                {!!product.company && (
                    <Text style={styles.company} numberOfLines={1}>
                        {product.company}
                    </Text>
                )}

                {/* দাম + স্টক ব্যাজ */}
                <View style={styles.row}>
                    <Text style={styles.price}>
                        ৳ {product.price}
                        <Text style={styles.perUnit}> / {product.unit}</Text>
                    </Text>
                    <View
                        style={[
                            styles.badge,
                            outOfStock
                                ? styles.badgeDanger
                                : lowStock
                                    ? styles.badgeWarn
                                    : styles.badgeOk,
                        ]}
                    >
                        <Text
                            style={[
                                styles.badgeText,
                                outOfStock
                                    ? styles.textDanger
                                    : lowStock
                                        ? styles.textWarn
                                        : styles.textOk,
                            ]}
                        >
                            {outOfStock ? "শেষ" : `স্টক: ${product.stock}`}
                        </Text>
                    </View>
                </View>

                {/* 🆕 per pcs হিসাব */}
                {showPerPcs && (
                    <View style={styles.perPcsRow}>
                        <Ionicons name="pricetag-outline" size={12} color="#0d9488" />
                        <Text style={styles.perPcsText}>
                            ৳ {pricePerPcs.toFixed(2)} / pcs
                        </Text>
                        {costPerPcs > 0 && (
                            <Text style={styles.perPcsCost}>
                                · ক্রয় ৳ {costPerPcs.toFixed(2)}
                            </Text>
                        )}
                        <Text style={styles.perPcsDetail}>
                            ({pcsPerUnit} pcs / {product.unit})
                        </Text>
                    </View>
                )}

                {/* ক্রয়মূল্য + লাভ */}
                {product.costPrice > 0 && (
                    <View style={styles.costRow}>
                        <Text style={styles.costText}>ক্রয়: ৳ {product.costPrice}</Text>
                        {profit !== null && (
                            <Text
                                style={[
                                    styles.profitText,
                                    { color: profit >= 0 ? "#16a34a" : "#dc2626" },
                                ]}
                            >
                                লাভ: ৳ {profit.toFixed(2)}
                            </Text>
                        )}
                    </View>
                )}

                {/* এক্সপায়ারি */}
                {!!product.expiry && (
                    <View style={styles.expiryRow}>
                        <Ionicons
                            name={
                                expired
                                    ? "alert-circle"
                                    : expiringSoon
                                        ? "time-outline"
                                        : "calendar-outline"
                            }
                            size={12}
                            color={expired ? "#dc2626" : expiringSoon ? "#d97706" : "#6b7280"}
                        />
                        <Text
                            style={[
                                styles.expiry,
                                expired && { color: "#dc2626", fontWeight: "700" },
                                !expired && expiringSoon && { color: "#d97706" },
                            ]}
                        >
                            {expired ? "এক্সপায়ার্ড: " : "এক্সপায়ারি: "}
                            {product.expiry}
                        </Text>
                    </View>
                )}

                {/* বারকোড */}
                {!!product.barcode && (
                    <View style={styles.barcodeRow}>
                        <Ionicons name="barcode-outline" size={12} color="#9ca3af" />
                        <Text style={styles.barcode}>{product.barcode}</Text>
                    </View>
                )}
            </View>

            {/* অ্যাকশন বাটন */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => onEdit(product)}
                >
                    <Ionicons name="create-outline" size={20} color="#0d9488" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => product.id && onDelete(product.id)}
                >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    name: { fontSize: 16, fontWeight: "700", color: "#111827" },
    company: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        gap: 8,
        flexWrap: "wrap",
    },
    price: { fontSize: 15, fontWeight: "700", color: "#0d9488" },
    perUnit: { fontSize: 12, fontWeight: "500", color: "#6b7280" },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    badgeOk: { backgroundColor: "#dcfce7" },
    badgeWarn: { backgroundColor: "#fef3c7" },
    badgeDanger: { backgroundColor: "#fee2e2" },
    badgeText: { fontSize: 11, fontWeight: "600" },
    textOk: { color: "#166534" },
    textWarn: { color: "#92400e" },
    textDanger: { color: "#991b1b" },

    perPcsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
        gap: 4,
        flexWrap: "wrap",
    },
    perPcsText: { fontSize: 12, fontWeight: "700", color: "#0d9488" },
    perPcsCost: { fontSize: 11, color: "#6b7280" },
    perPcsDetail: { fontSize: 11, color: "#9ca3af" },

    costRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        gap: 10,
    },
    costText: { fontSize: 12, color: "#6b7280" },
    profitText: { fontSize: 12, fontWeight: "700" },

    expiryRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        gap: 4,
    },
    expiry: { fontSize: 11, color: "#6b7280" },

    barcodeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        gap: 4,
    },
    barcode: { fontSize: 11, color: "#9ca3af" },

    actions: { justifyContent: "space-between", marginLeft: 8 },
    iconBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#f9fafb",
        marginVertical: 2,
    },
});