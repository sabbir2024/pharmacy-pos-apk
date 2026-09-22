import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export type NetworkStatus = {
    isOnline: boolean;
    isWifi: boolean;
    isCellular: boolean;
    isChecking: boolean;
};

export function useNetworkStatus(): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>({
        isOnline: false,
        isWifi: false,
        isCellular: false,
        isChecking: true,
    });

    useEffect(() => {
        // প্রাথমিক চেক
        NetInfo.fetch().then((state) => {
            setStatus({
                isOnline: state.isConnected === true,
                isWifi: state.type === "wifi",
                isCellular: state.type === "cellular",
                isChecking: false,
            });
        });

        // পরিবর্তন শুনুন
        const unsubscribe = NetInfo.addEventListener((state) => {
            setStatus({
                isOnline: state.isConnected === true,
                isWifi: state.type === "wifi",
                isCellular: state.type === "cellular",
                isChecking: false,
            });
        });

        return () => unsubscribe();
    }, []);

    return status;
}