import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import type { Product } from "../../../db/products";
import BarcodeScanner from "./BarcodeScanner";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSave: (product: Product) => void;
    initialData?: Product | null;
};

const UNITS = ["pcs", "box", "set", "strip", "bottle"];

function defaultExpiry(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
}

export default function AddProductModal({
    visible,
    onClose,
    onSave,
    initialData,
}: Props) {
    const [name, setName] = useState("");
    const [company, setCompany] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [unit, setUnit] = useState("pcs");
    const [pcsPerUnit, setPcsPerUnit] = useState("1");
    const [costPrice, setCostPrice] = useState("");
    const [expiry, setExpiry] = useState(defaultExpiry());
    const [barcode, setBarcode] = useState("");

    const [scannerOpen, setScannerOpen] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(initialData?.name ?? "");
            setCompany(initialData?.company ?? "");
            setPrice(initialData?.price?.toString() ?? "");
            setStock(initialData?.stock?.toString() ?? "");
            setUnit(initialData?.unit ?? "pcs");
            setPcsPerUnit(initialData?.pcsPerUnit?.toString() ?? "1");
            setCostPrice(initialData?.costPrice?.toString() ?? "");
            setExpiry(initialData?.expiry || defaultExpiry());
            setBarcode(initialData?.barcode ?? "");
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!name.trim() || !price.trim() || !stock.trim()) {
            Alert.alert("ত্রুটি", "নাম, বিক্রয়মূল্য ও পরিমাণ অবশ্যই দিতে হবে");
            return;
        }
        onSave({
            id: initialData?.id,
            name: name.trim(),
            company: company.trim(),
            price: parseFloat(price),
            stock: parseInt(stock),
            unit,
            costPrice: parseFloat(costPrice) || 0,
            expiry,
            barcode: barcode.trim(),
            pcsPerUnit: parseInt(pcsPerUnit) || 1,
        });
        onClose();
    };

    const onDateChange = (_: any, selected?: Date) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selected) {
            setExpiry(selected.toISOString().slice(0, 10));
        }
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent
                onRequestClose={onClose}
            >
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <Text style={styles.title}>
                                {initialData ? "ঔষধ এডিট" : "নতুন ঔষধ অ্যাড"}
                            </Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* নাম */}
                            <Field label="ঔষধের নাম *">
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="যেমন: Napa Extra"
                                    placeholderTextColor="#9ca3af"
                                />
                            </Field>

                            {/* কোম্পানি */}
                            <Field label="কোম্পানি">
                                <TextInput
                                    style={styles.input}
                                    value={company}
                                    onChangeText={setCompany}
                                    placeholder="যেমন: Beximco"
                                    placeholderTextColor="#9ca3af"
                                />
                            </Field>

                            {/* বিক্রয়মূল্য */}
                            <Field label="বিক্রয়মূল্য (৳) *">
                                <TextInput
                                    style={styles.input}
                                    value={price}
                                    onChangeText={setPrice}
                                    keyboardType="numeric"
                                    placeholder="যেমন: 1200"
                                    placeholderTextColor="#9ca3af"
                                />
                            </Field>

                            {/* পরিমাণ + ইউনিট */}
                            <Field label="পরিমাণ *">
                                <View style={styles.row}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                                        value={stock}
                                        onChangeText={setStock}
                                        keyboardType="numeric"
                                        placeholder="যেমন: 150"
                                        placeholderTextColor="#9ca3af"
                                    />
                                    <View style={styles.unitWrap}>
                                        {UNITS.map((u) => (
                                            <TouchableOpacity
                                                key={u}
                                                onPress={() => setUnit(u)}
                                                style={[
                                                    styles.unitBtn,
                                                    unit === u && styles.unitBtnActive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.unitText,
                                                        unit === u && styles.unitTextActive,
                                                    ]}
                                                >
                                                    {u}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </Field>

                            {/* প্রতি unit এ কত pcs — শুধু pcs ছাড়া অন্য unit হলে */}
                            {unit !== "pcs" && (
                                <Field label={`প্রতি ${unit} এ কত pcs?`}>
                                    <TextInput
                                        style={styles.input}
                                        value={pcsPerUnit}
                                        onChangeText={setPcsPerUnit}
                                        keyboardType="numeric"
                                        placeholder="যেমন: 100"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </Field>
                            )}

                            {/* ক্রয়মূল্য */}
                            <Field label="ক্রয়মূল্য (৳)">
                                <TextInput
                                    style={styles.input}
                                    value={costPrice}
                                    onChangeText={setCostPrice}
                                    keyboardType="numeric"
                                    placeholder="যেমন: 1100"
                                    placeholderTextColor="#9ca3af"
                                />
                            </Field>

                            {/* এক্সপায়ারি তারিখ */}
                            <Field label="এক্সপায়ারি তারিখ">
                                <TouchableOpacity
                                    style={[styles.input, styles.dateBox]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={{ color: "#111827", fontSize: 15 }}>
                                        {expiry}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#0d9488" />
                                </TouchableOpacity>
                            </Field>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={new Date(expiry)}
                                    mode="date"
                                    display={Platform.OS === "ios" ? "spinner" : "default"}
                                    onChange={onDateChange}
                                />
                            )}

                            {/* বারকোড */}
                            <Field label="বারকোড">
                                <View style={styles.row}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                                        value={barcode}
                                        onChangeText={setBarcode}
                                        placeholder="স্ক্যান করুন বা লিখুন"
                                        placeholderTextColor="#9ca3af"
                                    />
                                    <TouchableOpacity
                                        style={styles.scanBtn}
                                        onPress={() => setScannerOpen(true)}
                                    >
                                        <Ionicons name="barcode-outline" size={22} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </Field>

                            {/* সেভ বাটন */}
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveText}>সেভ করুন</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <BarcodeScanner
                visible={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScanned={(code) => setBarcode(code)}
            />
        </>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "92%",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: "bold", color: "#0d9488" },
    field: { marginBottom: 14 },
    label: { fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: "600" },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        backgroundColor: "#f9fafb",
        color: "#111827",
    },
    row: { flexDirection: "row", alignItems: "center" },
    dateBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    unitWrap: { flexDirection: "row", flexWrap: "wrap", flex: 1.4 },
    unitBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "#f3f4f6",
        marginRight: 4,
        marginBottom: 4,
    },
    unitBtnActive: { backgroundColor: "#0d9488" },
    unitText: { fontSize: 12, color: "#374151" },
    unitTextActive: { color: "#fff", fontWeight: "bold" },
    scanBtn: {
        backgroundColor: "#0d9488",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
    },
    saveBtn: {
        backgroundColor: "#0d9488",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 10,
        marginBottom: 24,
    },
    saveText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});