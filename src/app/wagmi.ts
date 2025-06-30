import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  (process.env.NEXT_PUBLIC_INFURA_PROJECT_ID
    ? `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`
    : undefined);

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId: '6e633dec1508096ad0327442dc883646' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(sepoliaRpcUrl),
  },
}) 