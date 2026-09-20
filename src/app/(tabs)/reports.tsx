import { InvoiceList } from "@/components/ui/history";
import InvoiceModal from "@/components/ui/pos/InvoiceModal";
import { getAllInvoices, type Invoice } from "@/db/invoices";
import { formatTk } from "@/utils/format";
import { useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Reports() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [openId, setOpenId] = useState<number | null>(null);

    const load = () => setInvoices(getAllInvoices());

    useFocusEffect(
        React.useCallback(() => {
            load();
        }, [])
    );

    const totalSale = invoices.reduce((s, i) => s + i.total, 0);
    const totalDue = invoices.reduce((s, i) => s + i.dueAmount, 0);

    return (
        <View style={styles.container}>
            <View style={styles.summary}>
                <View style={styles.sumBox}>
                    <Text style={styles.sumLabel}>মোট বিক্রয়</Text>
                    <Text style={[styles.sumValue, { color: "#0d9488" }]}>
                        {formatTk(totalSale)}
                    </Text>
                </View>
                <View style={styles.sumBox}>
                    <Text style={styles.sumLabel}>মোট বাকি</Text>
                    <Text style={[styles.sumValue, { color: "#d97706" }]}>
                        {formatTk(totalDue)}
                    </Text>
                </View>
            </View>

            <InvoiceList
                invoices={invoices}
                onPress={(inv) => setOpenId(inv.id)}
            />

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
    container: { flex: 1, padding: 14, backgroundColor: "#f9fafb" },
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