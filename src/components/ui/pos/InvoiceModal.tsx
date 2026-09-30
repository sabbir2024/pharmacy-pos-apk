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
    getInvoiceById,
    getInvoiceItems,
} from "../../../db/invoices";
import { formatDateTime, formatTk } from "../../../utils/format";
import { generateInvoicePDF, sharePDF } from "../../../utils/pdf";

type Props = {
    visible: boolean;
    saleId: number | null;
    onClose: () => void;
};

export default function InvoiceModal({ visible, saleId, onClose }: Props) {
    const [loading, setLoading] = useState<"save" | "share" | null>(null);

    if (!saleId) return null;

    const invoice = getInvoiceById(saleId);
    const items = getInvoiceItems(saleId);

    if (!invoice) return null;

    // ============================
    // Values
    // ============================
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const total = invoice.total;
    const paid = invoice.paid;
    const change = invoice.change;
    const dueAmount = invoice.dueAmount;
    const isDue = invoice.isDue === 1;

    // ============================
    // PDF Download
    // ============================
    const handleDownload = async () => {
        try {
            setLoading("save");
            const uri = await generateInvoicePDF(invoice, items);
            await sharePDF(uri, `ইনভয়েস #${saleId} — সেভ করুন`);
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "PDF তৈরি করা যায়নি");
        } finally {
            setLoading(null);
        }
    };

    const handleShare = async () => {
        try {
            setLoading("share");
            const uri = await generateInvoicePDF(invoice, items);
            await sharePDF(uri, `ইনভয়েস #${saleId} শেয়ার করুন`);
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "শেয়ার করা যায়নি");
        } finally {
            setLoading(null);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Success icon */}
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
                    </View>

                    <Text style={styles.title}>বিল সেভ হয়েছে</Text>
                    <Text style={styles.subtitle}>ইনভয়েস #{invoice.id}</Text>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={{ maxHeight: 400 }}
                        contentContainerStyle={{ paddingBottom: 10 }}
                    >
                        {/* ============================ */}
                        {/* Bill Summary */}
                        {/* ============================ */}
                        <View style={styles.billBox}>
                            {/* Date */}
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>তারিখ</Text>
                                <Text style={styles.billValue}>
                                    {formatDateTime(invoice.createdAt)}
                                </Text>
                            </View>

                            {/* Customer */}
                            {invoice.customerName && (
                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>কাস্টমার</Text>
                                    <Text style={styles.billValue}>
                                        {invoice.customerName}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.divider} />

                            {/* Subtotal */}
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>সাবটোটাল</Text>
                                <Text style={styles.billValue}>{formatTk(subtotal)}</Text>
                            </View>

                            {/* Discount */}
                            {invoice.discount > 0 && (
                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>ডিসকাউন্ট</Text>
                                    <Text style={[styles.billValue, { color: "#dc2626" }]}>
                                        − {formatTk(invoice.discount)}
                                    </Text>
                                </View>
                            )}

                            {/* VAT */}
                            {invoice.vat > 0 && (
                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>VAT</Text>
                                    <Text style={[styles.billValue, { color: "#d97706" }]}>
                                        + {formatTk(invoice.vat)}
                                    </Text>
                                </View>
                            )}

                            {/* Total */}
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>মোট</Text>
                                <Text style={styles.totalValue}>{formatTk(total)}</Text>
                            </View>

                            <View style={styles.divider} />

                            {/* ============================ */}
                            {/* ✅ Payment Details */}
                            {/* ============================ */}
                            <View style={styles.billRow}>
                                <View style={styles.payLabelRow}>
                                    <Ionicons name="cash-outline" size={16} color="#16a34a" />
                                    <Text style={styles.payLabel}>কাস্টমার দিয়েছে</Text>
                                </View>
                                <Text style={styles.payValue}>{formatTk(paid)}</Text>
                            </View>

                            {/* Change / Due */}
                            {isDue ? (
                                <View style={styles.billRow}>
                                    <View style={styles.payLabelRow}>
                                        <Ionicons
                                            name="alert-circle-outline"
                                            size={16}
                                            color="#d97706"
                                        />
                                        <Text style={[styles.payLabel, { color: "#d97706" }]}>
                                            বাকি থাকবে
                                        </Text>
                                    </View>
                                    <Text
                                        style={[styles.payValue, { color: "#d97706" }]}
                                    >
                                        {formatTk(dueAmount)}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.billRow}>
                                    <View style={styles.payLabelRow}>
                                        <Ionicons
                                            name="return-down-back-outline"
                                            size={16}
                                            color="#dc2626"
                                        />
                                        <Text style={[styles.payLabel, { color: "#dc2626" }]}>
                                            ফেরত দিতে হবে
                                        </Text>
                                    </View>
                                    <Text
                                        style={[styles.payValue, { color: "#dc2626" }]}
                                    >
                                        {formatTk(change)}
                                    </Text>
                                </View>
                            )}

                            {/* Payment method */}
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>পেমেন্ট মেথড</Text>
                                <Text style={styles.billValue}>
                                    {invoice.paymentMethod === "cash"
                                        ? "ক্যাশ"
                                        : invoice.paymentMethod === "card"
                                            ? "কার্ড"
                                            : "বিকাশ"}
                                </Text>
                            </View>

                            {/* Status badge */}
                            <View style={styles.statusBox}>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        isDue ? styles.statusDue : styles.statusPaid,
                                    ]}
                                >
                                    <Ionicons
                                        name={isDue ? "time-outline" : "checkmark-circle"}
                                        size={14}
                                        color={isDue ? "#92400e" : "#166534"}
                                    />
                                    <Text
                                        style={[
                                            styles.statusText,
                                            isDue ? styles.statusTextDue : styles.statusTextPaid,
                                        ]}
                                    >
                                        {isDue ? "বাকি আছে" : "সম্পূর্ণ পরিশোধিত"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* ============================ */}
                    {/* Actions */}
                    {/* ============================ */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.saveBtn]}
                            onPress={handleDownload}
                            disabled={loading !== null}
                        >
                            {loading === "save" ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons
                                        name="download-outline"
                                        size={20}
                                        color="#fff"
                                    />
                                    <Text style={styles.actionText}>PDF সেভ</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.shareBtn]}
                            onPress={handleShare}
                            disabled={loading !== null}
                        >
                            {loading === "share" ? (
                                <ActivityIndicator color="#0d9488" />
                            ) : (
                                <>
                                    <Ionicons
                                        name="share-outline"
                                        size={20}
                                        color="#0d9488"
                                    />
                                    <Text style={[styles.actionText, { color: "#0d9488" }]}>
                                        শেয়ার
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeText}>বন্ধ করুন</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    container: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        maxHeight: "95%",
    },
    successIcon: { alignItems: "center", marginBottom: 8 },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: "#111827",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "center",
        marginBottom: 16,
    },

    billBox: {
        backgroundColor: "#f9fafb",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    billRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 5,
    },
    billLabel: { fontSize: 13, color: "#6b7280" },
    billValue: { fontSize: 13, fontWeight: "600", color: "#111827" },

    payLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    payLabel: {
        fontSize: 13,
        color: "#16a34a",
        fontWeight: "600",
    },
    payValue: {
        fontSize: 15,
        fontWeight: "800",
        color: "#16a34a",
    },

    divider: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginVertical: 8,
    },

    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
    },
    totalLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
    totalValue: { fontSize: 22, fontWeight: "800", color: "#0d9488" },

    statusBox: {
        alignItems: "center",
        marginTop: 12,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusPaid: { backgroundColor: "#dcfce7" },
    statusDue: { backgroundColor: "#fef3c7" },
    statusText: { fontSize: 12, fontWeight: "700" },
    statusTextPaid: { color: "#166534" },
    statusTextDue: { color: "#92400e" },

    actionsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 12,
        marginBottom: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
    },
    saveBtn: { backgroundColor: "#0d9488" },
    shareBtn: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#0d9488",
    },
    actionText: { color: "#fff", fontWeight: "700" },

    closeBtn: {
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: "#f3f4f6",
    },
    closeText: { color: "#374151", fontWeight: "700" },
});