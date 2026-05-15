export function Manifesto() {
  return (
    <section className="manifesto">
      <h2 className="manifesto-title">How it works</h2>

      <div className="manifesto-body">
        <p>
          When you mint a HashSkull, the contract combines blockchain values
          and mint-specific inputs with XOR:
        </p>

        <div className="entropy-table">
          <div className="entropy-row">
            <code>blockhash(n-1)</code>
            <span>The previous block's fingerprint. Set in stone before you arrived.</span>
          </div>
          <div className="entropy-row">
            <code>block.prevrandao</code>
            <span>Ethereum's beacon chain randomness, contributed by thousands of validators via commit-reveal RANDAO. A single validator would have to burn an entire block reward to bias it by one bit.</span>
          </div>
          <div className="entropy-row">
            <code>tokenId</code>
            <span>Your place in the sequence. 1 through 10,000. Makes each mint unique even in the same block.</span>
          </div>
          <div className="entropy-row">
            <code>msg.sender</code>
            <span>Your address. Your presence in the moment of minting.</span>
          </div>
        </div>

        <div className="formula-block">
          <code>seed = keccak256((contract ⊕ blockhash) , (prevrandao ⊕ tokenId ⊕ sender))</code>
        </div>

        <p>
          <code>blockhash(n-1)</code> and <code>prevrandao</code> are the blockchain
          entropy sources. <code>tokenId</code>, <code>msg.sender</code>, and the contract
          address make the seed specific to this collection, wallet, and token.
          No randomness oracle. No off-chain computation.
        </p>

        <p>
          From this single 32-byte seed, every visual trait is derived deterministically:
          body color, eye type, crack pattern, teeth, accessories, rarity tier.
          Eight bytes, eight traits. No randomness oracle. No off-chain computation.
          All of it runs inside the EVM.
        </p>

        <p>
          The SVG is generated and returned fully onchain by <code>tokenURI()</code>.
          No IPFS hash. No metadata server. No CDN. If the contract exists,
          the skull exists. They cannot be separated.
        </p>

        <p className="manifesto-closing">
          No artist chose your skull's color.<br />
          No algorithm was tuned for rarity farming.<br />
          The blockchain computed it. You claimed it.
        </p>
      </div>
    </section>
  );
}
