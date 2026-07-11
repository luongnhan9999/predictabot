// src/config.ts
import * as dotenv from "dotenv";

dotenv.config();

export const NOSTR_RELAY_URL = process.env.NOSTR_RELAY_URL || "wss://relay.nostr.org";
export const GM_PRIVATE_KEY = process.env.GM_PRIVATE_KEY || ""; // hex string
export const PLAYER_PRIVATE_KEY = process.env.PLAYER_PRIVATE_KEY || "";
export const TESTNET_RPC = process.env.TESTNET_RPC || "https://testnet.unicity.network/rpc";
export const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || "0xEscrowContract";
export const ROUND_BLOCK_SPAN = Number(process.env.ROUND_BLOCK_SPAN) || 100; // number of blocks per round
