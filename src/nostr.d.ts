// src/nostr.d.ts

declare module "nostr-tools" {
  export function signEvent(event: any, privateKey: string): any;
  export class SimplePool {
    publish(relays: string[], event: any): Promise<any>;
    sub(relays: string[], filters: any[]): {
      on(event: string, handler: (data: any) => void): void;
    };
  }
}
