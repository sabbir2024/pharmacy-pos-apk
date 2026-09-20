import { Ionicons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { Invoice } from "../../../db/invoices";
import InvoiceCard from "./InvoiceCard";

type Props = {
    invoices: Invoice[];
    onPress: (inv: Invoice) => void;
};

export default function InvoiceList({ invoices, onPress }: Props) {
    return (
        <FlatList
            data={invoices}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => (
                <InvoiceCard invoice={item} onPress={onPress} />
            )}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name="receipt-outline" size={54} color="#d1d5db" />
                    <Text style={styles.emptyText}>কোনো বিল নেই</Text>
                </View>
            }
            contentContainerStyle={
                invoices.length === 0 ? styles.emptyWrap : { paddingBottom: 20 }
            }
            showsVerticalScrollIndicator={false}
        />
    );
}

const styles = StyleSheet.create({
    emptyWrap: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
    empty: { alignItems: "center" },
    emptyText: { marginTop: 10, color: "#6b7280", fontSize: 14 },
});