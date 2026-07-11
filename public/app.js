const RELAY_URL = "wss://relay.damus.io";

document.addEventListener("DOMContentLoaded", () => {
    const statusText = document.getElementById("connection-status");
    const indicator = document.querySelector(".status-indicator");
    const roundsContainer = document.getElementById("rounds-container");
    const intentsContainer = document.getElementById("intents-container");

    let rounds = new Map();
    let socket;

    function connect() {
        socket = new WebSocket(RELAY_URL);

        socket.onopen = () => {
            statusText.textContent = "Connected to Damus Relay";
            indicator.classList.add("connected");
            
            // Subscribe to kind 1 events that have 'e' or 'metric' tags (basic filter)
            const subId = "sub_" + Math.floor(Math.random() * 100000);
            const req = ["REQ", subId, { kinds: [1], limit: 50 }];
            socket.send(JSON.stringify(req));
        };

        socket.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            if (data[0] === "EVENT") {
                handleEvent(data[2]);
            }
        };

        socket.onclose = () => {
            statusText.textContent = "Disconnected. Reconnecting...";
            indicator.classList.remove("connected");
            setTimeout(connect, 3000);
        };
    }

    function handleEvent(event) {
        const tags = Object.fromEntries(event.tags.map(t => [t[0], t.slice(1)]));

        // It's a GM Round Announcement
        if (tags["metric"]) {
            const roundId = tags["e"]?.[0];
            if (!roundId) return;

            // Only add if we haven't seen it recently to avoid flickering
            if (!rounds.has(roundId)) {
                rounds.set(roundId, event);
                renderRound(roundId, tags);
            }
        } 
        // It's a Player Prediction Intent
        else if (tags["intent"] && tags["prediction"]) {
            const roundId = tags["e"]?.[0];
            const intentId = tags["intent"]?.[0];
            const prediction = tags["prediction"]?.[0];
            
            renderIntent(roundId, event.pubkey, prediction);
        }
    }

    function renderRound(id, tags) {
        // Clear empty state if needed
        const emptyState = roundsContainer.querySelector(".empty-state");
        if (emptyState) emptyState.remove();

        const card = document.createElement("div");
        card.className = "round-card";
        card.innerHTML = `
            <div class="round-header">
                <span class="round-id">${id.substring(0, 16)}...</span>
                <span class="badge">${tags["metric"][0]}</span>
            </div>
            <div class="round-details">
                <p>Blocks: <strong>${tags["startBlock"]?.[0]} - ${tags["endBlock"]?.[0]}</strong></p>
                <p>Stake Req: <strong>${tags["stake"]?.[0]} tokens</strong></p>
            </div>
        `;
        
        // Prepend to show newest first
        roundsContainer.prepend(card);

        // Keep only top 10 to prevent DOM bloat
        if (roundsContainer.children.length > 10) {
            roundsContainer.lastChild.remove();
        }
    }

    function renderIntent(roundId, pubkey, prediction) {
        const emptyState = intentsContainer.querySelector(".empty-state");
        if (emptyState) emptyState.remove();

        const item = document.createElement("div");
        item.className = "intent-item";
        item.innerHTML = `
            <div>
                <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">Round: ${roundId.substring(0,8)}...</p>
                <span class="intent-player">Player: ${pubkey.substring(0, 8)}...</span>
            </div>
            <div class="intent-value">${prediction}</div>
        `;
        
        intentsContainer.prepend(item);

        if (intentsContainer.children.length > 15) {
            intentsContainer.lastChild.remove();
        }
    }

    connect();
});
