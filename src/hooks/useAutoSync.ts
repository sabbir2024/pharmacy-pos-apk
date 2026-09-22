import { fullSync, isLoggedIn } from "@/db/sync";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

export function useAutoSync(intervalMs = 5 * 60 * 1000) {
    const syncInProgress = useRef(false);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;

        const trySync = async () => {
            if (syncInProgress.current) return;

            const loggedIn = await isLoggedIn();
            if (!loggedIn) return;

            try {
                syncInProgress.current = true;
                const result = await fullSync();

                if (result.success) {
                    console.log("✅ Auto-sync done");
                } else {
                    console.log("⚠️ Auto-sync:", result.error);
                }
            } catch (e) {
                console.log("❌ Auto-sync error:", e);
            } finally {
                syncInProgress.current = false;
            }
        };

        const initialTimeout = setTimeout(trySync, 3000);
        timer = setInterval(trySync, intervalMs);

        const handleAppState = (state: AppStateStatus) => {
            if (state === "active") trySync();
        };
        const sub = AppState.addEventListener("change", handleAppState);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(timer);
            sub.remove();
        };
    }, [intervalMs]);
}