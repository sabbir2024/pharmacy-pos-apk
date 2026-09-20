import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View } from "react-native";

type Props = {
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
};

export default function SearchBar({
    value,
    onChangeText,
    placeholder = "ঔষধ খুঁজুন...",
}: Props) {
    return (
        <View style={styles.wrap}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginBottom: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 15,
        color: "#111827",
    },
});