import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { formatEther, parseEther } from "viem";
import { useMarket } from "../../hooks/useMarket";
import { useCollection } from "../../hooks/useCollection";
import { CONFIG } from "../../lib/config";

export function MarketTab() {
  const { authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();
  const address = user?.wallet?.address as `0x${string}` | undefined;
  const { listings, loading, loadListings, listToken, buyToken, cancelListing } = useMarket();
  const { tokens: myTokens, load: loadMyTokens } = useCollection();

  const [listingTokenId, setListingTokenId] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
  const externalWallet = wallets.find(w => w.walletClientType !== "privy");
  const activeWallet = externalWallet ?? embeddedWallet;

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useEffect(() => {
    if (address) {
      loadMyTokens(address);
    }
  }, [address, loadMyTokens]);

  async function doList() {
    if (!activeWallet || !address || !listingTokenId || !listingPrice || priceError) return;
    setTxError(null);
    setTxHash(null);
    setBusy("list");
    try {
      const provider = await activeWallet.getEthereumProvider();
      const hash = await listToken(provider, address, BigInt(listingTokenId), listingPrice);
      setTxHash(hash);
      setListingTokenId(""); setListingPrice("");
      await Promise.all([loadListings(), loadMyTokens(address)]);
    } catch (e: unknown) {
      setTxError((e as { shortMessage?: string; message?: string }).shortMessage ?? "Transaction failed");
    } finally {
      setBusy(null);
    }
  }

  async function doBuy(tokenId: bigint, price: bigint) {
    if (!activeWallet || !address) return;
    setTxError(null);
    setTxHash(null);
    setBusy(`buy-${tokenId}`);
    try {
      const provider = await activeWallet.getEthereumProvider();
      const hash = await buyToken(provider, address, tokenId, price);
      setTxHash(hash);
      await Promise.all([loadListings(), loadMyTokens(address)]);
    } catch (e: unknown) {
      setTxError((e as { shortMessage?: string; message?: string }).shortMessage ?? "Transaction failed");
    } finally {
      setBusy(null);
    }
  }

  async function doCancel(tokenId: bigint) {
    if (!activeWallet || !address) return;
    setTxError(null);
    setTxHash(null);
    setBusy(`cancel-${tokenId}`);
    try {
      const provider = await activeWallet.getEthereumProvider();
      const hash = await cancelListing(provider, address, tokenId);
      setTxHash(hash);
      await Promise.all([loadListings(), loadMyTokens(address)]);
    } catch (e: unknown) {
      setTxError((e as { shortMessage?: string; message?: string }).shortMessage ?? "Transaction failed");
    } finally {
      setBusy(null);
    }
  }

  const myListingIds = new Set(listings.filter(l => l.seller.toLowerCase() === address?.toLowerCase()).map(l => l.tokenId.toString()));
  const selectedToken = myTokens.find(t => t.tokenId.toString() === listingTokenId);
  const priceError = getPriceError(listingPrice);
  const canList = !!listingTokenId && !!listingPrice && !priceError && !busy;

  return (
    <main>
      <section style={{ paddingTop: 40, paddingBottom: 24 }}>
        <p className="hero-eyebrow">Marketplace</p>
        <h2 className="tab-heading">Trade HashSkulls peer-to-peer</h2>
        <p className="hero-sub" style={{ marginTop: 8 }}>No marketplace fee. Seller receives ETH directly when a skull sells.</p>
      </section>

      {txError && (
        <div className="mint-status error" style={{ marginBottom: 16 }}>
          <span>{txError}</span>
          <button className="reset-btn" onClick={() => setTxError(null)}>Dismiss</button>
        </div>
      )}
      {txHash && (
        <div className="mint-status success" style={{ marginBottom: 16 }}>
          <span>Transaction confirmed.</span>
          <a className="status-link" href={`${CONFIG.blockExplorer}/tx/${txHash}`} target="_blank" rel="noreferrer">View tx ↗</a>
          <button className="reset-btn" onClick={() => setTxHash(null)}>Dismiss</button>
        </div>
      )}

      {/* List a skull */}
      {authenticated && (
        <div className="market-panel">
          <p className="market-panel-title">List a skull for sale</p>
          <div className="market-list-row">
            <select
              className="market-input"
              value={listingTokenId}
              onChange={e => { setListingTokenId(e.target.value); setTxError(null); }}
            >
              <option value="">Select skull...</option>
              {myTokens.filter(t => !myListingIds.has(t.tokenId.toString())).map(t => (
                <option key={t.tokenId.toString()} value={t.tokenId.toString()}>
                  {t.name} ({t.rarity})
                </option>
              ))}
            </select>
            <input
              className="market-input"
              type="number"
              min="0"
              step="0.001"
              placeholder="Price in ETH"
              value={listingPrice}
              onChange={e => { setListingPrice(e.target.value); setTxError(null); }}
            />
            <button
              className="btn btn-primary"
              style={{ width: "auto", padding: "10px 20px" }}
              disabled={!canList}
              onClick={doList}
            >
              {busy === "list" ? "Listing..." : "List"}
            </button>
          </div>
          {(selectedToken || priceError) && (
            <div className="market-help-row">
              {selectedToken && <span>Selected: {selectedToken.name} · {selectedToken.rarity}</span>}
              {priceError && <span className="market-error">{priceError}</span>}
            </div>
          )}
        </div>
      )}

      {/* Listings grid */}
      {loading ? (
        <div className="tab-empty"><p className="tab-empty-text">Loading listings...</p></div>
      ) : listings.length === 0 ? (
        <div className="tab-empty"><p className="tab-empty-text">No active listings. Be the first to list a skull.</p></div>
      ) : (
        <div className="skull-grid">
          {listings.map(l => {
            const isMine = l.seller.toLowerCase() === address?.toLowerCase();
            const isBuying = busy === `buy-${l.tokenId}`;
            const isCancelling = busy === `cancel-${l.tokenId}`;
            return (
              <div key={l.tokenId.toString()} className="skull-card">
                <div className="skull-card-image">
                  <img src={l.image} alt={l.name} />
                </div>
                <div className="skull-card-info">
                  <span className="skull-card-name">{l.name}</span>
                  <span className="rarity-tag">{l.rarity}</span>
                </div>
                <div className="skull-card-price">
                  <strong>{formatEther(l.price)} ETH</strong>
                  {isMine && <span className="listing-owner-tag">Your listing</span>}
                  {isMine ? (
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: 11, padding: "4px 12px" }}
                      disabled={!!busy}
                      onClick={() => doCancel(l.tokenId)}
                    >
                      {isCancelling ? "Cancelling..." : "Cancel"}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ padding: "6px 16px", width: "auto" }}
                      disabled={!authenticated || !!busy}
                      onClick={() => authenticated ? doBuy(l.tokenId, l.price) : login()}
                    >
                      {isBuying ? "Buying..." : "Buy"}
                    </button>
                  )}
                </div>
                <a
                  className="skull-card-link"
                  href={`${CONFIG.blockExplorer}/token/${CONFIG.skullsAddress}/instance/${l.tokenId}`}
                  target="_blank" rel="noreferrer"
                >
                  Blockscout ↗
                </a>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function getPriceError(value: string) {
  if (!value) return null;
  try {
    const wei = parseEther(value);
    if (wei <= 0n) return "Price must be greater than 0 ETH.";
    return null;
  } catch {
    return "Enter a valid ETH amount.";
  }
}
