/// <reference path="./nostr.d.ts" />


/**
 * Player Agent – autonomously generates a prediction and stakes it in the escrow.
 */

import { SDK, Escrow, Intent, Wallet } from "./mock-sdk";
import { SimplePool, getEventHash, getSignature } from "nostr-tools";
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
    nostrEvent.id = getEventHash(nostrEvent);
    nostrEvent.sig = getSignature(nostrEvent, PLAYER_PRIVATE_KEY);
    try {
      const pub = pool.publish([NOSTR_RELAY_URL], nostrEvent);
      if (Array.isArray(pub)) {
        pub.forEach(p => p.catch(() => {}));
      } else if (pub && typeof pub.catch === 'function') {
        pub.catch(() => {});
      }
    } catch (e) {}
  });

  sub.on("eose", () => console.log("Subscribed to round announcements"));
}

// Memory to simulate a "moving average" or trend tracking strategy
const metricHistory: Record<string, number> = {};

function computePrediction(metric: string): number {
  // Base ranges for metrics
  let baseValue = 0;
  let variance = 0;
  
  switch (metric) {
    case "totalGas":
      baseValue = 250000;
      variance = 50000;
      break;
    case "activeNametags":
      baseValue = 125;
      variance = 25;
      break;
    case "avgBlockInterval":
      baseValue = 3;
      variance = 1;
      break;
    default:
      return 0;
  }

  // Simulate a trend-following bot
  if (!metricHistory[metric]) {
    metricHistory[metric] = baseValue;
  }
  
  // Random walk based on previous value to simulate realistic market fluctuations
  const fluctuation = (Math.random() * variance * 2) - variance;
  const newValue = metricHistory[metric] + fluctuation;
  
  // Ensure we don't drop below 0
  const finalPrediction = Math.max(0, Math.round(newValue));
  
  // Update memory
  metricHistory[metric] = finalPrediction;
  
  return finalPrediction;
}

function main() {
  console.log("Player agent started – listening for rounds...");
  subscribeToRounds();
  // Keep process alive
  setInterval(() => {}, 1000 * 60 * 60);
}

main();
