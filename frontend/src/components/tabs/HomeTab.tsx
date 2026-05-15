export function HomeTab() {
  return (
    <main>
      <section className="hero">
        <p className="hero-eyebrow">10,000 pixel skulls — fully onchain</p>
        <h1>
          Nobody designed these characters.<br />
          <span className="hero-accent">The blockchain gave birth to them.</span>
        </h1>
        <p className="hero-sub">
          Every trait is derived from a single hash computed at mint time.
          The SVG lives inside the contract. No IPFS. No server. No artist.
        </p>
      </section>

      <section className="manifesto">
        <p className="manifesto-chapter">How it works</p>

        <div className="manifesto-body">
          <p>
            The moment you mint a HashSkull, the contract combines two blockchain
            values with two mint-specific inputs using XOR:
          </p>

          <div className="entropy-table">
            <div className="entropy-row">
              <code>blockhash(n-1)</code>
              <span>The previous block's fingerprint. Set in stone before you arrived — no miner can change it after the fact.</span>
            </div>
            <div className="entropy-row">
              <code>block.prevrandao</code>
              <span>Ethereum's beacon chain randomness, contributed by thousands of validators via commit-reveal RANDAO. A single validator would have to sacrifice an entire block reward to bias it by one bit.</span>
            </div>
            <div className="entropy-row">
              <code>tokenId</code>
              <span>Your place in the sequence — 1 through 10,000. Makes each mint unique even if two people transact in the same block.</span>
            </div>
            <div className="entropy-row">
              <code>msg.sender</code>
              <span>Your address. Your presence in the moment of minting. Two different wallets minting in the same block will never get the same skull.</span>
            </div>
          </div>

          <div className="formula-block">
            <code>seed = keccak256((contract ⊕ blockhash) , (prevrandao ⊕ tokenId ⊕ sender))</code>
          </div>

          <p>
            <code>blockhash(n-1)</code> and <code>prevrandao</code> are the blockchain
            entropy sources. <code>tokenId</code>, <code>msg.sender</code>, and the contract
            address make the seed specific to this collection, wallet, and token.
            There is no oracle and no off-chain randomness service.
          </p>

          <p>
            From this single 32-byte seed, eight visual traits are derived
            deterministically: body color, eye type, crack pattern, tooth style,
            background, accessory, eye glow, and rarity. Each trait maps to a
            specific byte of the seed. No oracle. No off-chain computation.
            All of it runs inside the EVM.
          </p>

          <p>
            Rarity is not a separate random variable. It is computed from the combination
            of visual traits you actually received — so a skull that looks Legendary
            is Legendary because of what it shows, not because of a hidden dice roll.
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
    </main>
  );
}
