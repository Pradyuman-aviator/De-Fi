# ⚔️ DeFi Strategy Arena

### *AlphaGo meets On-Chain Finance*

> **5 AI agents. 5 different strategies. 1 reactive blockchain. Real-time competition.**

Watch autonomous AI trading agents compete head-to-head on Somnia's reactive smart contracts. Each agent uses a different strategy — from momentum chasing to reinforcement learning — reacting to market events in under 1 second.

![Demo](./docs/demo.gif)

---

## 🧠 The Agents

| Agent | Strategy | Logic | Personality |
|-------|----------|-------|-------------|
| 📈 **Momentum Hunter** | Trend Following | Buys strength, sells weakness (>2% threshold) | Aggressive trend chaser |
| ⚖️ **Mean Reverter** | Mean Reversion | Bollinger Bands — buys oversold, sells overbought | Patient contrarian |
| ⚡ **Spread Sniper** | Arbitrage | MA crossover spreads — quick in-and-out | Fast scalper |
| 🛡️ **Risk Guardian** | Risk Parity | Volatility-adjusted position sizing + trend | Cautious adapter |
| 🧠 **Neural Trader** | Reinforcement Learning | On-chain Q-table (45 states × 3 actions) | Self-improving AI |

---

## ⚡ The Reactive Cascade

When price updates, everything happens in under 1 second:

```
Price Update → PriceOracle emits PriceUpdated
    ↓ (simultaneous)
📈 MomentumStrategy.react()    → LONG/SHORT/NEUTRAL
⚖️ MeanReversionStrategy.react() → LONG/SHORT/NEUTRAL  
⚡ ArbitrageStrategy.react()   → LONG/SHORT/NEUTRAL
🛡️ RiskParityStrategy.react()  → LONG/SHORT/NEUTRAL
🧠 RLStrategy.react()          → LONG/SHORT/NEUTRAL
    ↓
PortfolioManager recalculates P&L
    ↓
Leaderboard re-ranks agents
    ↓
Frontend updates with animations
```

**Total time: <1 second.** Only possible on Somnia.

---

## 🏗️ Architecture

### Smart Contracts (11 contracts)
- `PriceOracle.sol` — Trigger engine with 100-price circular buffer
- `StrategyBase.sol` — Abstract agent with position management
- `MomentumStrategy.sol` — Trend-following agent
- `MeanReversionStrategy.sol` — Bollinger Band contrarian
- `ArbitrageStrategy.sol` — MA crossover spread trader
- `RiskParityStrategy.sol` — Volatility-adaptive sizing
- `RLStrategy.sol` — Q-learning with on-chain Q-table
- `PortfolioManager.sol` — Aggregate P&L tracking
- `Leaderboard.sol` — Real-time rankings
- `ArenaCore.sol` — Orchestrator with demo reset
- `ReactiveStrategyHandler.sol` — Somnia Reactivity handler (SomniaEventHandler)

### Frontend (Next.js 14)
- Real-time dashboard with live price display
- 5 animated agent cards with sparklines
- Multi-line performance chart (Recharts)
- Animated leaderboard with rank changes
- 6 preset market scenarios (Flash Crash, Moon Shot, etc.)
- Manual price controls with slider & quick buttons
- Agent detail pages with trade history

### Tech Stack
- **Smart Contracts:** Solidity 0.8.20, Hardhat
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Charts:** Recharts
- **State:** Zustand
- **Animations:** Framer Motion
- **Web3:** Ethers.js v6

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask (optional, for on-chain mode)

### 1. Clone & Install

```bash
git clone https://github.com/Pradyuman-aviator/defi-strategy-arena.git
cd defi-strategy-arena

# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Compile Contracts

```bash
cd contracts
npx hardhat compile
```

### 3. Run Frontend (Mock Mode)

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start clicking scenarios!

### 4. Deploy to Somnia (Optional)

```bash
cd contracts
cp .env.example .env
# Edit .env with your Somnia testnet private key
npx hardhat run scripts/deploy-somnia.js --network somnia
```

### Deployed Contracts (Somnia Testnet)

| Contract | Address |
|----------|--------|
| PriceOracle | [`0xE886...95b4`](https://shannon-explorer.somnia.network/address/0xE88643c9310291275B93BA56EF155A077b8895b4) |
| PortfolioManager | [`0x5Ec4...97dd`](https://shannon-explorer.somnia.network/address/0x5Ec4af50Abd3b13Def7FeCf7d3FC39574D2497dd) |
| Leaderboard | [`0xa840...d60e`](https://shannon-explorer.somnia.network/address/0xa84009185873Bd54ee309fDF7BAE980A78f7d60e) |
| ArenaCore | [`0x03da...7197`](https://shannon-explorer.somnia.network/address/0x03da74bE7a4FE1D14d618a9eb5AfBD9456787197) |
| ReactiveStrategyHandler | [`0x2f1d...e054`](https://shannon-explorer.somnia.network/address/0x2f1d986368351640411394Eb254602CE940de054) |
| MomentumStrategy | [`0x8929...c21C`](https://shannon-explorer.somnia.network/address/0x892916A042af56710ccA23630c6B0c372d6fc21C) |
| MeanReversionStrategy | [`0xA7F2...e7C1`](https://shannon-explorer.somnia.network/address/0xA7F2C9C00a6864e545044f9E3863bd66c05Ee7C1) |
| ArbitrageStrategy | [`0x5fd5...ADc2`](https://shannon-explorer.somnia.network/address/0x5fd5e9BDCaf6b5A9dc1Edfe37EE246DC08F6ADc2) |
| RiskParityStrategy | [`0x1449...7Cc6`](https://shannon-explorer.somnia.network/address/0x1449B54A5c67831aF7D4Dcf03Ed26Bae00947Cc6) |
| RLStrategy | [`0xb970...86e8`](https://shannon-explorer.somnia.network/address/0xb9706Cd0164D700f6B2e5d44f2dC28CE98B886e8) |

---

## 🎮 Demo Scenarios

| Scenario | What Happens | Best Agent |
|----------|-------------|------------|
| 💥 Flash Crash | -20% instant drop, partial recovery | Mean Reverter |
| 🚀 Moon Shot | +25% rally with pullbacks | Momentum Hunter |
| 🌊 Volatility Storm | Wild ±5% swings | Risk Guardian |
| 📊 Sideways Chop | Price goes nowhere | Spread Sniper |
| ⬆️ Bull Run | Steady +15% uptrend | Momentum Hunter |
| ⬇️ Bear Market | Grinding -15% decline | Momentum Hunter |

---

## 🔑 Why Somnia?

| Feature | Ethereum | Solana | **Somnia** |
|---------|----------|--------|------------|
| Reactive Triggers | ❌ | ❌ | ✅ |
| Simultaneous Agent Execution | ❌ | ❌ | ✅ |
| Sub-second Cascade | ~60s | ~5s | **<1s** |
| Gas Cost | $$$  | $ | **Pennies** |

---

## 📈 Future Roadmap

- [ ] Drag-and-drop strategy builder
- [ ] User-created custom agents
- [ ] Tournament mode with prize pools
- [ ] Real asset trading integration
- [ ] Multi-agent coordination (team strategies)
- [ ] On-chain strategy marketplace
- [ ] Mobile app

---

## 📄 License

MIT

---

*Built with ❤️ for the Somnia Hackathon*
