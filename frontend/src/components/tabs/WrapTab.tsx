import { useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCollection } from "../../hooks/useCollection";
import { useWrap } from "../../hooks/useWrap";
import { CONFIG } from "../../lib/config";
import { useState } from "react";

export function WrapTab() {
  const { authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();
  const address = user?.wallet?.address as `0x${string}` | undefined;
  const { tokens: nativeTokens, loading: nativeLoading, load: loadNative } = useCollection();
  const { wrappedTokens, loading: wrapLoading, loadWrapped, wrap, unwrap } = useWrap();

  const [busy, setBusy] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txOk, setTxOk] = useState<string | null>(null);

  const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
  const externalWallet = wallets.find(w => w.walletClientType !== "privy");
  const activeWallet = externalWallet ?? embeddedWallet;

  useEffect(() => {
    if (address) {
      loadNative(address);
      loadWrapped(address);
    }
  }, [address, loadNative, loadWrapped]);

  async function doWrap(tokenId: bigint) {
    if (!activeWallet || !address) return;
    setTxError(null); setTxOk(null);
    setBusy(`wrap-${tokenId}`);
    try {
      const provider = await activeWallet.getEthereumProvider();
      await wrap(provider, address, tokenId);
      setTxOk(`HashSkull #${tokenId} wrapped successfully.`);
      await Promise.all([loadNative(address), loadWrapped(address)]);
    } catch (e: unknown) {
      setTxError((e as { shortMessage?: string; message?: string }).shortMessage ?? "Transaction failed");
    } finally {
      setBusy(null);
    }
  }

  async function doUnwrap(tokenId: bigint) {
    if (!activeWallet || !address) return;
    setTxError(null); setTxOk(null);
    setBusy(`unwrap-${tokenId}`);
    try {
      const provider = await activeWallet.getEthereumProvider();
      await unwrap(provider, address, tokenId);
      setTxOk(`HashSkull #${tokenId} unwrapped successfully.`);
      await Promise.all([loadNative(address), loadWrapped(address)]);
    } catch (e: unknown) {
      setTxError((e as { shortMessage?: string; message?: string }).shortMessage ?? "Transaction failed");
    } finally {
      setBusy(null);
    }
  }

  if (!authenticated) {
    return (
      <main>
        <section className="tab-empty">
          <p className="tab-empty-text">Connect your wallet to wrap or unwrap HashSkulls.</p>
          <button className="btn btn-primary" style={{ width: "auto" }} onClick={login}>
            Connect Wallet
          </button>
        </section>
      </main>
    );
  }

  const loading = nativeLoading || wrapLoading;

  return (
    <main>
      <section style={{ paddingTop: 40, paddingBottom: 24 }}>
        <p className="hero-eyebrow">Wrap / Unwrap</p>
        <h2 className="tab-heading">Bridge to ERC-721</h2>
        <p className="hero-sub" style={{ marginTop: 8 }}>
          HashSkulls are native objects, not ERC-721. Wrap them to trade on OpenSea,
          Blur, and other marketplaces. Unwrap to restore the native token anytime.
        </p>
      </section>

      <div className="wrap-info-row">
        <div className="wrap-info-box">
          <span className="wrap-info-label">Native contract</span>
          <a href={`${CONFIG.blockExplorer}/address/${CONFIG.skullsAddress}`} target="_blank" rel="noreferrer" className="wrap-info-addr">
            {CONFIG.skullsAddress.slice(0, 10)}…{CONFIG.skullsAddress.slice(-8)} ↗
          </a>
        </div>
        <div className="wrap-info-box">
          <span className="wrap-info-label">ERC-721 wrapper</span>
          <a href={`${CONFIG.blockExplorer}/address/${CONFIG.wrapperAddress}`} target="_blank" rel="noreferrer" className="wrap-info-addr">
            {CONFIG.wrapperAddress.slice(0, 10)}…{CONFIG.wrapperAddress.slice(-8)} ↗
          </a>
        </div>
        <div className="wrap-info-box">
          <span className="wrap-info-label">Royalty</span>
          <span className="wrap-info-addr">None</span>
        </div>
      </div>

      {txError && (
        <div className="mint-status error" style={{ marginBottom: 16 }}>
          <span>{txError}</span>
          <button className="reset-btn" onClick={() => setTxError(null)}>Dismiss</button>
        </div>
      )}
      {txOk && (
        <div className="mint-status success" style={{ marginBottom: 16 }}>
          <span>{txOk}</span>
          <button className="reset-btn" onClick={() => setTxOk(null)}>Dismiss</button>
        </div>
      )}

      {loading && <div className="tab-empty"><p className="tab-empty-text">Loading tokens...</p></div>}

      {/* Native (unwrapped) skulls */}
      {!loading && nativeTokens.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <p className="market-panel-title">Native skulls — ready to wrap</p>
          <div className="skull-grid">
            {nativeTokens.map(t => (
              <div key={t.tokenId.toString()} className="skull-card">
                <div className="skull-card-image">
                  <img src={t.image} alt={t.name} />
                </div>
                <div className="skull-card-info">
                  <span className="skull-card-name">{t.name}</span>
                  <span className="rarity-tag">{t.rarity}</span>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", width: "100%" }}
                  disabled={!!busy}
                  onClick={() => doWrap(t.tokenId)}
                >
                  {busy === `wrap-${t.tokenId}` ? "Wrapping..." : "Wrap to ERC-721"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wrapped skulls */}
      {!loading && wrappedTokens.length > 0 && (
        <div>
          <p className="market-panel-title">Wrapped skulls (ERC-721) — ready to unwrap</p>
          <div className="skull-grid">
            {wrappedTokens.map(t => (
              <div key={t.tokenId.toString()} className="skull-card">
                <div className="skull-card-image">
                  <img src={t.image} alt={t.name} />
                  <span className="wrap-badge">ERC-721</span>
                </div>
                <div className="skull-card-info">
                  <span className="skull-card-name">{t.name}</span>
                  <span className="rarity-tag">{t.rarity}</span>
                </div>
                <button
                  className="btn btn-outline"
                  style={{ padding: "8px 16px", width: "100%" }}
                  disabled={!!busy}
                  onClick={() => doUnwrap(t.tokenId)}
                >
                  {busy === `unwrap-${t.tokenId}` ? "Unwrapping..." : "Unwrap"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && nativeTokens.length === 0 && wrappedTokens.length === 0 && (
        <div className="tab-empty">
          <p className="tab-empty-text">No HashSkulls found in this wallet. Mint one first.</p>
        </div>
      )}
    </main>
  );
}
