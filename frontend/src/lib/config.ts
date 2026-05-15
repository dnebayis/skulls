export const CONFIG = {
  chainId: 11155111,
  chainName: "Sepolia",
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  blockExplorer: "https://eth-sepolia.blockscout.com",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rendererAddress:   "0x709685EBDAC289A94ED02966D6c2e168FB0B87dd" as `0x${string}`,
  rendererAddressV4: "0x4E03193F485152656601124029c943D477cA2981" as `0x${string}`,
  skullsAddress:   "0xEe4561dBc06B287B3fd1b51ac4a27859a20196D7" as `0x${string}`,
  wrapperAddress:  "0xc03A6BdD4bE35E3665b712742E6fe3225f97214d" as `0x${string}`,
  marketAddress:   "0xaF4C8E0e86FCc9047fF82B434d6e36E522e1E985" as `0x${string}`,
  mintPrice: 225000000000000n, // 0.000225 ETH, approximately $0.50 near $2.2k/ETH
  maxPerWallet: 3,
} as const;
