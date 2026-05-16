import { usePrivy, useWallets } from "@privy-io/react-auth";
import { CONFIG } from "../lib/config";
import { useMint } from "../hooks/useMint";
import type { SupplyInfo } from "../hooks/useSupply";
import { SkullResult } from "./SkullResult";

interface Props {
  supply: SupplyInfo | null;
  onMinted: () => void;
}

export function MintSection({ supply, onMinted }: Props) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { state, error, skull, mint, reset } = useMint();

  async function handleMint() {
    const wallet = wallets[0];
    if (!wallet) return;
    await wallet.switchChain(CONFIG.chainId);
    const provider = await wallet.getEthereumProvider();
    await mint(provider, wallet.address as `0x${string}`);
    onMinted();
  }

  const isBusy = state === "confirm" || state === "pending";

  return (
    <section className="mint-section">
      {/* Supply bar */}
      <div className="supply-row">
        <div className="supply-track">
          <div
            className="supply-fill"
            style={{ width: supply ? `${supply.pct}%` : "0%" }}
          />
        </div>
        <span className="supply-label">
          {supply
            ? `${supply.minted.toLocaleString()} / ${supply.max.toLocaleString()}`
            : "loading…"}
        </span>
      </div>

      {/* Mint card */}
      <div className="mint-card">
        <div className="mint-card-preview">
          {skull ? (
            <img src={skull.image} alt={skull.name} />
          ) : (
            <span className="preview-glyph">?</span>
          )}
        </div>

        <div className="mint-card-body">
          <div className="mint-stat-row">
            <span>Price</span>
            <strong style={{ color: "var(--gold)" }}>FREE</strong>
          </div>
          <div className="mint-stat-row">
            <span>Network</span>
            <strong>{CONFIG.chainName}</strong>
          </div>
          <div className="mint-stat-row">
            <span>Supply</span>
            <strong>{supply ? `${supply.minted.toLocaleString()} / ${supply.max.toLocaleString()}` : "—"}</strong>
          </div>

          {!authenticated ? (
            <button className="btn btn-primary" onClick={login}>
              Connect to Mint
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleMint}
              disabled={isBusy}
            >
              {state === "confirm" && "Confirm in wallet…"}
              {state === "pending" && "Broadcasting…"}
              {(state === "idle" || state === "success" || state === "error") && "Mint — FREE"}
            </button>
          )}

          {state === "error" && (
            <div className="mint-status error">
              ✗ {error}
              <button className="reset-btn" onClick={reset}>Try again</button>
            </div>
          )}

          {state === "success" && skull && (
            <div className="mint-status success">
              ✓ {skull.name} minted
              <a
                href={`${CONFIG.blockExplorer}/tx/${skull.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View tx ↗
              </a>
            </div>
          )}

          <p className="mint-note">No whitelist. No presale. The contract is the truth.</p>
        </div>
      </div>

      {skull && <SkullResult skull={skull} />}
    </section>
  );
}
