import { PrivyProvider } from "@privy-io/react-auth";
import { App } from "./App";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string;

export function PrivyRoot() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["wallet", "email", "google"],
        defaultChain: {
          id: 11155111,
          name: "Sepolia",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: {
            default: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] },
            public: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] },
          },
        },
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: {
          theme: "dark",
          accentColor: "#ffd700",
        },
      }}
    >
      <App />
    </PrivyProvider>
  );
}
