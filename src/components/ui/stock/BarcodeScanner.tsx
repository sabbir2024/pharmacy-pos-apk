import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
    visible: boolean;
    onClose: () => void;
    onScanned: (barcode: string) => void;
};

export default function BarcodeScanner({
    visible,
    onClose,
    onScanned,
}: Props) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const handleScan = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        onScanned(data);
        setTimeout(() => setScanned(false), 800);
        onClose();
    };

    if (!visible) return null;
    if (!permission) return null;

    if (!permission.granted) {
        return (
            <Modal visible transparent animationType="slide">
                <View style={styles.center}>
                    <Text style={styles.msg}>ক্যামেরার অনুমতি প্রয়োজন</Text>
                    <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                        <Text style={styles.btnText}>অনুমতি দিন</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
                        <Text style={{ color: "#6b7280" }}>বাতিল</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: "#000" }}>
                <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    barcodeScannerSettings={{
                        barcodeTypes: [
                            "ean13",
                            "ean8",
                            "code128",
                            "code39",
                            "upc_a",
                            "upc_e",
                            "qr",
                        ],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleScan}
                />

                <View style={styles.overlay}>
                    <View style={styles.scanBox} />
                    <Text style={styles.hint}>বারকোড ফ্রেমের ভেতরে আনুন</Text>
                </View>

                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    msg: { fontSize: 16, marginBottom: 16, color: "#111827" },
    btn: {
        backgroundColor: "#0d9488",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    btnText: { color: "#fff", fontWeight: "bold" },
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    scanBox: {
        width: 260,
        height: 160,
        borderWidth: 2,
        borderColor: "#0d9488",
        borderRadius: 12,
        backgroundColor: "transparent",
    },
    hint: {
        color: "#fff",
        marginTop: 20,
        fontSize: 14,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    closeBtn: {
        position: "absolute",
        top: 50,
        right: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 8,
        borderRadius: 30,
    },
});