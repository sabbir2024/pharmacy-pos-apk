import { Ionicons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { Customer } from "../../../db/customers";
import CustomerCard from "./CustomerCard";

type Props = {
    customers: Customer[];
    onView: (c: Customer) => void;
    onEdit: (c: Customer) => void;
    onPay: (c: Customer) => void;
    onDelete: (id: number) => void;
};

export default function CustomerList({
    customers,
    onView,
    onEdit,
    onPay,
    onDelete,
}: Props) {
    return (
        <FlatList
            data={customers}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => (
                <CustomerCard
                    customer={item}
                    onView={onView}
                    onEdit={onEdit}
                    onPay={onPay}
                    onDelete={onDelete}
                />
            )}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name="people-outline" size={54} color="#d1d5db" />
                    <Text style={styles.emptyText}>কোনো বাকি কাস্টমার নেই</Text>
                </View>
            }
            contentContainerStyle={
                customers.length === 0 ? styles.emptyWrap : { paddingBottom: 20 }
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