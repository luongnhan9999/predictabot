# PredictaBot: The Macroeconomic Agent Arena

## Overview
PredictaBot is a prototype autonomous prediction market built on **Unicity Testnet v2** for the **Games** track of the Builder Program.  Agents compete to forecast macro‑level network metrics (total gas, active nametags, block interval) and stake testnet tokens in an escrow.  The Game Master (GM) Oracle runs as an autonomous agent, validates the outcome on‑chain, and settles the escrow to the closest prediction.

## Project Structure
```
PredictaBot/
├─ src/
│  ├─ game_master.ts      # GM Oracle logic
│  ├─ player_predict.ts   # Player agent logic
│  ├─ utils.ts            # Helper utilities
│  └─ config.ts           # Environment configuration
├─ .env.example            # Example env file
├─ package.json
├─ tsconfig.json
├─ Dockerfile              # Optional AstridOS container
└─ README.md               # (this file)
```

## Setup
1. **Clone the repository** (or copy the folder to your workspace).  The repo lives at `c:/Users/Admin/Documents/unicity luongnhan/PredictaBot`.
2. **Install dependencies**
   ```bash
   cd "c:/Users/Admin/Documents/unicity luongnhan/PredictaBot"
   npm ci
   ```
3. **Create an `.env` file** based on `.env.example` and fill in your keys:
   - `GM_PRIVATE_KEY` – hex private key for the GM agent.
   - `PLAYER_PRIVATE_KEY` – hex private key for a player agent (you can generate multiple for more players).
   - `NOSTR_RELAY_URL` – Nostr relay (default provided).
   - `TESTNET_RPC` – Testnet RPC endpoint (default provided).
   - `ESCROW_CONTRACT_ADDRESS` – address of the escrow contract on Testnet v2.
   - `ROUND_BLOCK_SPAN` – number of blocks per round (default `100`).
4. **Build the TypeScript sources**
   ```bash
   npm run build
   ```
5. **Run agents**
   - **Easiest method (Windows):** Just double-click the `start.bat` file in the folder! This will automatically compile and run both agents concurrently in the same terminal.
   - **Command line:**
     ```bash
     npm run start:all
     ```
   - **Separate terminals:**
     ```bash
     npm run start-gm
     npm run start-player
     ```

## AstridOS Deployment (optional)
A minimal Dockerfile is provided to run each agent inside an AstridOS‑compatible container.  Build and run with:
```bash
# Build image (tag as gm or player)
docker build -t predictabot-gm --target gm .
# Run GM container (will keep running)
docker run -d --name predictabot-gm predictabot-gm

# Build player image
docker build -t predictabot-player --target player .
# Run a player container (you can spin up many)
docker run -d --name predictabot-player1 predictabot-player
```
The Dockerfile uses `node:18-alpine` and copies the source code, installs dependencies, and sets the appropriate entrypoint.

## Testing
- **Unit tests** (Jest) are set up.  Run `npm test` to execute them.
- **Integration test** can be performed by launching a local testnet via the SDK (`npx sphere-sdk start-testnet`) and running a short round with a mocked player.

## How It Works
1. **Round Announcement** – GM publishes a Nostr event containing the round ID, metric, block range, and required stake.
2. **Player Prediction** – Player agents listen for the announcement, compute a deterministic forecast, create a `SignedIntent` via the SDK, lock the stake in the escrow, and optionally broadcast the intent via Nostr.
3. **Truth Verification** – When the target block is reached, GM queries on‑chain data for the chosen metric, determines the closest prediction, and calls `Escrow.settle` to transfer the pooled tokens to the winner.
4. **Settlement Broadcast** – GM publishes a settlement event for transparency.

## Extending the Prototype
- Add more sophisticated prediction algorithms (ML models, on‑chain data analytics).
- Implement a proportional reward scheme or tie‑break logic.
- Persist round state on‑chain instead of in‑memory.
- Scale to multiple concurrent rounds.
- Deploy on AstridOS for full sandbox isolation.

---

**Ready to ship!** Feel free to ask for any additional features, adjustments, or deployment guidance.
