import { useEffect, useState } from "react";
import { useSyncStatus } from "./useSyncStatus";

export type UserRole = "admin" | "user" | "none";

export function useUserRole() {
    const { user, isLoggedIn, loading: authLoading } = useSyncStatus();
    const [role, setRole] = useState<UserRole>("none");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("🔍 useUserRole effect:");
        console.log("   authLoading:", authLoading);
        console.log("   isLoggedIn:", isLoggedIn);
        console.log("   user email:", user?.email);
        console.log("   user role:", (user as any)?.role);

        if (authLoading) {
            console.log("   ⏳ Still loading auth");
            return;
        }

        if (!isLoggedIn || !user || !user.email) {
            console.log("   ❌ No valid user → role none");
            setRole("none");
            setLoading(false);
            return;
        }

        const userRole = (user as any).role;

        if (userRole === "admin") {
            setRole("admin");
            console.log("   ✅ role = admin");
        } else {
            setRole("user");
            console.log("   ✅ role = user");
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