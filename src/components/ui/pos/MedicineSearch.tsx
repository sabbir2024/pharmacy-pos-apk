import { Ionicons } from "@expo/vector-icons";
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import type { Product } from "../../../db/products";

type Props = {
    query: string;
    onChangeQuery: (t: string) => void;
    results: Product[];
    onAdd: (p: Product) => void;
    onOpenScanner: () => void;   // 👈 নতুন প্রপ
};

export default function MedicineSearch({
    query,
    onChangeQuery,
    results,
    onAdd,
    onOpenScanner,
}: Props) {
    return (
        <View style={styles.wrap}>
            <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#9ca3af" />
                <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={onChangeQuery}
                    placeholder="ঔষধের নাম / বারকোড..."
                    placeholderTextColor="#9ca3af"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => onChangeQuery("")}>
                        <Ionicons name="close-circle" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                )}

                {/* 🆕 স্ক্যান বাটন */}
                <TouchableOpacity style={styles.scanBtn} onPress={onOpenScanner}>
                    <Ionicons name="barcode-outline" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {query.trim().length > 0 && (
                <View style={styles.results}>
                    <FlatList
                        data={results}
                        keyExtractor={(item) => String(item.id)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.resultItem}
                                onPress={() => onAdd(item)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rName}>{item.name}</Text>
                                    <Text style={styles.rSub}>
                                        {item.company} · স্টক: {item.stock} {item.unit}
                                    </Text>
                                </View>
                                <Text style={styles.rPrice}>৳ {item.price}</Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.empty}>কোনো ঔষধ পাওয়া যায়নি</Text>
                        }
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { zIndex: 10 },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingLeft: 12,
        paddingRight: 4,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 15,
        color: "#111827",
    },
    scanBtn: {                       // 🆕
        backgroundColor: "#0d9488",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 4,
    },
    results: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginTop: 6,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        maxHeight: 260,
    },
    resultItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    rName: { fontSize: 14, fontWeight: "700", color: "#111827" },
    rSub: { fontSize: 11, color: "#6b7280", marginTop: 2 },
    rPrice: { fontSize: 14, fontWeight: "700", color: "#0d9488" },
    empty: {
        padding: 16,
        textAlign: "center",
        color: "#9ca3af",
        fontSize: 13,
    },
});