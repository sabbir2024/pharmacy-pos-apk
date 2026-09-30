import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
    icon: string;
    iconColor?: string;
    iconBg?: string;
    title: string;
    subtitle?: string;
    value?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    loading?: boolean;
    danger?: boolean;
    disabled?: boolean;
};

export default function SettingsRow({
    icon,
    iconColor = "#0d9488",
    iconBg = "#f0fdfa",
    title,
    subtitle,
    value,
    onPress,
    rightElement,
    loading,
    danger,
    disabled,
}: Props) {
    const Wrapper = onPress ? TouchableOpacity : View;

    return (
        <Wrapper
            style={[
                styles.row,
                danger && styles.rowDanger,
                disabled && { opacity: 0.5 },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={disabled || loading}
        >
            {/* Icon */}
            <View
                style={[
                    styles.iconBox,
                    { backgroundColor: danger ? "#fee2e2" : iconBg },
                ]}
            >
                {loading ? (
                    <ActivityIndicator
                        size="small"
                        color={danger ? "#dc2626" : iconColor}
                    />
                ) : (
                    <Ionicons
                        name={icon as any}
                        size={20}
                        color={danger ? "#dc2626" : iconColor}
                    />
                )}
            </View>

            {/* Text */}
            <View style={{ flex: 1 }}>
                <Text
                    style={[
                        styles.title,
                        danger && { color: "#dc2626" },
                    ]}
                    numberOfLines={1}
                >
                    {title}
                </Text>
                {!!subtitle && (
                    <Text style={styles.subtitle} numberOfLines={2}>
                        {subtitle}
                    </Text>
                )}
            </View>

            {/* Right side */}
            {rightElement ? (
                rightElement
            ) : (
                <>
                    {!!value && <Text style={styles.value}>{value}</Text>}
                    {onPress && (
                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#9ca3af"
                        />
                    )}
                </>
            )}
        </Wrapper>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    rowDanger: {
        borderColor: "#fecaca",
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 14,
        fontWeight: "700",
        color: "#111827",
    },
    subtitle: {
        fontSize: 11,
        color: "#6b7280",
        marginTop: 2,
        lineHeight: 15,
    },
    value: {
        fontSize: 12,
        color: "#6b7280",
        fontWeight: "600",
    },
});