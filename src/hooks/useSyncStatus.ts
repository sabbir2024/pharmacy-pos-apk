import {
    getSyncStatus,
    type AuthUser,
    type SyncStatus,
} from "@/db/sync";
import { useCallback, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

export type UseSyncStatusReturn = {
    loading: boolean;
    isLoggedIn: boolean;
    user: AuthUser | null;
    lastSyncAt: string | null;
    refresh: () => Promise<void>;
};

export function useSyncStatus(): UseSyncStatusReturn {
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            console.log("🔄 useSyncStatus.refresh");

            const status: SyncStatus = await getSyncStatus();

            console.log("   status.isLoggedIn:", status.isLoggedIn);
            console.log("   status.user:", status.user?.email);

            setIsLoggedIn(status.isLoggedIn);
            setUser(status.user);
            setLastSyncAt(status.lastSyncAt);
        } catch (e: any) {
            console.error("❌ useSyncStatus.refresh error:", e?.message);
            setIsLoggedIn(false);
            setUser(null);
            setLastSyncAt(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        refresh();
    }, [refresh]);

    // AppState listener
    useEffect(() => {
        const handleAppState = (state: AppStateStatus) => {
            if (state === "active") {
                console.log("📱 App active → refresh status");
                refresh();
            }
        };

        const sub = AppState.addEventListener("change", handleAppState);
        return () => sub.remove();
    }, [refresh]);

    return { loading, isLoggedIn, user, lastSyncAt, refresh };
}