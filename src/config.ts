import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  mainnet,
  arbitrum,
  avalanche,
  base,
  optimism,
  polygon,
} from "@reown/appkit/networks";
import { http } from "wagmi";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "";

const networks = [mainnet, arbitrum, avalanche, base, optimism, polygon];

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [avalanche.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
  },
});

export { wagmiAdapter, projectId };
