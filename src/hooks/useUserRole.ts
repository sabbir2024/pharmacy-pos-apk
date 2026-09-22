import { useEffect, useState } from "react";
import { useSyncStatus } from "./useSyncStatus";

export type UserRole = "admin" | "user" | "none";

export function useUserRole() {
    const { user, isLoggedIn, loading: authLoading } = useSyncStatus();
    const [role, setRole] = useState<UserRole>("none");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!isLoggedIn || !user) {
            setRole("none");
            setLoading(false);
            return;
        }

        // user এর role চেক
        const userRole = (user as any).role;
        if (userRole === "admin") {
            setRole("admin");
        } else {
            setRole("user");
        }
        setLoading(false);
    }, [user, isLoggedIn, authLoading]);

    return {
        role,
        isAdmin: role === "admin",
        isUser: role === "user",
        isNone: role === "none",
        loading,
    };
}