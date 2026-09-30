import { fullSync } from "@/db/sync";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

type Options = {
    enabled?: boolean;
    intervalMs?: number;
};

export function useAutoSync({
    enabled = true,
    intervalMs = 5 * 60 * 1000,
}: Options = {}) {
    const syncInProgress = useRef(false);
    const enabledRef = useRef(enabled);

    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;

        let timer: ReturnType<typeof setInterval>;

        const trySync = async () => {
            if (syncInProgress.current) return;
            if (!enabledRef.current) return;

            try {
                syncInProgress.current = true;
                const result = await fullSync();
                if (result.success) {
                    console.log("✅ Auto-sync done");
                }
            } catch (e) {
                // Silent fail
            } finally {
                syncInProgress.current = false;
            }
        };

        const initialTimeout = setTimeout(trySync, 5000);
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
    }, [enabled, intervalMs]);
}