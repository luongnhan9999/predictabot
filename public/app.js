const RELAY_URL = "wss://relay.primal.net";

document.addEventListener("DOMContentLoaded", () => {
    const statusText = document.getElementById("connection-status");
    const indicator = document.querySelector(".status-pill");
    const roundsContainer = document.getElementById("rounds-container");
    const intentsContainer = document.getElementById("intents-container");
    
    // Stats
    const statTotal = document.getElementById("stat-total");
    const statAvg = document.getElementById("stat-avg");

    let rounds = new Map();
    let socket;
    
    // --- CHART.JS SETUP ---
    const ctx = document.getElementById('predictionChart').getContext('2d');
    
    // Gradient for line
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.5)'); // Neon Cyan
    gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

    const chartConfig = {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Prediction Value',
                data: [],
                borderColor: '#00f0ff',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#8a2be2',
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 25, 0.9)',
                    titleFont: { family: 'JetBrains Mono' },
                    bodyFont: { family: 'JetBrains Mono' },
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } },
                    beginAtZero: false
                }
            },
            animation: { duration: 800, easing: 'easeOutQuart' }
        }
    };
    
    const liveChart = new Chart(ctx, chartConfig);
    let totalIntents = 0;
    let predictionSum = 0;

    // --- NOSTR WEBSOCKET ---
    function connect() {
        socket = new WebSocket(RELAY_URL);

        socket.onopen = () => {
            statusText.textContent = "Connected to Damus";
            indicator.classList.add("connected");
            
            const subId = "sub_" + Math.floor(Math.random() * 100000);
            const req = ["REQ", subId, { kinds: [1], limit: 100 }];
            socket.send(JSON.stringify(req));
        };

        socket.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            if (data[0] === "EVENT") {
                handleEvent(data[2]);
            }
        };

        socket.onclose = () => {
            statusText.textContent = "Reconnecting...";
            indicator.classList.remove("connected");
            setTimeout(connect, 3000);
        };
    }

    function handleEvent(event) {
        const tags = Object.fromEntries(event.tags.map(t => [t[0], t.slice(1)]));

        // GM Round Announcement
        if (tags["metric"]) {
            const roundId = tags["e"]?.[0];
            if (!roundId) return;

            if (!rounds.has(roundId)) {
                rounds.set(roundId, event);
                renderRound(roundId, tags);
            }
        } 
        // Player Prediction Intent
        else if (tags["intent"] && tags["prediction"]) {
            const roundId = tags["e"]?.[0];
            const intentId = tags["intent"]?.[0];
            const predictionVal = parseFloat(tags["prediction"]?.[0]);
            
            renderIntent(intentId, pubkeyShort(event.pubkey), predictionVal);
            updateChart(predictionVal);
        }
    }

    // --- UI UPDATES ---
    function pubkeyShort(pk) {
        return pk ? pk.substring(0, 6) + '..' + pk.substring(pk.length-4) : 'unknown';
    }

    function clearEmptyState(container) {
        const empty = container.querySelector(".tech-empty-state");
        if (empty) empty.remove();
    }

    function renderRound(id, tags) {
        clearEmptyState(roundsContainer);

        const card = document.createElement("div");
        card.className = "card round";
        
        const metric = tags["metric"][0] || "Unknown";
        const blocks = `${tags["startBlock"]?.[0]}-${tags["endBlock"]?.[0]}`;

        card.innerHTML = `
            <div class="card-header">
                <span>ROUND <span class="hash">${id.substring(0, 8)}</span></span>
                <span class="badge">${metric}</span>
            </div>
            <div class="card-body">
                <div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 4px;">Blocks</div>
                    <div style="font-family: var(--font-mono); font-size: 0.9rem;">${blocks}</div>
                </div>
                <div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 4px; text-align: right;">Stake</div>
                    <div style="color: var(--warning); font-family: var(--font-mono);">${tags["stake"]?.[0] || 0} UNI</div>
                </div>
            </div>
        `;
        
        roundsContainer.prepend(card);
        if (roundsContainer.children.length > 20) roundsContainer.lastChild.remove();
    }

    function renderIntent(intentId, playerShort, prediction) {
        clearEmptyState(intentsContainer);

        const card = document.createElement("div");
        card.className = "card intent";
        
        card.innerHTML = `
            <div class="card-header">
                <span>INTENT <span class="hash">${(intentId || "").substring(0, 8)}</span></span>
                <span>${playerShort}</span>
            </div>
            <div class="card-body">
                <div style="font-size: 0.8rem; color: var(--text-secondary);">Predicted Value</div>
                <div class="card-value">${prediction.toLocaleString()}</div>
            </div>
        `;
        
        intentsContainer.prepend(card);
        if (intentsContainer.children.length > 20) intentsContainer.lastChild.remove();
    }

    function updateChart(value) {
        if (isNaN(value)) return;
        
        totalIntents++;
        predictionSum += value;
        
        // Update Stats UI
        statTotal.textContent = totalIntents;
        statAvg.textContent = Math.round(predictionSum / totalIntents).toLocaleString();

        // Add to Chart
        const now = new Date();
        const timeLabel = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0') + ':' + 
                          now.getSeconds().toString().padStart(2, '0');

        liveChart.data.labels.push(timeLabel);
        liveChart.data.datasets[0].data.push(value);

        // Keep last 30 data points
        if (liveChart.data.labels.length > 30) {
            liveChart.data.labels.shift();
            liveChart.data.datasets[0].data.shift();
        }

        liveChart.update('none'); // Update without full animation for smoother stream
    }

    // Initialize
    connect();
});
