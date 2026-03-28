/**
 * useHIP4Signer — adapts any wagmi wallet to the SDK signer interface.
 *
 * Works with MetaMask, WalletConnect, Privy, Turnkey, Coinbase Wallet,
 * and any other connector compatible with wagmi v2.
 *
 * Returns null when no wallet is connected or the wallet client is not
 * yet available (e.g. during initial load).
 *
 * Usage:
 *   const signer = useHIP4Signer();
 *   if (!signer) return <ConnectButton />;
 *   const exchange = client.exchange(signer.walletClient);
 */

"use client";

import { useAccount, useWalletClient } from "wagmi";
import type { WalletClient } from "viem";

export interface HIP4Signer {
  /** Connected wallet address */
  address: `0x${string}`;
  /** wagmi WalletClient — can be passed directly to client.exchange() */
  walletClient: WalletClient;
}

/**
 * Returns the active wallet as an HIP4Signer, or null if not connected.
 *
 * The walletClient is compatible with @nktkas/hyperliquid ExchangeClient.
 * Pass it to `client.exchange(signer.walletClient)` to create an exchange
 * client that signs with the user's browser wallet.
 */
export function useHIP4Signer(): HIP4Signer | null {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  if (!address || !walletClient) return null;

  return { address, walletClient: walletClient as WalletClient };
}
