import * as LocalAuthentication from "expo-local-authentication";
import { Alert, Platform } from "react-native";

// ============================
// ডিভাইস সাপোর্ট চেক
// ============================
export async function isBiometricAvailable(): Promise<{
    available: boolean;
    type: "fingerprint" | "face" | "iris" | "none";
    reason?: string;
}> {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
            return {
                available: false,
                type: "none",
                reason: "ডিভাইসে বায়োমেট্রিক হার্ডওয়্যার নেই",
            };
        }

        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
            return {
                available: false,
                type: "none",
                reason: "কোনো ফিঙ্গারপ্রিন্ট / ফেস / PIN সেট করা নেই",
            };
        }

        const types =
            await LocalAuthentication.supportedAuthenticationTypesAsync();

        let type: "fingerprint" | "face" | "iris" | "none" = "none";
        if (
            types.includes(
                LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
            )
        ) {
            type = "face";
        } else if (
            types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ) {
            type = "fingerprint";
        } else if (
            types.includes(LocalAuthentication.AuthenticationType.IRIS)
        ) {
            type = "iris";
        }

        return { available: true, type };
    } catch (e) {
        console.error("Biometric check error:", e);
        return {
            available: false,
            type: "none",
            reason: "বায়োমেট্রিক চেক করা যায়নি",
        };
    }
}

// ============================
// বায়োমেট্রিক যাচাই
// ============================
export async function authenticateWithBiometric(
    promptMessage = "পরিচয় যাচাই করুন"
): Promise<{ success: boolean; error?: string }> {
    try {
        const check = await isBiometricAvailable();

        if (!check.available) {
            // fallback: ডিভাইস পাসকোড/PIN যাচাই চালু করুন
            const fallback = await LocalAuthentication.authenticateAsync({
                promptMessage,
                cancelLabel: "বাতিল",
                disableDeviceFallback: false,
            });
            return {
                success: fallback.success,
                error: fallback.success ? undefined : "যাচাই ব্যর্থ",
            };
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage,
            cancelLabel: "বাতিল",
            fallbackLabel: "পাসকোড ব্যবহার করুন",
            disableDeviceFallback: Platform.OS === "android" ? false : false,
        });

        if (result.success) {
            return { success: true };
        }

        let errMsg = "যাচাই ব্যর্থ";
        if (result.error === "user_cancel") {
            errMsg = "ব্যবহারকারী বাতিল করেছেন";
        } else if (result.error === "lockout") {
            errMsg = "অনেকবার ভুল হয়েছে — ডিভাইস লক হয়েছে";
        } else if (result.error === "not_enrolled") {
            errMsg = "বায়োমেট্রিক সেটআপ করা নেই";
        }

        return { success: false, error: errMsg };
    } catch (e: any) {
        console.error("Auth error:", e);
        return {
            success: false,
            error: e?.message || "যাচাই করা যায়নি",
        };
    }
}

// ============================
// Protected Action helper
// ============================
export async function requireBiometric(
    promptMessage: string,
    onSuccess: () => void | Promise<void>
) {
    const { success, error } = await authenticateWithBiometric(promptMessage);

    if (!success) {
        Alert.alert("❌ যাচাই ব্যর্থ", error || "পরিচয় নিশ্চিত করা যায়নি");
        return;
    }

    await onSuccess();
}

// ============================
// বায়োমেট্রিক টাইপ লেবেল
// ============================
export function getBiometricLabel(
    type: "fingerprint" | "face" | "iris" | "none"
): string {
    switch (type) {
        case "fingerprint":
            return "ফিঙ্গারপ্রিন্ট";
        case "face":
            return "ফেস আইডি";
        case "iris":
            return "আইরিস স্ক্যান";
        default:
            return "ডিভাইস পিন/পাসওয়ার্ড";
    }
}

// ============================
// বায়োমেট্রিক আইকন
// ============================
export function getBiometricIcon(
    type: "fingerprint" | "face" | "iris" | "none"
): any {
    switch (type) {
        case "fingerprint":
            return "finger-print-outline";
        case "face":
            return "scan-outline";
        case "iris":
            return "eye-outline";
        default:
            return "keypad-outline";
    }
}