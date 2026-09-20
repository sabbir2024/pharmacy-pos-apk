import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function QuickActions() {
    const router = useRouter();

    const actions = [
        {
            label: "নতুন বিক্রয়",
            icon: "cart-outline",
            color: "#0d9488",
            onPress: () => router.push("/(tabs)/sales"),
        },
        {
            label: "স্টক অ্যাড",
            icon: "add-circle-outline",
            color: "#3b82f6",
            onPress: () => router.push("/(tabs)/inventory"),
        },
        {
            label: "বাকি কাস্টমার",
            icon: "people-outline",
            color: "#d97706",
            onPress: () => router.push("/(tabs)/due"),
        },
    ];

    return (
        <View style={styles.wrap}>
            {actions.map((a) => (
                <TouchableOpacity
                    key={a.label}
                    style={styles.btn}
                    onPress={a.onPress}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconWrap, { backgroundColor: a.color + "20" }]}>
                        <Ionicons name={a.icon as any} size={22} color={a.color} />
                    </View>
                    <Text style={styles.label}>{a.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: "row",
        gap: 10,
    },
    btn: {
        flex: 1,
        alignItems: "center",
        backgroundColor: "#fff",
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    label: {
        fontSize: 11,
        color: "#374151",
        fontWeight: "600",
        textAlign: "center",
    },
});