// src/sdk.d.ts
/**
 * Minimal TypeScript declarations for the Unicity Sphere SDK used in the prototype.
 * The real SDK provides many more methods; we only declare the subset needed
 * by the GM and Player agents so that the project compiles without type errors.
 */

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
