import { lazy, Suspense, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSupply } from "./hooks/useSupply";
import { CONFIG } from "./lib/config";

const HomeTab = lazy(() => import("./components/tabs/HomeTab").then(module => ({ default: module.HomeTab })));
const MintTab = lazy(() => import("./components/tabs/MintTab").then(module => ({ default: module.MintTab })));
const CollectionTab = lazy(() => import("./components/tabs/CollectionTab").then(module => ({ default: module.CollectionTab })));
const MarketTab = lazy(() => import("./components/tabs/MarketTab").then(module => ({ default: module.MarketTab })));
const WrapTab = lazy(() => import("./components/tabs/WrapTab").then(module => ({ default: module.WrapTab })));

type Tab = "home" | "mint" | "collection" | "market" | "wrap";

const TABS: { id: Tab; label: string }[] = [
  { id: "home",       label: "Home" },
  { id: "mint",       label: "Mint" },
  { id: "collection", label: "My Assets" },
  { id: "market",     label: "Marketplace" },
  { id: "wrap",       label: "Wrap" },
];

export function App() {
  const { supply, refresh } = useSupply();
  const { authenticated, user, login, logout } = usePrivy();
  const [tab, setTab] = useState<Tab>("home");

  const address = user?.wallet?.address as string | undefined;

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">HASHSKULLS</span>
          {supply && (
            <span className="header-supply">
              {supply.minted.toString()}/{supply.max.toString()} minted
            </span>
          )}
        </div>
        <div className="header-right">
          <span className="header-network">Ethereum</span>
          {!authenticated ? (
            <button className="btn btn-outline" onClick={login}>Connect</button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="header-addr">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
              <button className="btn btn-outline" onClick={logout}>Disconnect</button>
            </div>
          )}
        </div>
      </header>

      {/* Tab nav */}
      <nav className="tab-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " tab-btn-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <Suspense fallback={<div className="tab-empty"><p className="tab-empty-text">Loading...</p></div>}>
        {tab === "home"       && <HomeTab />}
        {tab === "mint"       && <MintTab supply={supply} onMinted={refresh} />}
        {tab === "collection" && <CollectionTab />}
        {tab === "market"     && <MarketTab />}
        {tab === "wrap"       && <WrapTab />}
      </Suspense>

      {/* Footer */}
      <footer className="footer">
        <a href={`${CONFIG.blockExplorer}/address/${CONFIG.skullsAddress}`} target="_blank" rel="noreferrer">
          HashSkulls ↗
        </a>
        <a href={`${CONFIG.blockExplorer}/address/${CONFIG.wrapperAddress}`} target="_blank" rel="noreferrer">
          ERC-721 Wrapper ↗
        </a>
        <a href={`${CONFIG.blockExplorer}/address/${CONFIG.marketAddress}`} target="_blank" rel="noreferrer">
          Marketplace ↗
        </a>
        <span className="footer-note">Native object · Not ERC-721 · Wrap to trade on external marketplaces</span>
      </footer>
    </div>
  );
}
