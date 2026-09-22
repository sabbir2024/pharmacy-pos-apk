import {
    getSyncStatus,
    type AuthUser,
    type SyncStatus
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
            const status: SyncStatus = await getSyncStatus();
            setIsLoggedIn(status.isLoggedIn);
            setUser(status.user);
            setLastSyncAt(status.lastSyncAt);
        } catch (e) {
            console.error("useSyncStatus error:", e);
            setIsLoggedIn(false);
            setUser(null);
            setLastSyncAt(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // প্রথমবার load
    useEffect(() => {
        refresh();
    }, [refresh]);

    // অ্যাপ ফোরগ্রাউন্ডে এলে refresh
    useEffect(() => {
        const handleAppState = (state: AppStateStatus) => {
            if (state === "active") {
                refresh();
            }
        };

        const sub = AppState.addEventListener("change", handleAppState);
        return () => sub.remove();
    }, [refresh]);

    return { loading, isLoggedIn, user, lastSyncAt, refresh };
}