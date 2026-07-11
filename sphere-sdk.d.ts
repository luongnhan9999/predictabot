// Declaration for @unicity/sphere-sdk used in this prototype

declare module "@unicity/sphere-sdk" {
  export class SDK {
    constructor(config: { rpcUrl: string; network: string });
    blockchain: {
      getCurrentBlockNumber(): Promise<number>;
      waitForBlock(targetBlock: number): Promise<void>;
    };
    ledger: {
      aggregateMetric(metric: string, start: number, end: number): Promise<string>;
      computeBlockInterval(start: number, end: number): Promise<string>;
    };
    identity: {
      getActiveNametagsCount(): Promise<number>;
    };
    intent: {
      create(payload: any, privateKeyHex: string): Promise<any>;
      list(filter: any): Promise<any[]>;
    };
  }
  export class Wallet {
    constructor(privateKeyHex: string);
    getPublicKey(): string;
    getAddress(): string;
  }
  export class Escrow {
    constructor(address: string, sdk: SDK);
    lock(roundId: string, intentId: string, amount: string): Promise<void>;
    settle(roundId: string, winnerAddress: string): Promise<void>;
  }
  export type Intent = any;
}
