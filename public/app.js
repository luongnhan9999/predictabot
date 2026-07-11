/* =============================================
   PREDICTABOT ARENA — PREMIUM DARK DASHBOARD
   app.js — Full interactive frontend
   ============================================= */

const RELAY_URL = "wss://relay.snort.social";
const GM_PUBKEY = "b3d36877daf229f950e33f579838e267426589a0f71128f4176b8ceda764985d";

document.addEventListener("DOMContentLoaded", () => {

    // === DOM References ===
    const statusText = document.getElementById("connection-status");
    const badge = document.getElementById("connection-badge");
    const roundsContainer = document.getElementById("rounds-container");
    const intentsContainer = document.getElementById("intents-container");
    const leaderboardContainer = document.getElementById("leaderboard-container");

    // Nav stats
    const navRounds = document.getElementById("nav-rounds");
    const navPlayers = document.getElementById("nav-players");
    const navIntents = document.getElementById("nav-intents");

    // KPI elements
    const kpiGasValue = document.getElementById("kpi-gas-value");
    const kpiGasDelta = document.getElementById("kpi-gas-delta");
    const kpiNametagsValue = document.getElementById("kpi-nametags-value");
    const kpiNametagsDelta = document.getElementById("kpi-nametags-delta");
    const kpiIntervalValue = document.getElementById("kpi-interval-value");
    const kpiIntervalDelta = document.getElementById("kpi-interval-delta");
    const kpiAccuracyValue = document.getElementById("kpi-accuracy-value");
    const kpiAccuracyDelta = document.getElementById("kpi-accuracy-delta");

    // Chart stats
    const statTotal = document.getElementById("stat-total");
    const statAvg = document.getElementById("stat-avg");
    const statLastUpdate = document.getElementById("stat-last-update");

    // Counters
    const roundsCount = document.getElementById("rounds-count");
    const intentsCount = document.getElementById("intents-count");
    const chartSubtitle = document.getElementById("chart-subtitle");

    // === DATA STORES ===
    const rounds = new Map();
    const playerScores = new Map(); // pubkey -> { predictions, wins }
    const metricData = {
        totalGas: { values: [], predictions: [], labels: [] },
        activeNametags: { values: [], predictions: [], labels: [] },
        avgBlockInterval: { values: [], predictions: [], labels: [] }
    };
    let activeMetric = "totalGas";
    let totalIntentCount = 0;
    let predictionSum = 0;
    let socket;

    // === SPARKLINE CHARTS ===
    function createSparkline(canvasId, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        return new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ data: [], borderColor: color, borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.4 }] },
            options: {
                responsive: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } },
                animation: { duration: 300 }
            }
        });
    }

    const sparkGas = createSparkline('spark-gas', '#00e5ff');
    const sparkNametags = createSparkline('spark-nametags', '#a855f7');
    const sparkInterval = createSparkline('spark-interval', '#10b981');

    function updateSparkline(spark, value) {
        if (!spark) return;
        const d = spark.data;
        d.labels.push('');
        d.datasets[0].data.push(value);
        if (d.labels.length > 15) { d.labels.shift(); d.datasets[0].data.shift(); }
        spark.update('none');
    }

    // === MAIN CHART ===
    const ctx = document.getElementById('predictionChart').getContext('2d');

    const gradientCyan = ctx.createLinearGradient(0, 0, 0, 400);
    gradientCyan.addColorStop(0, 'rgba(0, 229, 255, 0.25)');
    gradientCyan.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

    const gradientPurple = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPurple.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
    gradientPurple.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

    const liveChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Actual Value',
                    data: [],
                    borderColor: '#00e5ff',
                    backgroundColor: gradientCyan,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#00e5ff',
                    pointBorderColor: '#030308',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.35,
                    order: 1
                },
                {
                    label: 'Prediction',
                    data: [],
                    borderColor: '#a855f7',
                    backgroundColor: gradientPurple,
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointBackgroundColor: '#a855f7',
                    pointBorderColor: '#030308',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.35,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#94a3b8',
                        font: { family: "'JetBrains Mono'", size: 11 },
                        boxWidth: 12,
                        boxHeight: 2,
                        padding: 15,
                        usePointStyle: false
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(8, 8, 26, 0.95)',
                    titleFont: { family: "'JetBrains Mono'", size: 12 },
                    bodyFont: { family: "'JetBrains Mono'", size: 11 },
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)', drawBorder: false },
                    ticks: { color: '#475569', font: { family: "'JetBrains Mono'", size: 10 }, maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)', drawBorder: false },
                    ticks: { color: '#475569', font: { family: "'JetBrains Mono'", size: 11 } },
                    beginAtZero: false
                }
            },
            animation: { duration: 600, easing: 'easeOutQuart' }
        }
    });

    // === METRIC TAB SWITCHING ===
    document.getElementById('metric-tabs').addEventListener('click', (e) => {
        if (!e.target.classList.contains('metric-tab')) return;
        document.querySelectorAll('.metric-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        activeMetric = e.target.dataset.metric;
        refreshChart();
    });

    function refreshChart() {
        const md = metricData[activeMetric];
        liveChart.data.labels = [...md.labels];
        liveChart.data.datasets[0].data = [...md.values];
        liveChart.data.datasets[1].data = [...md.predictions];
        liveChart.update();
        chartSubtitle.textContent = `Showing ${activeMetric} · ${md.values.length} data points`;
    }

    // === NOSTR WEBSOCKET ===
    function connect() {
        socket = new WebSocket(RELAY_URL);

        socket.onopen = () => {
            statusText.textContent = "Live · Nostr Relay";
            badge.classList.add("connected");

            const subId = "predictabot_" + Math.floor(Math.random() * 100000);
            // Subscribe to ALL kind:1 events (both GM and Player)
            const req = ["REQ", subId, { kinds: [1], limit: 200 }];
            socket.send(JSON.stringify(req));
        };

        socket.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data);
                if (data[0] === "EVENT") {
                    handleEvent(data[2]);
                }
            } catch (e) {}
        };

        socket.onclose = () => {
            statusText.textContent = "Reconnecting...";
            badge.classList.remove("connected");
            setTimeout(connect, 3000);
        };

        socket.onerror = () => {
            statusText.textContent = "Connection Error";
            badge.classList.remove("connected");
        };
    }

    function handleEvent(event) {
        const tags = {};
        for (const t of event.tags) {
            tags[t[0]] = t.slice(1);
        }

        // GM Round Announcement (has "metric" tag)
        if (tags["metric"]) {
            const roundId = tags["e"] ? tags["e"][0] : null;
            if (!roundId || rounds.has(roundId)) return;

            const metric = tags["metric"][0];
            const startBlock = tags["startBlock"] ? tags["startBlock"][0] : "?";
            const endBlock = tags["endBlock"] ? tags["endBlock"][0] : "?";
            const stake = tags["stake"] ? tags["stake"][0] : "0";

            rounds.set(roundId, { metric, startBlock, endBlock, stake, time: event.created_at });
            renderRound(roundId, metric, startBlock, endBlock, stake, event.created_at);

            // Update KPI with actual values from content
            const actualMatch = event.content.match(/Actual\s+(\w+):\s+([\d.]+)/);
            if (actualMatch) {
                updateMetricKPI(actualMatch[1], parseFloat(actualMatch[2]));
            }

            navRounds.textContent = rounds.size;
            roundsCount.textContent = rounds.size;
        }

        // Settlement (has "winner" tag)
        else if (tags["winner"]) {
            const winner = tags["winner"][0];
            addPlayerScore(winner, true);
            updateLeaderboard();
        }

        // Player Intent (has "prediction" tag)
        else if (tags["prediction"] && tags["intent"]) {
            const roundId = tags["e"] ? tags["e"][0] : null;
            const intentId = tags["intent"] ? tags["intent"][0] : "?";
            const predVal = parseFloat(tags["prediction"][0]);
            const playerPk = event.pubkey;

            totalIntentCount++;
            predictionSum += isNaN(predVal) ? 0 : predVal;
            addPlayerScore(playerPk, false);

            renderIntent(intentId, playerPk, predVal, event.created_at);
            updateChartData(roundId, predVal, event.created_at);
            updateLeaderboard();

            navIntents.textContent = totalIntentCount;
            intentsCount.textContent = totalIntentCount;
            navPlayers.textContent = playerScores.size;
            statTotal.textContent = totalIntentCount;
            statAvg.textContent = totalIntentCount > 0 ? Math.round(predictionSum / totalIntentCount).toLocaleString() : '--';
            statLastUpdate.textContent = formatTime(event.created_at);
        }
    }

    // === KPI UPDATES ===
    const lastKpiValues = {};

    function updateMetricKPI(metric, value) {
        const prev = lastKpiValues[metric];
        lastKpiValues[metric] = value;

        let valEl, deltaEl, spark;
        switch (metric) {
            case "totalGas":
                valEl = kpiGasValue; deltaEl = kpiGasDelta; spark = sparkGas; break;
            case "activeNametags":
                valEl = kpiNametagsValue; deltaEl = kpiNametagsDelta; spark = sparkNametags; break;
            case "avgBlockInterval":
                valEl = kpiIntervalValue; deltaEl = kpiIntervalDelta; spark = sparkInterval; break;
            default: return;
        }

        if (valEl) {
            valEl.textContent = value.toLocaleString();
            animateValue(valEl);
        }

        if (deltaEl && prev !== undefined) {
            const diff = value - prev;
            const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : '0.0';
            deltaEl.textContent = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%`;
            deltaEl.className = `kpi-delta ${diff >= 0 ? 'positive' : 'negative'}`;
        }

        // Feed data into the metric store for the chart
        const md = metricData[metric];
        md.values.push(value);
        md.labels.push(formatTime(Math.floor(Date.now() / 1000)));
        if (md.values.length > 50) { md.values.shift(); md.labels.shift(); }

        if (metric === activeMetric) refreshChart();
        updateSparkline(spark, value);

        // Update accuracy
        updateAccuracy();
    }

    function updateAccuracy() {
        const md = metricData[activeMetric];
        if (md.values.length < 2 || md.predictions.length < 2) return;

        let sumError = 0;
        let count = 0;
        for (let i = 0; i < Math.min(md.values.length, md.predictions.length); i++) {
            if (md.values[i] > 0 && md.predictions[i] > 0) {
                const error = Math.abs(md.values[i] - md.predictions[i]) / md.values[i];
                sumError += error;
                count++;
            }
        }

        if (count > 0) {
            const accuracy = Math.max(0, (1 - sumError / count) * 100);
            kpiAccuracyValue.textContent = accuracy.toFixed(1) + '%';
            kpiAccuracyDelta.textContent = `Based on ${count} rounds`;

            // Update ring
            const ring = document.getElementById('accuracy-ring');
            if (ring) ring.setAttribute('stroke-dasharray', `${accuracy}, 100`);
        }
    }

    function animateValue(el) {
        el.style.transform = 'scale(1.08)';
        el.style.transition = 'transform 0.15s ease';
        setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
    }

    // === CHART DATA ===
    function updateChartData(roundId, prediction, timestamp) {
        // Figure out what metric this round is for
        const round = rounds.get(roundId);
        const metric = round ? round.metric : activeMetric;

        const md = metricData[metric];
        // Ensure predictions array is as long as labels
        while (md.predictions.length < md.labels.length) md.predictions.push(null);
        // Add prediction at the current position
        if (md.predictions.length > 0) {
            md.predictions[md.predictions.length - 1] = prediction;
        } else {
            md.predictions.push(prediction);
            if (md.labels.length === 0) md.labels.push(formatTime(timestamp));
        }

        if (metric === activeMetric) refreshChart();
    }

    // === RENDER ROUND CARD ===
    const metricIcons = { totalGas: "⛽", activeNametags: "🏷️", avgBlockInterval: "⏱️" };
    const metricLabels = { totalGas: "Total Gas", activeNametags: "Nametags", avgBlockInterval: "Block Interval" };

    function renderRound(id, metric, startBlock, endBlock, stake, timestamp) {
        clearEmptyState(roundsContainer);

        const icon = metricIcons[metric] || "📊";
        const label = metricLabels[metric] || metric;
        const shortId = id.replace("round-", "").replace("demo-round-", "#");
        const blockCount = (Number(endBlock) - Number(startBlock) + 1) || "?";

        const card = document.createElement("div");
        card.className = "round-card";
        card.innerHTML = `
            <div class="round-header">
                <div class="round-id-wrap">
                    <span class="round-icon">${icon}</span>
                    <span class="round-id">${shortId}</span>
                </div>
                <span class="round-time">${formatTime(timestamp)}</span>
            </div>
            <div class="round-body">
                <div class="round-metric">
                    <span class="round-metric-label">Metric</span>
                    <span class="round-metric-value">${label}</span>
                </div>
                <div class="round-blocks">
                    <span class="round-blocks-label">Blocks</span>
                    <span class="round-blocks-value">${startBlock} → ${endBlock} <span class="round-blocks-count">(${blockCount})</span></span>
                </div>
            </div>
            <div class="round-footer">
                <div class="round-stake">
                    <span class="round-stake-icon">💰</span>
                    <span class="round-stake-amount">${Number(stake).toLocaleString()} UNI</span>
                </div>
                <span class="round-status">● Live</span>
            </div>
        `;
        roundsContainer.prepend(card);
        if (roundsContainer.children.length > 30) roundsContainer.lastChild.remove();
    }

    // === RENDER INTENT ===
    function renderIntent(intentId, playerPk, prediction, timestamp) {
        clearEmptyState(intentsContainer);

        const chip = document.createElement("div");
        chip.className = "intent-chip";
        chip.innerHTML = `
            <span class="intent-player">${pubkeyShort(playerPk)}</span>
            <span class="intent-prediction">${isNaN(prediction) ? '?' : prediction.toLocaleString()}</span>
            <span class="intent-time">${formatTime(timestamp)}</span>
        `;
        intentsContainer.prepend(chip);
        if (intentsContainer.children.length > 40) intentsContainer.lastChild.remove();
    }

    // === LEADERBOARD ===
    function addPlayerScore(pk, isWin) {
        if (!playerScores.has(pk)) {
            playerScores.set(pk, { predictions: 0, wins: 0 });
        }
        const s = playerScores.get(pk);
        s.predictions++;
        if (isWin) s.wins++;
    }

    function updateLeaderboard() {
        clearEmptyState(leaderboardContainer);
        leaderboardContainer.innerHTML = '';

        const sorted = [...playerScores.entries()]
            .sort((a, b) => b[1].predictions - a[1].predictions)
            .slice(0, 10);

        const maxPreds = sorted.length > 0 ? sorted[0][1].predictions : 1;

        sorted.forEach(([pk, score], idx) => {
            const row = document.createElement('div');
            row.className = 'lb-row';
            const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
            const barWidth = Math.round((score.predictions / maxPreds) * 100);

            row.innerHTML = `
                <span class="lb-rank ${rankClass}">${idx + 1}</span>
                <span class="lb-player">${pubkeyShort(pk)}</span>
                <div class="lb-bar-wrap"><div class="lb-bar" style="width:${barWidth}%"></div></div>
                <span class="lb-score">${score.predictions}</span>
            `;
            leaderboardContainer.appendChild(row);
        });
    }

    // === UTILS ===
    function pubkeyShort(pk) {
        if (!pk || pk.length < 12) return pk || 'unknown';
        return pk.substring(0, 8) + '…' + pk.substring(pk.length - 4);
    }

    function formatTime(ts) {
        const d = new Date(ts * 1000);
        return d.getHours().toString().padStart(2, '0') + ':' +
               d.getMinutes().toString().padStart(2, '0') + ':' +
               d.getSeconds().toString().padStart(2, '0');
    }

    function clearEmptyState(container) {
        const empty = container.querySelector(".empty-state");
        if (empty) empty.remove();
    }

    // === PARTICLE CANVAS ===
    function initParticles() {
        const canvas = document.getElementById('particleCanvas');
        if (!canvas) return;
        const pctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const count = 60;

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.1
            });
        }

        function draw() {
            pctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        pctx.beginPath();
                        pctx.moveTo(particles[i].x, particles[i].y);
                        pctx.lineTo(particles[j].x, particles[j].y);
                        pctx.strokeStyle = `rgba(0, 229, 255, ${0.06 * (1 - dist / 150)})`;
                        pctx.lineWidth = 0.5;
                        pctx.stroke();
                    }
                }
            }

            // Draw particles
            for (const p of particles) {
                pctx.beginPath();
                pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                pctx.fillStyle = `rgba(0, 229, 255, ${p.alpha})`;
                pctx.fill();

                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            }

            requestAnimationFrame(draw);
        }

        draw();

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    // === SIMULATED DATA (for demo when no live events) ===
    function startDemoMode() {
        let demoTimeout;

        // If no events within 8 seconds, generate simulated data
        demoTimeout = setTimeout(() => {
            if (totalIntentCount === 0 && rounds.size === 0) {
                chartSubtitle.textContent = "Demo mode · Simulated data";
                runDemoLoop();
            }
        }, 8000);

        function runDemoLoop() {
            const metrics = ["totalGas", "activeNametags", "avgBlockInterval"];
            let roundNum = 1;

            setInterval(() => {
                const metric = metrics[(roundNum - 1) % 3];
                const roundId = `demo-round-${roundNum}`;
                const ts = Math.floor(Date.now() / 1000);
                const baseValues = { totalGas: 5000, activeNametags: 300, avgBlockInterval: 3 };
                const variance = { totalGas: 3000, activeNametags: 100, avgBlockInterval: 1 };

                const actualVal = Math.round(baseValues[metric] + (Math.random() - 0.5) * variance[metric] * 2);
                const predVal = Math.round(actualVal + (Math.random() - 0.5) * variance[metric] * 0.5);

                // Simulate round
                rounds.set(roundId, { metric, startBlock: 1000 + roundNum, endBlock: 1010 + roundNum, stake: "1000", time: ts });
                renderRound(roundId, metric, 1000 + roundNum, 1010 + roundNum, "1000", ts);
                navRounds.textContent = rounds.size;
                roundsCount.textContent = rounds.size;

                // Simulate actual value
                updateMetricKPI(metric, actualVal);

                // Simulate intent
                const fakePk = Array.from({length: 64}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
                totalIntentCount++;
                predictionSum += predVal;
                addPlayerScore(fakePk, Math.random() > 0.7);
                renderIntent(`intent_${roundNum}`, fakePk, predVal, ts);

                // Chart data
                const md = metricData[metric];
                while (md.predictions.length < md.values.length - 1) md.predictions.push(null);
                md.predictions.push(predVal);

                if (metric === activeMetric) refreshChart();

                navIntents.textContent = totalIntentCount;
                intentsCount.textContent = totalIntentCount;
                navPlayers.textContent = playerScores.size;
                statTotal.textContent = totalIntentCount;
                statAvg.textContent = Math.round(predictionSum / totalIntentCount).toLocaleString();
                statLastUpdate.textContent = formatTime(ts);

                updateLeaderboard();
                updateAccuracy();

                roundNum++;
            }, 4000);
        }
    }

    // === INIT ===
    initParticles();
    connect();
    startDemoMode();
});
