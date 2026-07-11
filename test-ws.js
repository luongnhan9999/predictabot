const WebSocket = require('ws');
const { getEventHash, getSignature, getPublicKey } = require('nostr-tools');

const pk = "1f9d45e999c159828d1fae7f6004b321a4f0b2f6ab5d705db85e13ea7e2d9317";
const event = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: "test event raw",
  pubkey: getPublicKey(pk)
};
event.id = getEventHash(event);
event.sig = getSignature(event, pk);

function testRelay(url) {
  const ws = new WebSocket(url);
  ws.on('open', () => {
    console.log("Connected to", url);
    ws.send(JSON.stringify(["EVENT", event]));
  });
  ws.on('message', (msg) => {
    console.log("Message from", url, msg.toString());
    ws.close();
  });
  ws.on('error', (err) => console.log("Error from", url, err.message));
}

testRelay('wss://nos.lol');
testRelay('wss://relay.primal.net');
testRelay('wss://relay.damus.io');
