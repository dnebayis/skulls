import { CONFIG } from "../lib/config";
import type { MintedSkull } from "../hooks/useMint";

interface Props {
  skull: MintedSkull;
}

export function SkullResult({ skull }: Props) {
  return (
    <div className="skull-result">
      <div className="skull-result-image">
        <img src={skull.image} alt={skull.name} />
      </div>
      <div className="skull-result-meta">
        <div className="skull-result-name">
          {skull.name}
          <span className="rarity-tag">{skull.rarity}</span>
        </div>
        <div className="trait-grid">
          {skull.attributes.map(a => (
            <div key={a.trait_type} className="trait-chip">
              <span className="trait-label">{a.trait_type}</span>
              <span className="trait-value">{a.value}</span>
            </div>
          ))}
        </div>
        <div className="skull-result-links">
          <a
            href={`${CONFIG.blockExplorer}/token/${CONFIG.skullsAddress}/instance/${skull.tokenId}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Blockscout ↗
          </a>
          <a href={`${CONFIG.blockExplorer}/tx/${skull.txHash}`} target="_blank" rel="noreferrer">
            Transaction ↗
          </a>
        </div>
      </div>
    </div>
  );
}
