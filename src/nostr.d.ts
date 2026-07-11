// src/nostr.d.ts

declare module "nostr-tools" {
  export function signEvent(event: any, privateKey: string): string;
  export function getSignature(event: any, privateKey: string): string;
  export function getEventHash(event: any): string;
  export function getPublicKey(privateKey: string): string;
  export class SimplePool {
    publish(relays: string[], event: any): Promise<any>;
    sub(relays: string[], filters: any[]): {
      on(event: string, handler: (data: any) => void): void;
    };
  }
}
