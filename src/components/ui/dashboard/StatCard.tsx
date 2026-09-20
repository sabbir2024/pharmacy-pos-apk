import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type Props = {
    label: string;
    value: string;
    icon: any;
    color?: string;
    bgColor?: string;
    sub?: string;
};

export default function StatCard({
    label,
    value,
    icon,
    color = "#0d9488",
    bgColor = "#f0fdfa",
    sub,
}: Props) {
    return (
        <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>{label}</Text>
                <Text style={[styles.value, { color }]}>{value}</Text>
                {!!sub && <Text style={styles.sub}>{sub}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        gap: 12,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    label: { fontSize: 12, color: "#6b7280" },
    value: { fontSize: 18, fontWeight: "800", marginTop: 2 },
    sub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
});