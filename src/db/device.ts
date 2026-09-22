import * as FileSystem from "expo-file-system/legacy";

const DEVICE_KEY = "device_id.json";

function generateId(): string {
    return (
        "device_" +
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 8)
    );
}

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
    if (cachedDeviceId) return cachedDeviceId;

    try {
        const raw = await FileSystem.readAsStringAsync(
            FileSystem.documentDirectory + DEVICE_KEY
        );
        const parsed = JSON.parse(raw) as { deviceId: string };
        cachedDeviceId = parsed.deviceId;
        return cachedDeviceId;
    } catch {
        const newId = generateId();
        await FileSystem.writeAsStringAsync(
            FileSystem.documentDirectory + DEVICE_KEY,
            JSON.stringify({ deviceId: newId })
        );
        cachedDeviceId = newId;
        return newId;
    }
}