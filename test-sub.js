const { SimplePool } = require('nostr-tools');
const pool = new SimplePool();
const relay = "wss://nos.lol";

console.log("Subscribing...");
const sub = pool.sub([relay], [{ kinds: [1] }]);
sub.on('event', event => {
  const tags = Object.fromEntries(event.tags.map(t => [t[0], t.slice(1)]));
  if (tags['metric']) {
    console.log("Received metric event!", event.id);
  } else {
    console.log("Received other event", event.id);
  }
});
sub.on('eose', () => console.log('eose'));

setTimeout(() => process.exit(0), 5000);
