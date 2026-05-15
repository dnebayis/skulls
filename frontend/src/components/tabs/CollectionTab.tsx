import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useCollection } from "../../hooks/useCollection";
import { CONFIG } from "../../lib/config";

export function CollectionTab() {
  const { authenticated, user, login } = usePrivy();
  const { tokens, loading, load } = useCollection();
  const address = user?.wallet?.address as `0x${string}` | undefined;

  useEffect(() => {
    if (address) load(address);
  }, [address, load]);

  if (!authenticated) {
    return (
      <main>
        <section className="tab-empty">
          <p className="tab-empty-text">Connect your wallet to view your HashSkulls.</p>
          <button className="btn btn-primary" style={{ width: "auto" }} onClick={login}>
            Connect Wallet
          </button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section style={{ paddingTop: 40, paddingBottom: 24 }}>
        <p className="hero-eyebrow">My HashSkulls</p>
        <h2 className="tab-heading">
          {loading ? "Loading..." : `${tokens.length} skull${tokens.length !== 1 ? "s" : ""} owned`}
        </h2>
      </section>

      {!loading && tokens.length === 0 && (
        <section className="tab-empty">
          <p className="tab-empty-text">
            No HashSkulls found in this wallet.<br />
            Head to the Mint tab to get started.
          </p>
        </section>
      )}

      <div className="skull-grid">
        {tokens.map(token => (
          <div key={token.tokenId.toString()} className="skull-card">
            <div className="skull-card-image">
              <img src={token.image} alt={token.name} />
            </div>
            <div className="skull-card-info">
              <span className="skull-card-name">{token.name}</span>
              <span className="rarity-tag">{token.rarity}</span>
            </div>
            <div className="skull-card-links">
              <a
                href={`${CONFIG.blockExplorer}/token/${CONFIG.skullsAddress}/instance/${token.tokenId}`}
                target="_blank" rel="noreferrer"
              >
                Blockscout ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
