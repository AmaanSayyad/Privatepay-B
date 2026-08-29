import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider as FamilyConnectKitProvider } from "connectkit";

import { baseSepolia, mainnet } from "../config";

// Base + mainnet only (mainnet for ENS resolution)
const config = createConfig({
    chains: [baseSepolia, mainnet],
    connectors: [injected()],
    transports: {
        [baseSepolia.id]: http(baseSepolia.rpcUrls.default.http[0]),
        [mainnet.id]: http(mainnet.rpcUrls.default.http[0]),
    },
});

const queryClient = new QueryClient();

export function ConnectKitProvider({ children }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <FamilyConnectKitProvider
                    theme="auto"
                    mode="light"
                    customTheme={{
                        "--ck-font-family": "Athletics, sans-serif",
                        "--ck-border-radius": "24px",
                        "--ck-primary-button-border-radius": "16px",
                        "--ck-secondary-button-border-radius": "16px",
                        "--ck-overlay-background": "rgba(0, 0, 0, 0.4)",
                        "--ck-overlay-backdrop-filter": "blur(8px)",
                    }}
                >
                    {children}
                </FamilyConnectKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
