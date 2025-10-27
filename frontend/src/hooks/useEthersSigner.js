import { useMemo } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { providers } from 'ethers';

/**
 * Hook to convert wagmi v2's viem wallet client to ethers.js signer
 * This allows us to maintain compatibility with existing ethers.js contract code
 */
export function useEthersSigner({ chainId } = {}) {
  const { data: walletClient } = useWalletClient({ chainId });
  const publicClient = usePublicClient({ chainId });

  return useMemo(() => {
    if (!walletClient || !publicClient) return null;

    const { account, chain, transport } = walletClient;
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address
    };

    const provider = new providers.Web3Provider(transport, network);
    const signer = provider.getSigner(account.address);

    return signer;
  }, [walletClient, publicClient]);
}
