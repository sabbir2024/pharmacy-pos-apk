import { Ionicons } from "@expo/vector-icons";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { formatDateTime } from "../../../utils/format";

type Props = {
    name: string;
    email: string;
    shopName?: string;
    role?: string;
    isLoggedIn: boolean;
    lastSyncAt?: string | null;
    onPress?: () => void;
    onLoginPress?: () => void;
};

export default function ProfileHeader({
    name,
    email,
    shopName,
    role,
    isLoggedIn,
    lastSyncAt,
    onPress,
    onLoginPress,
}: Props) {
    // Initials
    const initials = name
        ? name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .substring(0, 2)
            .toUpperCase()
        : "?";

    const isAdmin = role === "admin";

    if (!isLoggedIn) {
        // Not logged in state
        return (
            <View style={styles.card}>
                <View style={styles.avatarGuest}>
                    <Ionicons name="person-outline" size={32} color="#0d9488" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.guestTitle}>লগইন করা নেই</Text>
                    <Text style={styles.guestSub}>
                        ক্লাউড সিঙ্ক ও সব ফিচার পেতে লগইন করুন
                    </Text>
                </View>
                <TouchableOpacity style={styles.loginBtn} onPress={onLoginPress}>
                    <Text style={styles.loginBtnText}>লগইন</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={onPress ? 0.7 : 1}
            onPress={onPress}
            disabled={!onPress}
        >
            {/* Avatar */}
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                        {name || "User"}
                    </Text>
                    {isAdmin && (
                        <View style={styles.adminBadge}>
                            <Ionicons name="shield-checkmark" size={10} color="#fff" />
                            <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.email} numberOfLines={1}>
                    {email}
                </Text>
                {!!shopName && (
                    <Text style={styles.shop} numberOfLines={1}>
                        🏪 {shopName}
                    </Text>
                )}
                {lastSyncAt && (
                    <Text style={styles.lastSync}>
                        শেষ সিঙ্ক: {formatDateTime(lastSyncAt)}
                    </Text>
                )}
            </View>

            {/* Arrow */}
            {onPress && (
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#0d9488",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "800",
    },
    avatarGuest: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#f0fdfa",
        alignItems: "center",
        justifyContent: "center",
    },
    guestTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#111827",
    },
    guestSub: {
        fontSize: 11,
        color: "#6b7280",
        marginTop: 2,
    },
    loginBtn: {
        backgroundColor: "#0d9488",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    loginBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 13,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    name: {
        fontSize: 17,
        fontWeight: "800",
        color: "#111827",
        flexShrink: 1,
    },
    adminBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#7c3aed",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    adminBadgeText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "800",
    },
    email: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 3,
    },
    shop: {
        fontSize: 12,
        color: "#0d9488",
        marginTop: 2,
        fontWeight: "600",
    },
    lastSync: {
        fontSize: 10,
        color: "#9ca3af",
        marginTop: 3,
    },
});