import { usePrivy, useWallets } from "@privy-io/react-auth";
import { formatEther } from "viem";
import { useState } from "react";
import { useMint } from "../../hooks/useMint";
import { SkullResult } from "../SkullResult";
import type { SupplyInfo } from "../../hooks/useSupply";
import { CONFIG } from "../../lib/config";

interface Props {
  supply: SupplyInfo | null;
  onMinted: () => void;
}

export function MintTab({ supply, onMinted }: Props) {
  const { login, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { state, error, skull, mint, reset, mintsUsed, mintsLeft } = useMint();
  const [quantity, setQuantity] = useState(1);

  const address = user?.wallet?.address as `0x${string}` | undefined;
  const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
  const externalWallet = wallets.find(w => w.walletClientType !== "privy");
  const activeWallet = externalWallet ?? embeddedWallet;

  async function handleMint() {
    if (!activeWallet || !address) return;
    const provider = await activeWallet.getEthereumProvider();
    await mint(provider, address, Math.min(quantity, mintsLeft));
    onMinted();
  }

  const canMint = authenticated && mintsLeft > 0 && state === "idle";
  const price = supply?.price ?? CONFIG.mintPrice;
  const selectedQuantity = Math.min(quantity, Math.max(mintsLeft, 1));
  const totalPrice = price * BigInt(selectedQuantity);

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 32, marginBottom: 32 }}>
        <p className="hero-eyebrow">Mint a HashSkull</p>
        <h1>
          Claim your piece of<br />
          <span className="hero-accent">blockchain entropy.</span>
        </h1>
        <p className="hero-sub">
          Each skull is unique, onchain, and permanent. Max 3 per wallet.
        </p>
      </section>

      <section className="mint-section">
        {/* Supply bar */}
        {supply && (
          <div className="supply-row">
            <div className="supply-track">
              <div className="supply-fill" style={{ width: `${supply.pct}%` }} />
            </div>
            <span className="supply-label">
              {supply.minted.toString()} / {supply.max.toString()} minted
            </span>
          </div>
        )}

        <div className="mint-card">
          <div className="mint-card-preview">
            {skull ? (
              <img src={skull.image} alt={skull.name} />
            ) : (
              <span className="preview-glyph">☠</span>
            )}
          </div>
          <div className="mint-card-body">
            <div className="mint-stat-row">
              <span>Price</span>
              <strong style={{ color: "var(--gold)" }}>FREE</strong>
            </div>
            {authenticated && mintsLeft > 0 && (
              <div className="mint-stat-row">
                <span>Quantity</span>
                <select
                  className="market-input"
                  style={{ maxWidth: 120, padding: "6px 10px" }}
                  value={selectedQuantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  disabled={state !== "idle"}
                >
                  {Array.from({ length: mintsLeft }, (_, i) => i + 1).map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="mint-stat-row">
              <span>Network</span>
              <strong>Ethereum Mainnet</strong>
            </div>
            {authenticated && (
              <div className="mint-stat-row">
                <span>Your mints</span>
                <strong style={{ color: mintsLeft === 0 ? "var(--red)" : "var(--text)" }}>
                  {mintsUsed} / {CONFIG.maxPerWallet} used — {mintsLeft} remaining
                </strong>
              </div>
            )}
            <div className="mint-stat-row">
              <span>Supply remaining</span>
              <strong>{supply ? (supply.max - supply.minted).toString() : "—"}</strong>
            </div>

            {/* Status messages */}
            {state === "confirm" && (
              <div className="mint-status">
                <span>Waiting for wallet confirmation...</span>
              </div>
            )}
            {state === "pending" && (
              <div className="mint-status">
                <span>Transaction pending...</span>
              </div>
            )}
            {state === "success" && skull && (
              <div className="mint-status success">
                <span>{skull.name} minted!</span>
                <button className="reset-btn" onClick={reset}>Mint another</button>
              </div>
            )}
            {state === "error" && error && (
              <div className="mint-status error">
                <span>{error}</span>
                <button className="reset-btn" onClick={reset}>Try again</button>
              </div>
            )}
            {mintsLeft === 0 && authenticated && state === "idle" && (
              <div className="mint-status error">
                <span>You've reached the 3-mint limit for this wallet.</span>
              </div>
            )}

            {/* Action button */}
            {!authenticated ? (
              <button className="btn btn-primary" onClick={login}>
                Connect Wallet to Mint
              </button>
            ) : (
              <button
                className="btn btn-primary"
                disabled={!canMint || state !== "idle"}
                onClick={handleMint}
              >
                {state === "confirm" ? "Waiting..." :
                  state === "pending" ? "Minting..." :
                  state === "success" ? "Minted!" :
                  mintsLeft === 0 ? "Limit Reached" :
                  `Mint ${selectedQuantity} — FREE`}
              </button>
            )}

            <p className="mint-note">
              Skull traits are computed from blockchain entropy at mint time.
              You cannot preview or predict your skull.
            </p>
          </div>
        </div>

        {skull && state === "success" && <SkullResult skull={skull} />}
      </section>
    </main>
  );
}
