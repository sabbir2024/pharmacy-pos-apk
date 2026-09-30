import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { ProfileHeader } from "@/components/ui/settings";
import { getUser, isLoggedIn, logout } from "@/db/sync";

export default function SettingsMenu() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loggedIn, setLoggedIn] = useState(false);

    // Load user
    const loadUser = async () => {
        try {
            const logged = await isLoggedIn();
            setLoggedIn(logged);

            if (logged) {
                const u = await getUser();
                const local = await AsyncStorage.getItem("@profile_override");
                if (local) {
                    const parsed = JSON.parse(local);
                    setUser({ ...u, ...parsed });
                } else {
                    setUser(u);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadUser();
        }, [])
    );

    const handleLogout = () => {
        Alert.alert("লগআউট", "লগআউট করবেন?", [
            { text: "বাতিল", style: "cancel" },
            {
                text: "লগআউট",
                style: "destructive",
                onPress: async () => {
                    await logout();
                    loadUser();
                },
            },
        ]);
    };

    const appVersion = Constants.expoConfig?.version || "3.0.4";

    // Menu items
    const MENU_ITEMS = [
        {
            icon: "person-circle-outline",
            iconBg: "#dbeafe",
            iconColor: "#3b82f6",
            title: "প্রোফাইল",
            subtitle: "Info, security, backup, about",
            route: "/settings/profile", // 🆕
        },
        {
            icon: "notifications-outline",
            iconBg: "#fef3c7",
            iconColor: "#d97706",
            title: "নোটিফিকেশন",
            subtitle: "Expiry, low stock alert",
            route: null,
        },
        {
            icon: "language-outline",
            iconBg: "#ede9fe",
            iconColor: "#8b5cf6",
            title: "ভাষা",
            subtitle: "বাংলা",
            route: null,
        },
    ];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Profile Header */}
            <ProfileHeader
                name={user?.name || "User"}
                email={user?.email || ""}
                shopName={user?.shopName}
                role={user?.role}
                isLoggedIn={loggedIn}
                lastSyncAt={null}
                onPress={() => router.push("/settings/profile")}
                onLoginPress={() => router.push("/login")}
            />

            {/* Menu Items */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>সেটিংস</Text>
                <View style={styles.menuBox}>
                    {MENU_ITEMS.map((item, idx) => (
                        <TouchableOpacity
                            key={item.title}
                            style={[
                                styles.menuRow,
                                idx !== MENU_ITEMS.length - 1 && styles.menuBorder,
                            ]}
                            onPress={() => {
                                if (item.route) {
                                    router.push(item.route as any);
                                } else {
                                    Alert.alert("শীঘ্রই আসছে", "এই ফিচারটি কাজ চলছে");
                                }
                            }}
                            activeOpacity={0.6}
                        >
                            <View
                                style={[
                                    styles.menuIcon,
                                    { backgroundColor: item.iconBg },
                                ]}
                            >
                                <Ionicons
                                    name={item.icon as any}
                                    size={20}
                                    color={item.iconColor}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuSub} numberOfLines={1}>
                                    {item.subtitle}
                                </Text>
                            </View>
                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color="#9ca3af"
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* About */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>অ্যাপ সম্পর্কে</Text>
                <View style={styles.menuBox}>
                    <View style={styles.menuRow}>
                        <View
                            style={[styles.menuIcon, { backgroundColor: "#f0fdfa" }]}
                        >
                            <Ionicons
                                name="information-circle-outline"
                                size={20}
                                color="#0d9488"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.menuTitle}>Version</Text>
                            <Text style={styles.menuSub}>{appVersion}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Logout */}
            {loggedIn && (
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                        <Text style={styles.logoutText}>লগআউট</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Text style={styles.footer}>
                © 2026 Pharmacy POS · Made with ❤️
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 14, backgroundColor: "#f9fafb" },
    section: { marginBottom: 16 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    menuBox: {
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        overflow: "hidden",
    },
    menuRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
    },
    menuBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    menuTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
    menuSub: { fontSize: 11, color: "#6b7280", marginTop: 2 },
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#fecaca",
    },
    logoutText: { fontSize: 14, fontWeight: "700", color: "#dc2626" },
    footer: {
        textAlign: "center",
        fontSize: 11,
        color: "#9ca3af",
        marginTop: 8,
    },
});