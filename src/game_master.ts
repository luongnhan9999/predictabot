/// <reference path="./nostr.d.ts" />


/**
 * Game Master (Oracle) Agent
 * Responsibilities:
 *   1. Announce new prediction rounds via Nostr.
 *   2. Lock an escrow contract for the round.
 *   3. Listen for the target block height.
 *   4. Query on‑chain data to compute the actual metric value.
 *   5. Determine the winning prediction and settle the escrow.
 */

import { SDK, Escrow, Intent, Wallet } from "@unicity/sphere-sdk";
import { SimplePool, signEvent } from "nostr-tools";
import { NOSTR_RELAY_URL, GM_PRIVATE_KEY, TESTNET_RPC, ESCROW_CONTRACT_ADDRESS, ROUND_BLOCK_SPAN } from "./config";
import { nextRoundId, distance } from "./utils";



// Initialise SDK and wallet
const sdk = new SDK({ rpcUrl: TESTNET_RPC, network: "testnet" });
const gmWallet = new Wallet(GM_PRIVATE_KEY);

// Nostr pool for publishing events
const pool = new SimplePool();


function publish(event: any) {
  // Publish to configured relay URL (array as per nostr-tools API)
  return pool.publish([NOSTR_RELAY_URL], event);
}

interface RoundSpec {
  roundId: string;
  metric: string;
  startBlock: number;
  endBlock: number;
  stakeAmount: string;
}

const activeRounds: Record<string, RoundSpec> = {};

async function announceRound(metric: string) {
  const currentBlock = await sdk.blockchain.getCurrentBlockNumber();
  const roundId = nextRoundId();
  const startBlock = currentBlock + 1;
  const endBlock = startBlock + ROUND_BLOCK_SPAN - 1;
  const stakeAmount = "1000"; // demo fixed stake

  const round: RoundSpec = { roundId, metric, startBlock, endBlock, stakeAmount };
  activeRounds[roundId] = round;

  const event = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["e", roundId],
      ["metric", metric],
      ["startBlock", startBlock.toString()],
      ["endBlock", endBlock.toString()],
      ["stake", stakeAmount]
    ],
    content: `Round ${roundId}: Predict ${metric} between blocks ${startBlock}-${endBlock}`,
    pubkey: gmWallet.getPublicKey()
  } as any;

  const signed = signEvent(event, GM_PRIVATE_KEY);
  await publish(signed);
  console.log(`Announced round ${roundId}`);
  monitorRound(round);
}

async function monitorRound(round: RoundSpec) {
  console.log(`Monitoring round ${round.roundId} until block ${round.endBlock}`);
  await sdk.blockchain.waitForBlock(round.endBlock);
  const actualValue = await queryMetric(round.metric, round.startBlock, round.endBlock);
  console.log(`Actual ${round.metric}: ${actualValue}`);

  const intents = await fetchPredictions(round.roundId);

  let bestIntent: Intent | null = null;
  let bestDist = Number.MAX_VALUE;
  for (const intent of intents) {
    const pred = Number(intent.payload.prediction);
    const d = distance(pred, actualValue);
    if (d < bestDist) {
      bestDist = d;
      bestIntent = intent;
    }
  }

  if (bestIntent) {
    const winnerAddress = bestIntent.payload.walletAddress;
    const escrow = new Escrow(ESCROW_CONTRACT_ADDRESS, sdk);
    await escrow.settle(round.roundId, winnerAddress);
    console.log(`Round ${round.roundId} settled to ${winnerAddress}`);
    const settleEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["e", round.roundId], ["winner", winnerAddress]],
      content: `Round ${round.roundId} settled. Winner: ${winnerAddress}`,
      pubkey: gmWallet.getPublicKey()
    } as any;
    const signedSettle = signEvent(settleEvent, GM_PRIVATE_KEY);
    await publish(signedSettle);
  } else {
    console.log(`No predictions received for round ${round.roundId}`);
  }

  delete activeRounds[round.roundId];
}

async function queryMetric(metric: string, start: number, end: number): Promise<number> {
  switch (metric) {
    case "totalGas":
      const gas = await sdk.ledger.aggregateMetric("gasUsed", start, end);
      return Number(gas);
    case "activeNametags":
      return await sdk.identity.getActiveNametagsCount();
    case "avgBlockInterval":
      const interval = await sdk.ledger.computeBlockInterval(start, end);
      return Number(interval);
    default:
      throw new Error(`Unsupported metric ${metric}`);
  }
}

async function fetchPredictions(roundId: string): Promise<Intent[]> {
  const intents = await sdk.intent.list({ roundId });
  return intents as unknown as Intent[];
}

async function main() {
  const metrics = ["totalGas", "activeNametags", "avgBlockInterval"];
  let idx = 0;
  while (true) {
    const metric = metrics[idx % metrics.length];
    await announceRound(metric);
    await new Promise((res) => setTimeout(res, 30000)); // pause between rounds
    idx++;
  }
}

main().catch((e) => console.error("GM error:", e));
