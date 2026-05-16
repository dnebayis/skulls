// Ethereum Mainnet
export const CONFIG = {
  chainId: 1,
  chainName: "Ethereum",
  rpcUrl: "https://ethereum-rpc.publicnode.com",
  blockExplorer: "https://etherscan.io",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  skullsAddress: "0x2cfe87a67c04b90740c88a536d1fee92801aebdc" as `0x${string}`,
  mintPrice: 225000000000000n, // 0.000225 ETH
} as const;
