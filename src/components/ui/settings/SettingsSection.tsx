import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
    title: string;
    children: React.ReactNode;
    danger?: boolean;
};

export default function SettingsSection({
    title,
    children,
    danger = false,
}: Props) {
    return (
        <View style={styles.section}>
            <Text
                style={[
                    styles.title,
                    danger && { color: "#dc2626" },
                ]}
            >
                {title}
            </Text>
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 20,
    },
    title: {
        fontSize: 12,
        fontWeight: "800",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    content: {
        gap: 8,
    },
});