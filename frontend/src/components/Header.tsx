import { usePrivy } from "@privy-io/react-auth";
import { CONFIG } from "../lib/config";
import type { SupplyInfo } from "../hooks/useSupply";

interface Props {
  supply: SupplyInfo | null;
}

export function Header({ supply }: Props) {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const addr = user?.wallet?.address;
  const short = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : null;

  return (
    <header className="header">
      <div className="header-left">
        <span className="logo">💀 HASHSKULLS</span>
        {supply && (
          <span className="header-supply">
            {supply.minted.toLocaleString()} / {supply.max.toLocaleString()} minted
          </span>
        )}
      </div>
      <div className="header-right">
        <span className="header-network">{CONFIG.chainName}</span>
        {!authenticated ? (
          <button
            className="btn btn-outline"
            onClick={login}
            disabled={!ready}
          >
            Connect Wallet
          </button>
        ) : (
          <button className="btn btn-outline" onClick={logout}>
            {short ?? "Connected"}
          </button>
        )}
      </div>
    </header>
  );
}
