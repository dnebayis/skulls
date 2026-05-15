export const CONFIG = {
  chainId: 1,
  chainName: "Ethereum",
  rpcUrl: "https://ethereum-rpc.publicnode.com",
  blockExplorer: "https://etherscan.io",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rendererAddress:   "0xa23353ef8d2951aed528627771c74069a00005ca" as `0x${string}`,
  rendererAddressV4: "0x4E03193F485152656601124029c943D477cA2981" as `0x${string}`,
  skullsAddress:   "0x2cfe87a67c04b90740c88a536d1fee92801aebdc" as `0x${string}`,
  wrapperAddress:  "0x88223ee6d93c1967844ee604972ed484974c427d" as `0x${string}`,
  marketAddress:   "0x29a276f16f743b02d8bc8b058fa9051afc766673" as `0x${string}`,
  mintPrice: 225000000000000n, // 0.000225 ETH
  maxPerWallet: 3,
} as const;
