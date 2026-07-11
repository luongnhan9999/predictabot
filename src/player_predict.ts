/// <reference path="./nostr.d.ts" />


/**
 * Player Agent – autonomously generates a prediction and stakes it in the escrow.
 */

import { SDK, Escrow, Intent, Wallet } from "@unicity/sphere-sdk";
import { SimplePool, signEvent } from "nostr-tools";
import { NOSTR_RELAY_URL, PLAYER_PRIVATE_KEY, TESTNET_RPC, ESCROW_CONTRACT_ADDRESS } from "./config";
import { placeholderPredict, roundTo } from "./utils";

// Helper to convert hex private key to Uint8Array for nostr-tools
function hexToUint8(hex: string): Uint8Array {
  const cleaned = hex.replace(/^0x/, "");
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Initialise SDK (Testnet v2)
const sdk = new SDK({ rpcUrl: TESTNET_RPC, network: "testnet" });
const playerWallet = new Wallet(PLAYER_PRIVATE_KEY);

// Nostr pool for round announcements
const pool = new SimplePool();

// Subscribe to round announcements (kind 1 events with "metric" tag)
function subscribeToRounds() {
  const sub = pool.sub([NOSTR_RELAY_URL], [{ kinds: [1] }]);

  sub.on("event", async (event: any) => {
    const tags = Object.fromEntries(event.tags.map((t: any) => [t[0], t.slice(1)]));
    if (!tags["metric"]) return; // not a round announcement
    const roundId = tags["e"][0];
    const metric = tags["metric"][0];
    const startBlock = Number(tags["startBlock"][0]);
    const endBlock = Number(tags["endBlock"][0]);
    const stakeAmount = tags["stake"][0];
    console.log(`Received round ${roundId} – metric ${metric}`);

    const prediction = computePrediction(metric);
    console.log(`Predicted ${metric}: ${prediction}`);

    const intentPayload = {
      roundId,
      metric,
      prediction: prediction.toString(),
      stakeAmount,
      walletAddress: playerWallet.getAddress()
    } as any;

    const intent = await sdk.intent.create(intentPayload, PLAYER_PRIVATE_KEY);

    const escrow = new Escrow(ESCROW_CONTRACT_ADDRESS, sdk);
    await escrow.lock(roundId, intent.id, stakeAmount);
    console.log(`Locked ${stakeAmount} tokens for round ${roundId}`);

    const nostrEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["e", roundId],
        ["intent", intent.id],
        ["prediction", prediction.toString()]
      ],
      content: `Player intent for round ${roundId}`,
      pubkey: playerWallet.getPublicKey()
    } as any;
    const signed = (signEvent as any)(nostrEvent, PLAYER_PRIVATE_KEY);
    await pool.publish([NOSTR_RELAY_URL], signed);
  });

  sub.on("eose", () => console.log("Subscribed to round announcements"));
}

function computePrediction(metric: string): number {
  switch (metric) {
    case "totalGas":
      return placeholderPredict(metric, [100000, 500000]);
    case "activeNametags":
      return placeholderPredict(metric, [50, 200]);
    case "avgBlockInterval":
      return placeholderPredict(metric, [1, 5]);
    default:
      return 0;
  }
}

function main() {
  console.log("Player agent started – listening for rounds...");
  subscribeToRounds();
}

main();
