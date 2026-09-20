import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
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
    downloadCustomerTemplate,
    downloadLowStockTemplate,
    downloadProductTemplate,
} from "../../../utils/backupTemplates";
import {
    exportCustomersToExcel,
    exportLowStockToExcel,
    exportProductsToExcel,
    parseCustomerExcel,
    parseExcelFile,
    parseLowStockExcel,
} from "../../../utils/excel";
import {
    generateCustomersPDF,
    generateLowStockPDF,
    generateProductsPDF,
    sharePDF,
} from "../../../utils/pdf";

import { bulkAddCustomers, getAllCustomers } from "../../../db/customers";
import { getLowStockItems } from "../../../db/dashboard";
import {
    bulkAddProducts,
    bulkUpdateStock,
    getAllProducts,
} from "../../../db/products";

type Category = "product" | "customer" | "lowstock";

type CategoryConfig = {
    key: Category;
    label: string;
    icon: any;
    color: string;
    bgColor: string;
};

const CATEGORIES: CategoryConfig[] = [
    {
        key: "product",
        label: "প্রোডাক্ট",
        icon: "medkit-outline",
        color: "#0d9488",
        bgColor: "#f0fdfa",
    },
    {
        key: "customer",
        label: "বাকি কাস্টমার",
        icon: "people-outline",
        color: "#d97706",
        bgColor: "#fef3c7",
    },
    {
        key: "lowstock",
        label: "কম স্টক",
        icon: "warning-outline",
        color: "#dc2626",
        bgColor: "#fee2e2",
    },
];

export default function DataManagement() {
    const [modalOpen, setModalOpen] = useState(false);
    const [activeCat, setActiveCat] = useState<Category>("product");
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    const openModal = (cat: Category) => {
        setActiveCat(cat);
        setModalOpen(true);
    };

    // ============================
    // টেমপ্লেট ডাউনলোড
    // ============================
    const handleTemplate = async () => {
        try {
            if (activeCat === "product") await downloadProductTemplate();
            else if (activeCat === "customer") await downloadCustomerTemplate();
            else await downloadLowStockTemplate();
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "টেমপ্লেট ডাউনলোড করা যায়নি");
        }
    };

    // ============================
    // Excel এক্সপোর্ট
    // ============================
    const handleExport = async () => {
        try {
            if (activeCat === "product") {
                const data = getAllProducts();
                if (data.length === 0)
                    return Alert.alert("খালি", "কোনো প্রোডাক্ট নেই");
                await exportProductsToExcel(data);
            } else if (activeCat === "customer") {
                const data = getAllCustomers();
                if (data.length === 0)
                    return Alert.alert("খালি", "কোনো কাস্টমার নেই");
                await exportCustomersToExcel(data);
            } else {
                const data = getLowStockItems();
                if (data.length === 0)
                    return Alert.alert("খালি", "কোনো কম স্টক আইটেম নেই");
                await exportLowStockToExcel(data);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "এক্সপোর্ট করা যায়নি");
        }
    };

    // ============================
    // 🆕 PDF এক্সপোর্ট
    // ============================
    const handlePDF = async () => {
        try {
            setPdfLoading(true);

            if (activeCat === "product") {
                const data = getAllProducts();
                if (data.length === 0) {
                    Alert.alert("খালি", "কোনো প্রোডাক্ট নেই");
                    return;
                }
                const uri = await generateProductsPDF(data);
                await sharePDF(uri, "প্রোডাক্ট রিপোর্ট PDF");
            } else if (activeCat === "customer") {
                const data = getAllCustomers();
                if (data.length === 0) {
                    Alert.alert("খালি", "কোনো কাস্টমার নেই");
                    return;
                }
                const uri = await generateCustomersPDF(data);
                await sharePDF(uri, "কাস্টমার স্টেটমেন্ট PDF");
            } else {
                const data = getLowStockItems();
                if (data.length === 0) {
                    Alert.alert("খালি", "কোনো কম স্টক আইটেম নেই");
                    return;
                }
                const uri = await generateLowStockPDF(data);
                await sharePDF(uri, "কম স্টক রিপোর্ট PDF");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "PDF তৈরি করা যায়নি");
        } finally {
            setPdfLoading(false);
        }
    };

    // ============================
    // Excel ইমপোর্ট
    // ============================
    const handleImport = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-excel",
                    "text/csv",
                    "*/*",
                ],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            setLoading(true);

            if (activeCat === "product") {
                const { products, errors } = await parseExcelFile(file.uri);
                if (products.length === 0) {
                    Alert.alert(
                        "কিছু পাওয়া যায়নি",
                        errors.length ? errors.slice(0, 3).join("\n") : "ফাইল খালি"
                    );
                    return;
                }
                const { inserted, skipped } = bulkAddProducts(products);
                Alert.alert(
                    "সফল",
                    `${inserted}টি অ্যাড হয়েছে${skipped > 0 ? `\n${skipped}টি বাদ (ডুপ্লিকেট)` : ""
                    }`
                );
            } else if (activeCat === "customer") {
                const { customers, errors } = await parseCustomerExcel(file.uri);
                if (customers.length === 0) {
                    Alert.alert(
                        "কিছু পাওয়া যায়নি",
                        errors.length ? errors.slice(0, 3).join("\n") : "ফাইল খালি"
                    );
                    return;
                }
                const { inserted, skipped } = bulkAddCustomers(customers);
                Alert.alert(
                    "সফল",
                    `${inserted}টি কাস্টমার অ্যাড হয়েছে${skipped > 0 ? `\n${skipped}টি বাদ (ডুপ্লিকেট ফোন)` : ""
                    }`
                );
            } else {
                const { updates, errors } = await parseLowStockExcel(file.uri);
                if (updates.length === 0) {
                    Alert.alert(
                        "কিছু পাওয়া যায়নি",
                        errors.length ? errors.slice(0, 3).join("\n") : "ফাইল খালি"
                    );
                    return;
                }
                const { updated, skipped } = bulkUpdateStock(updates);
                Alert.alert(
                    "সফল",
                    `${updated}টি স্টক আপডেট হয়েছে${skipped > 0 ? `\n${skipped}টি বাদ (ভুল ID)` : ""
                    }`
                );
            }
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "ফাইল প্রসেস করা যায়নি");
        } finally {
            setLoading(false);
        }
    };

    const activeCatObj =
        CATEGORIES.find((c) => c.key === activeCat) ?? CATEGORIES[0];

    return (
        <>
            <View style={styles.wrap}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>ডেটা ম্যানেজমেন্ট</Text>
                        <Text style={styles.subtitle}>
                            Excel ইমপোর্ট · Excel/PDF এক্সপোর্ট
                        </Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <Ionicons name="swap-vertical-outline" size={20} color="#0d9488" />
                    </View>
                </View>

                <View style={styles.catRow}>
                    {CATEGORIES.map((c) => (
                        <TouchableOpacity
                            key={c.key}
                            style={styles.catBtn}
                            onPress={() => openModal(c.key)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.catIcon, { backgroundColor: c.bgColor }]}>
                                <Ionicons name={c.icon} size={22} color={c.color} />
                            </View>
                            <Text style={styles.catLabel}>{c.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* মডাল */}
            <Modal
                visible={modalOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setModalOpen(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <View
                                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                            >
                                <View
                                    style={[
                                        styles.catIcon,
                                        { backgroundColor: activeCatObj.bgColor },
                                    ]}
                                >
                                    <Ionicons
                                        name={activeCatObj.icon}
                                        size={20}
                                        color={activeCatObj.color}
                                    />
                                </View>
                                <Text style={styles.modalTitle}>{activeCatObj.label}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalOpen(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="large" color="#0d9488" />
                                <Text style={styles.loadingText}>প্রসেস হচ্ছে...</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* টেমপ্লেট */}
                                <TouchableOpacity
                                    style={styles.actionRow}
                                    onPress={handleTemplate}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[styles.actionIcon, { backgroundColor: "#e0f2fe" }]}
                                    >
                                        <Ionicons
                                            name="document-text-outline"
                                            size={20}
                                            color="#0284c7"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.actionTitle}>টেমপ্লেট ডাউনলোড</Text>
                                        <Text style={styles.actionDesc}>
                                            ডেমো ডেটা সহ Excel ফাইল
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="download-outline"
                                        size={20}
                                        color="#0284c7"
                                    />
                                </TouchableOpacity>

                                {/* ইমপোর্ট */}
                                <TouchableOpacity
                                    style={styles.actionRow}
                                    onPress={handleImport}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[styles.actionIcon, { backgroundColor: "#d1fae5" }]}
                                    >
                                        <Ionicons
                                            name="cloud-upload-outline"
                                            size={20}
                                            color="#059669"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.actionTitle}>Excel ইমপোর্ট</Text>
                                        <Text style={styles.actionDesc}>
                                            ফাইল থেকে ডেটা যোগ / আপডেট
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={20}
                                        color="#9ca3af"
                                    />
                                </TouchableOpacity>

                                {/* Excel এক্সপোর্ট */}
                                <TouchableOpacity
                                    style={styles.actionRow}
                                    onPress={handleExport}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[styles.actionIcon, { backgroundColor: "#fef3c7" }]}
                                    >
                                        <Ionicons name="grid-outline" size={20} color="#d97706" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.actionTitle}>Excel এক্সপোর্ট</Text>
                                        <Text style={styles.actionDesc}>
                                            ডেটা Excel (.xlsx) ফাইলে সেভ
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={20}
                                        color="#9ca3af"
                                    />
                                </TouchableOpacity>

                                {/* 🆕 PDF এক্সপোর্ট */}
                                <TouchableOpacity
                                    style={styles.actionRow}
                                    onPress={handlePDF}
                                    activeOpacity={0.7}
                                    disabled={pdfLoading}
                                >
                                    <View
                                        style={[styles.actionIcon, { backgroundColor: "#fee2e2" }]}
                                    >
                                        {pdfLoading ? (
                                            <ActivityIndicator color="#dc2626" size="small" />
                                        ) : (
                                            <Ionicons
                                                name="document-outline"
                                                size={20}
                                                color="#dc2626"
                                            />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.actionTitle}>PDF রিপোর্ট</Text>
                                        <Text style={styles.actionDesc}>
                                            {pdfLoading
                                                ? "তৈরি হচ্ছে..."
                                                : "প্রিন্ট-রেডি PDF ডাউনলোড"}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="download-outline"
                                        size={20}
                                        color="#dc2626"
                                    />
                                </TouchableOpacity>

                                {/* নোট */}
                                <View style={styles.noteBox}>
                                    <Ionicons
                                        name="information-circle-outline"
                                        size={16}
                                        color="#0284c7"
                                    />
                                    <Text style={styles.noteText}>
                                        {activeCat === "product"
                                            ? "Excel ইমপোর্টে নাম ও বিক্রয়মূল্য আবশ্যক। একই বারকোড থাকলে ডুপ্লিকেট বাদ যাবে।"
                                            : activeCat === "customer"
                                                ? "Excel ইমপোর্টে নাম আবশ্যক। একই ফোন নম্বর থাকলে ডুপ্লিকেট বাদ যাবে।"
                                                : "Excel ইমপোর্টে ID ও নতুন স্টক আবশ্যক। ID অনুযায়ী স্টক আপডেট হবে।"}
                                    </Text>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    wrap: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    title: { fontSize: 14, fontWeight: "800", color: "#374151" },
    subtitle: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#f0fdfa",
        alignItems: "center",
        justifyContent: "center",
    },
    catRow: { flexDirection: "row", gap: 10 },
    catBtn: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    catIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    catLabel: {
        fontSize: 11,
        color: "#374151",
        fontWeight: "600",
        textAlign: "center",
    },

    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    modalBox: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },

    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: "#f9fafb",
        borderRadius: 12,
        marginBottom: 10,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    actionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
    actionDesc: { fontSize: 11, color: "#6b7280", marginTop: 2 },

    noteBox: {
        flexDirection: "row",
        gap: 6,
        backgroundColor: "#eff6ff",
        borderRadius: 10,
        padding: 10,
        marginTop: 6,
    },
    noteText: { flex: 1, fontSize: 11, color: "#1e40af", lineHeight: 16 },

    loadingBox: { paddingVertical: 40, alignItems: "center" },
    loadingText: { marginTop: 10, color: "#6b7280" },
});