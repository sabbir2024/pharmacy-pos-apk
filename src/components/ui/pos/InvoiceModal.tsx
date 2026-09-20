import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
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
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
                    </View>

                    <Text style={styles.title}>বিল সেভ হয়েছে</Text>
                    <Text style={styles.subtitle}>ইনভয়েস #{invoice.id}</Text>

                    <View style={styles.summary}>
                        <Row label="তারিখ" value={formatDateTime(invoice.createdAt)} />
                        <Row label="মোট" value={formatTk(invoice.total)} />
                        <Row label="পরিশোধিত" value={formatTk(invoice.paid)} />
                        {invoice.isDue ? (
                            <Row
                                label="বাকি"
                                value={formatTk(invoice.dueAmount)}
                                color="#d97706"
                            />
                        ) : (
                            <Row
                                label="ফেরত"
                                value={formatTk(invoice.change)}
                                color="#16a34a"
                            />
                        )}
                        {invoice.customerName && (
                            <Row label="কাস্টমার" value={invoice.customerName} />
                        )}
                    </View>

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
                                    <Ionicons name="download-outline" size={20} color="#fff" />
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
                                    <Ionicons name="share-outline" size={20} color="#0d9488" />
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

function Row({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color?: string;
}) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={[styles.rowValue, color && { color }]}>{value}</Text>
        </View>
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
    summary: {
        backgroundColor: "#f9fafb",
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    rowLabel: { fontSize: 13, color: "#6b7280" },
    rowValue: { fontSize: 14, fontWeight: "700", color: "#111827" },
    actionsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
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