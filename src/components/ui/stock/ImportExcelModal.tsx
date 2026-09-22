import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { Product } from "../../../db/products";
import { downloadTemplate, parseExcelFile } from "../../../utils/excel";

type Props = {
    visible: boolean;
    onClose: () => void;
    onImport: (products: Omit<Product, "id">[]) => void;
};

export default function ImportExcelModal({
    visible,
    onClose,
    onImport,
}: Props) {
    const [preview, setPreview] = useState<Omit<Product, "id">[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState("");

    const reset = () => {
        setPreview([]);
        setErrors([]);
        setFileName("");
    };

    const handlePick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-excel",
                    "text/csv",
                    "*/*",
                ],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            setFileName(file.name);
            setLoading(true);

            const { products, errors } = await parseExcelFile(file.uri);
            setPreview(products);
            setErrors(errors);

            if (products.length === 0 && errors.length === 0) {
                Alert.alert("খালি ফাইল", "কোনো ডেটা পাওয়া যায়নি");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "ফাইল পড়া যায়নি");
        } finally {
            setLoading(false);
        }
    };

    const handleImport = () => {
        if (preview.length === 0) return;
        onImport(preview);
        reset();
        onClose();
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadTemplate();
        } catch (e) {
            console.error(e);
            Alert.alert("ত্রুটি", "টেমপ্লেট ডাউনলোড করা যায়নি");
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Excel থেকে ইমপোর্ট</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Step 1: Template */}
                        <View style={styles.step}>
                            <View style={styles.stepNum}>
                                <Text style={styles.stepNumText}>1</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.stepTitle}>টেমপ্লেট ডাউনলোড</Text>
                                <Text style={styles.stepDesc}>
                                    টেমপ্লেট ফাইলে ডেটা পূরণ করে Excel/CSV সেভ করুন
                                </Text>
                                <TouchableOpacity
                                    style={styles.templateBtn}
                                    onPress={handleDownloadTemplate}
                                >
                                    <Ionicons
                                        name="download-outline"
                                        size={18}
                                        color="#0d9488"
                                    />
                                    <Text style={styles.templateBtnText}>
                                        টেমপ্লেট ডাউনলোড
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Step 2: Pick file */}
                        <View style={styles.step}>
                            <View style={styles.stepNum}>
                                <Text style={styles.stepNumText}>2</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.stepTitle}>ফাইল সিলেক্ট</Text>
                                <Text style={styles.stepDesc}>
                                    Excel (.xlsx, .xls) বা CSV (.csv) ফাইল দিন
                                </Text>
                                <TouchableOpacity
                                    style={styles.pickBtn}
                                    onPress={handlePick}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons
                                                name="cloud-upload-outline"
                                                size={20}
                                                color="#fff"
                                            />
                                            <Text style={styles.pickBtnText}>
                                                ফাইল বাছাই করুন
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {!!fileName && (
                                    <View style={styles.fileInfo}>
                                        <Ionicons
                                            name="document-text-outline"
                                            size={16}
                                            color="#0d9488"
                                        />
                                        <Text style={styles.fileName} numberOfLines={1}>
                                            {fileName}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Step 3: Preview */}
                        {preview.length > 0 && (
                            <View style={styles.step}>
                                <View style={styles.stepNum}>
                                    <Text style={styles.stepNumText}>3</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.stepTitle}>
                                        প্রিভিউ ({preview.length}টি ঔষধ)
                                    </Text>

                                    <View style={styles.previewBox}>
                                        {preview.slice(0, 5).map((p, idx) => (
                                            <View key={idx} style={styles.previewRow}>
                                                <Text style={styles.previewName} numberOfLines={1}>
                                                    {p.name}
                                                </Text>
                                                <Text style={styles.previewMeta}>
                                                    ৳{p.price} · {p.stock} {p.unit}
                                                </Text>
                                            </View>
                                        ))}
                                        {preview.length > 5 && (
                                            <Text style={styles.moreText}>
                                                ...আরও {preview.length - 5}টি
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Errors */}
                        {errors.length > 0 && (
                            <View style={styles.errorBox}>
                                <View style={styles.errorHeader}>
                                    <Ionicons
                                        name="warning-outline"
                                        size={18}
                                        color="#dc2626"
                                    />
                                    <Text style={styles.errorTitle}>
                                        {errors.length}টি সমস্যা পাওয়া গেছে
                                    </Text>
                                </View>
                                {errors.slice(0, 5).map((e, i) => (
                                    <Text key={i} style={styles.errorText}>
                                        • {e}
                                    </Text>
                                ))}
                                {errors.length > 5 && (
                                    <Text style={styles.errorText}>
                                        ...আরও {errors.length - 5}টি
                                    </Text>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* Actions */}
                    {preview.length > 0 && (
                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
                                <Text style={styles.cancelText}>রিসেট</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.importBtn}
                                onPress={handleImport}
                            >
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={20}
                                    color="#fff"
                                />
                                <Text style={styles.importText}>
                                    {preview.length}টি ইমপোর্ট করুন
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
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

    step: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 18,
    },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#0d9488",
        alignItems: "center",
        justifyContent: "center",
    },
    stepNumText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    stepTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
    stepDesc: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 2,
        marginBottom: 8,
    },

    templateBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: "#0d9488",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    templateBtnText: {
        color: "#0d9488",
        fontWeight: "700",
        fontSize: 13,
    },

    pickBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#0d9488",
        paddingVertical: 12,
        borderRadius: 10,
    },
    pickBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

    fileInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#f0fdfa",
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    fileName: { fontSize: 12, color: "#0f766e", flex: 1 },

    previewBox: {
        backgroundColor: "#f9fafb",
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    previewRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    previewName: {
        fontSize: 13,
        fontWeight: "600",
        color: "#111827",
        flex: 1,
    },
    previewMeta: { fontSize: 11, color: "#6b7280" },
    moreText: {
        fontSize: 11,
        color: "#9ca3af",
        fontStyle: "italic",
        marginTop: 6,
        textAlign: "center",
    },

    errorBox: {
        backgroundColor: "#fef2f2",
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: "#fecaca",
        marginBottom: 10,
    },
    errorHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    errorTitle: { fontSize: 13, fontWeight: "700", color: "#dc2626" },
    errorText: { fontSize: 12, color: "#991b1b", marginTop: 2 },

    actions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 10,
    },
    cancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
    },
    cancelText: { color: "#374151", fontWeight: "700" },
    importBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#0d9488",
    },
    importText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});