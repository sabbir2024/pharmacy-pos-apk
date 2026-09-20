import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    daysAgoStr,
    monthStartStr,
    todayStr,
    yearStartStr,
    type DateRange,
} from "../../../db/dashboard";
import { formatDate } from "../../../utils/format";

type Props = {
    value: DateRange;
    onChange: (range: DateRange) => void;
};

const PRESETS = [
    { label: "আজ", get: () => ({ from: todayStr(), to: todayStr() }) },
    { label: "৭ দিন", get: () => ({ from: daysAgoStr(7), to: todayStr() }) },
    { label: "৩০ দিন", get: () => ({ from: daysAgoStr(30), to: todayStr() }) },
    { label: "এই মাস", get: () => ({ from: monthStartStr(), to: todayStr() }) },
    { label: "এই বছর", get: () => ({ from: yearStartStr(), to: todayStr() }) },
];

export default function DateRangePicker({ value, onChange }: Props) {
    const [picker, setPicker] = useState<"from" | "to" | null>(null);

    const isActive = (preset: DateRange) =>
        preset.from === value.from && preset.to === value.to;

    const handleChange = (event: any, selected?: Date) => {
        const p = picker;

        // Android এ picker বন্ধ করে দাও
        if (Platform.OS !== "ios") {
            setPicker(null);
        }

        if (event.type === "dismissed" || !selected || !p) return;

        const iso = selected.toISOString().slice(0, 10);

        if (p === "from") {
            onChange({
                from: iso,
                to: iso > value.to ? iso : value.to,
            });
        } else {
            onChange({
                from: iso < value.from ? iso : value.from,
                to: iso,
            });
        }
    };

    return (
        <View style={styles.wrap}>
            {/* প্রিসেট বাটন */}
            <View style={styles.presetRow}>
                {PRESETS.map((p) => {
                    const r = p.get();
                    const active = isActive(r);
                    return (
                        <TouchableOpacity
                            key={p.label}
                            style={[styles.presetBtn, active && styles.presetActive]}
                            onPress={() => onChange(r)}
                        >
                            <Text
                                style={[
                                    styles.presetText,
                                    active && styles.presetTextActive,
                                ]}
                            >
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* কাস্টম রেঞ্জ */}
            <View style={styles.rangeRow}>
                <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setPicker("from")}
                >
                    <Ionicons name="calendar-outline" size={16} color="#0d9488" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.dateLabel}>শুরু</Text>
                        <Text style={styles.dateValue}>{formatDate(value.from)}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.arrowWrap}>
                    <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                </View>

                <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setPicker("to")}
                >
                    <Ionicons name="calendar-outline" size={16} color="#0d9488" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.dateLabel}>শেষ</Text>
                        <Text style={styles.dateValue}>{formatDate(value.to)}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* ✅ পুরনো API — onChange (event, date) */}
            {picker && (
                <DateTimePicker
                    value={new Date(picker === "from" ? value.from : value.to)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 10 },
    presetRow: {
        flexDirection: "row",
        gap: 6,
        flexWrap: "wrap",
    },
    presetBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    presetActive: {
        backgroundColor: "#0d9488",
        borderColor: "#0d9488",
    },
    presetText: { fontSize: 12, color: "#374151", fontWeight: "600" },
    presetTextActive: { color: "#fff" },

    rangeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dateBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    dateLabel: { fontSize: 10, color: "#9ca3af" },
    dateValue: {
        fontSize: 13,
        fontWeight: "700",
        color: "#111827",
        marginTop: 2,
    },
    arrowWrap: {
        width: 24,
        alignItems: "center",
    },
});