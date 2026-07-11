export class Wallet {
  private key: string;
  constructor(privateKey: string) {
    this.key = privateKey;
  }
  getPublicKey(): string {
    // Nostr pubkey must be 64-char hex string
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
  getAddress(): string {
    return "mock_address_" + this.key.substring(0, 6);
  }
}

export class SDK {
  blockchain = {
    getCurrentBlockNumber: async () => Math.floor(Date.now() / 1000),
    waitForBlock: async (block: number) => {
      const current = Math.floor(Date.now() / 1000);
      if (block > current) {
        await new Promise(r => setTimeout(r, (block - current) * 1000));
      }
    }
  };
  ledger = {
    aggregateMetric: async (metric: string, start: number, end: number) => Math.floor(Math.random() * 10000).toString(),
    computeBlockInterval: async (start: number, end: number) => Math.floor(Math.random() * 5 + 1).toString()
  };
  identity = {
    getActiveNametagsCount: async () => Math.floor(Math.random() * 500)
  };
  intent = {
    list: async (query: { roundId: string }) => {
      return [] as Intent[]; // mock empty intents
    },
    create: async (payload: any, privateKey?: string) => {
      console.log("Mock intent create:", payload);
      return { id: "intent_" + Math.floor(Math.random() * 1000), payload } as Intent;
    }
  };
  constructor(config: any) {}
}

export class Escrow {
  constructor(address: string, sdk: SDK) {}
  async stake(roundId: string, amount: string): Promise<void> {
    console.log(`Mock: staked ${amount} for round ${roundId}`);
  }
  async lock(roundId: string, intentId: string, amount: string): Promise<void> {
    console.log(`Mock: locked ${amount} for round ${roundId} intent ${intentId}`);
  }
  async settle(roundId: string, winnerAddress: string): Promise<void> {
    console.log(`Mock: settled round ${roundId} to ${winnerAddress}`);
  }
}

export interface Intent {
  id: string;
  payload: {
    prediction: string;
    walletAddress: string;
  }
}
