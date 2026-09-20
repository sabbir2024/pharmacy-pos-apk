import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function EmptyState() {
    return (
        <View style={styles.wrap}>
            <Ionicons name="medkit-outline" size={64} color="#d1d5db" />
            <Text style={styles.text}>কোনো ঔষধ পাওয়া যায়নি</Text>
            <Text style={styles.sub}>নতুন ঔষধ অ্যাড করুন</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: "center", paddingVertical: 60 },
    text: { marginTop: 12, fontSize: 16, fontWeight: "600", color: "#374151" },
    sub: { marginTop: 4, fontSize: 13, color: "#9ca3af" },
});