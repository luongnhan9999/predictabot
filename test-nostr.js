const { SimplePool, getEventHash, getSignature, getPublicKey } = require('nostr-tools');
const pool = new SimplePool();
const relay = "wss://nos.lol";
const pk = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const event = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: "test",
  pubkey: getPublicKey(pk)
};
event.id = getEventHash(event);
event.sig = getSignature(event, pk);

console.log("Publishing event...", event);

let pub = pool.publish([relay], event);
if (Array.isArray(pub)) {
  console.log("Pub is array of promises");
  Promise.allSettled(pub).then(console.log);
} else {
  console.log("Pub is object with event emitters");
  pub.on('ok', (r) => console.log('ok from', r));
  pub.on('failed', (r, err) => console.log('failed from', r, err));
}
setTimeout(() => process.exit(0), 3000);
