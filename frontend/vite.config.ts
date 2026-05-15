import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@privy-io") || id.includes("@reown") || id.includes("@walletconnect") || id.includes("@wagmi")) {
            return packageChunk(id, "wallet");
          }
          if (id.includes("viem") || id.includes("/ox/")) return packageChunk(id, "chain");
          if (id.includes("react")) return "react-vendor";
          return packageChunk(id, "vendor");
        },
      },
    },
  },
});

function packageChunk(id: string, prefix: string) {
  const parts = id.split("node_modules/")[1]?.split("/") ?? [];
  const packageName = parts[0]?.startsWith("@") ? `${parts[0]}-${parts[1]}` : parts[0];
  return `${prefix}-${(packageName ?? "misc").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
