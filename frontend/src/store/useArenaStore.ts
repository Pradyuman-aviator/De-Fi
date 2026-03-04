// Mock Simulation Engine — The heart of the frontend
// Simulates the full reactive cascade locally without requiring blockchain

import { create } from 'zustand';

// ============= TYPES =============

export type Position = 'NEUTRAL' | 'LONG' | 'SHORT';
export type StrategyType = 'MOMENTUM' | 'MEAN_REVERSION' | 'ARBITRAGE' | 'RISK_PARITY' | 'RL';

export interface Trade {
    updateId: number;
    action: Position;
    price: number;
    pnl: number;
    timestamp: number;
    reason: string;
}

export interface AgentState {
    id: string;
    name: string;
    type: StrategyType;
    emoji: string;
    color: string;
    position: Position;
    entryPrice: number;
    positionSize: number;
    totalPnL: number;
    unrealizedPnL: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    isActive: boolean;
    isThinking: boolean;
    trades: Trade[];
    pnlHistory: number[];
    description: string;
}

export interface PricePoint {
    updateId: number;
    price: number;
    timestamp: number;
}

export interface LeaderboardEntry {
    agentId: string;
    name: string;
    rank: number;
    totalPnL: number;
    winRate: number;
    totalTrades: number;
    previousRank: number;
}

export interface Scenario {
    id: string;
    name: string;
    emoji: string;
    description: string;
    prices: number[];
    color: string;
}

export interface ArenaStore {
    // State
    currentPrice: number;
    priceHistory: PricePoint[];
    agents: AgentState[];
    leaderboard: LeaderboardEntry[];
    updateCount: number;
    isRunning: boolean;
    isPaused: boolean;
    simulationSpeed: number;
    activeScenario: string | null;
    scenarioProgress: number;

    // Actions
    triggerPriceUpdate: (newPrice: number) => void;
    runScenario: (scenarioId: string) => Promise<void>;
    stopScenario: () => void;
    resetArena: () => void;
    setSimulationSpeed: (speed: number) => void;
}

// ============= SCENARIO DATA =============

export const SCENARIOS: Scenario[] = [
    {
        id: 'flash_crash',
        name: 'Flash Crash',
        emoji: '💥',
        description: 'Sudden -20% crash followed by partial recovery',
        color: '#ef4444',
        prices: [1500, 1480, 1420, 1300, 1200, 1180, 1220, 1280, 1350, 1320, 1380, 1400],
    },
    {
        id: 'moon_shot',
        name: 'Moon Shot',
        emoji: '🚀',
        description: 'Explosive +25% rally with pullbacks',
        color: '#22c55e',
        prices: [1500, 1530, 1580, 1620, 1600, 1650, 1700, 1750, 1720, 1780, 1820, 1875],
    },
    {
        id: 'volatility_storm',
        name: 'Volatility Storm',
        emoji: '🌊',
        description: 'Wild ±5% swings in rapid succession',
        color: '#a855f7',
        prices: [1500, 1575, 1480, 1560, 1420, 1520, 1440, 1580, 1460, 1540, 1490, 1510],
    },
    {
        id: 'sideways',
        name: 'Sideways Chop',
        emoji: '📊',
        description: 'Price goes nowhere — tests patience',
        color: '#64748b',
        prices: [1500, 1505, 1495, 1510, 1490, 1505, 1498, 1502, 1497, 1503, 1500, 1501],
    },
    {
        id: 'bull_run',
        name: 'Bull Run',
        emoji: '⬆️',
        description: 'Steady +15% uptrend over 12 updates',
        color: '#3b82f6',
        prices: [1500, 1515, 1530, 1548, 1565, 1580, 1600, 1618, 1635, 1655, 1680, 1725],
    },
    {
        id: 'bear_market',
        name: 'Bear Market',
        emoji: '⬇️',
        description: 'Grinding -15% decline',
        color: '#f59e0b',
        prices: [1500, 1485, 1470, 1450, 1435, 1415, 1400, 1380, 1365, 1345, 1320, 1275],
    },
];

// ============= AGENT DEFINITIONS =============

const INITIAL_AGENTS: AgentState[] = [
    {
        id: 'momentum',
        name: 'Momentum Hunter',
        type: 'MOMENTUM',
        emoji: '📈',
        color: '#3b82f6',
        position: 'NEUTRAL',
        entryPrice: 0,
        positionSize: 500,
        totalPnL: 0,
        unrealizedPnL: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 50,
        isActive: true,
        isThinking: false,
        trades: [],
        pnlHistory: [0],
        description: 'Chases trends. When price shows strong directional momentum (>2%), it jumps in. Buys strength, sells weakness.',
    },
    {
        id: 'meanrev',
        name: 'Mean Reverter',
        type: 'MEAN_REVERSION',
        emoji: '⚖️',
        color: '#a855f7',
        position: 'NEUTRAL',
        entryPrice: 0,
        positionSize: 500,
        totalPnL: 0,
        unrealizedPnL: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 50,
        isActive: true,
        isThinking: false,
        trades: [],
        pnlHistory: [0],
        description: 'Fades extreme moves. Uses Bollinger Bands to identify oversold/overbought. Buys dips, sells rallies.',
    },
    {
        id: 'arb',
        name: 'Spread Sniper',
        type: 'ARBITRAGE',
        emoji: '⚡',
        color: '#eab308',
        position: 'NEUTRAL',
        entryPrice: 0,
        positionSize: 250,
        totalPnL: 0,
        unrealizedPnL: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 50,
        isActive: true,
        isThinking: false,
        trades: [],
        pnlHistory: [0],
        description: 'Exploits MA crossovers. Trades spread between short-term and long-term moving averages. Quick in-and-out.',
    },
    {
        id: 'riskparity',
        name: 'Risk Guardian',
        type: 'RISK_PARITY',
        emoji: '🛡️',
        color: '#22c55e',
        position: 'NEUTRAL',
        entryPrice: 0,
        positionSize: 500,
        totalPnL: 0,
        unrealizedPnL: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 50,
        isActive: true,
        isThinking: false,
        trades: [],
        pnlHistory: [0],
        description: 'Adapts position size to volatility. Big bets in calm markets, small bets in storms. Combines with trend following.',
    },
    {
        id: 'rl',
        name: 'Neural Trader',
        type: 'RL',
        emoji: '🧠',
        color: '#ef4444',
        position: 'NEUTRAL',
        entryPrice: 0,
        positionSize: 500,
        totalPnL: 0,
        unrealizedPnL: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 50,
        isActive: true,
        isThinking: false,
        trades: [],
        pnlHistory: [0],
        description: 'Reinforcement learning agent with on-chain Q-table (45 states × 3 actions). Learns optimal actions from market patterns.',
    },
];

// ============= STRATEGY LOGIC (mirrors Solidity) =============

function calculateMomentum(prices: number[]): { signal: Position; reason: string } {
    if (prices.length < 3) return { signal: 'NEUTRAL', reason: 'Insufficient data' };
    const window = Math.min(prices.length, 10);
    const oldest = prices[prices.length - window];
    const current = prices[prices.length - 1];
    const momentum = ((current - oldest) / oldest) * 100;

    if (momentum > 2) return { signal: 'LONG', reason: `Strong upward momentum: +${momentum.toFixed(1)}%` };
    if (momentum < -2) return { signal: 'SHORT', reason: `Strong downward momentum: ${momentum.toFixed(1)}%` };
    return { signal: 'NEUTRAL', reason: `Momentum within threshold: ${momentum.toFixed(1)}%` };
}

function calculateMeanReversion(prices: number[]): { signal: Position; reason: string } {
    if (prices.length < 5) return { signal: 'NEUTRAL', reason: 'Insufficient data' };
    const window = Math.min(prices.length, 20);
    const recent = prices.slice(-window);

    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const mad = recent.reduce((sum, p) => sum + Math.abs(p - mean), 0) / recent.length;
    const deviation = mad * 2;
    const current = prices[prices.length - 1];

    if (current < mean - deviation) return { signal: 'LONG', reason: `Oversold: price ${((mean - current) / mean * 100).toFixed(1)}% below mean` };
    if (current > mean + deviation) return { signal: 'SHORT', reason: `Overbought: price ${((current - mean) / mean * 100).toFixed(1)}% above mean` };
    return { signal: 'NEUTRAL', reason: `Within bands (mean: $${mean.toFixed(0)})` };
}

function calculateArbitrage(prices: number[]): { signal: Position; reason: string } {
    if (prices.length < 5) return { signal: 'NEUTRAL', reason: 'Insufficient data' };
    const shortMA = prices.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const longMA = prices.slice(-Math.min(15, prices.length)).reduce((a, b) => a + b, 0) / Math.min(15, prices.length);
    const spread = ((shortMA - longMA) / longMA) * 100;

    if (spread > 1) return { signal: 'LONG', reason: `Bullish crossover (spread: +${spread.toFixed(2)}%)` };
    if (spread < -1) return { signal: 'SHORT', reason: `Bearish crossover (spread: ${spread.toFixed(2)}%)` };
    return { signal: 'NEUTRAL', reason: `Spread converged (${spread.toFixed(2)}%)` };
}

function calculateRiskParity(prices: number[]): { signal: Position; reason: string; sizeMultiplier: number } {
    if (prices.length < 5) return { signal: 'NEUTRAL', reason: 'Insufficient data', sizeMultiplier: 1 };
    const recent = prices.slice(-10);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const volatility = recent.reduce((sum, p) => sum + Math.abs(p - mean) / mean * 100, 0) / recent.length;

    const current = prices[prices.length - 1];
    const ma = prices.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, prices.length);
    const trend = ((current - ma) / ma) * 100;

    // Inverse vol sizing
    const sizeMultiplier = volatility > 3 ? 0.3 : volatility > 1.5 ? 0.7 : 1.5;
    const volLabel = volatility > 3 ? 'High' : volatility > 1.5 ? 'Medium' : 'Low';

    if (Math.abs(trend) < 0.5) return { signal: 'NEUTRAL', reason: `No clear trend (${volLabel} vol)`, sizeMultiplier };
    if (trend > 0) return { signal: 'LONG', reason: `${volLabel} vol: ${sizeMultiplier > 1 ? 'aggressive' : 'cautious'} LONG`, sizeMultiplier };
    return { signal: 'SHORT', reason: `${volLabel} vol: ${sizeMultiplier > 1 ? 'aggressive' : 'cautious'} SHORT`, sizeMultiplier };
}

function calculateRL(prices: number[], agent: AgentState): { signal: Position; reason: string } {
    if (prices.length < 3) return { signal: 'NEUTRAL', reason: 'Gathering data...' };

    const current = prices[prices.length - 1];
    const oldest = prices[Math.max(0, prices.length - 10)];
    const trend = ((current - oldest) / oldest) * 100;

    const recent = prices.slice(-10);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const volatility = recent.reduce((sum, p) => sum + Math.abs(p - mean) / mean * 100, 0) / recent.length;

    // Simplified Q-table logic: combine trend + vol + pnl into action
    const trendScore = trend > 3 ? 2 : trend > 1 ? 1 : trend < -3 ? -2 : trend < -1 ? -1 : 0;
    const volScore = volatility > 3 ? -1 : volatility < 1 ? 1 : 0;
    const pnlScore = agent.totalPnL > 50 ? 1 : agent.totalPnL < -50 ? -1 : 0;

    const combinedScore = trendScore + volScore + pnlScore;

    // Epsilon-greedy: 10% random exploration
    if (Math.random() < 0.1) {
        const actions: Position[] = ['LONG', 'SHORT', 'NEUTRAL'];
        const randomAction = actions[Math.floor(Math.random() * 3)];
        return { signal: randomAction, reason: `RL: Exploring (ε-greedy) → ${randomAction}` };
    }

    if (combinedScore >= 2) return { signal: 'LONG', reason: `RL: Q-table → LONG (confidence: ${Math.abs(combinedScore) * 25}%)` };
    if (combinedScore <= -2) return { signal: 'SHORT', reason: `RL: Q-table → SHORT (confidence: ${Math.abs(combinedScore) * 25}%)` };
    if (combinedScore > 0) return { signal: 'LONG', reason: `RL: Slight bullish lean (Q=${combinedScore})` };
    if (combinedScore < 0) return { signal: 'SHORT', reason: `RL: Slight bearish lean (Q=${combinedScore})` };
    return { signal: 'NEUTRAL', reason: 'RL: Ambiguous state — holding' };
}

// ============= STORE =============

let scenarioTimer: ReturnType<typeof setTimeout> | null = null;

export const useArenaStore = create<ArenaStore>((set, get) => ({
    currentPrice: 1500,
    priceHistory: [{ updateId: 0, price: 1500, timestamp: Date.now() }],
    agents: JSON.parse(JSON.stringify(INITIAL_AGENTS)),
    leaderboard: INITIAL_AGENTS.map((a, i) => ({
        agentId: a.id,
        name: a.name,
        rank: i + 1,
        totalPnL: 0,
        winRate: 50,
        totalTrades: 0,
        previousRank: i + 1,
    })),
    updateCount: 0,
    isRunning: false,
    isPaused: false,
    simulationSpeed: 800,
    activeScenario: null,
    scenarioProgress: 0,

    triggerPriceUpdate: (newPrice: number) => {
        const state = get();
        const prices = [...state.priceHistory.map(p => p.price), newPrice];
        const updateId = state.updateCount + 1;

        // Execute strategy for each agent
        const updatedAgents = state.agents.map(agent => {
            let result: { signal: Position; reason: string; sizeMultiplier?: number };

            switch (agent.type) {
                case 'MOMENTUM':
                    result = calculateMomentum(prices);
                    break;
                case 'MEAN_REVERSION':
                    result = calculateMeanReversion(prices);
                    break;
                case 'ARBITRAGE':
                    result = calculateArbitrage(prices);
                    break;
                case 'RISK_PARITY':
                    result = calculateRiskParity(prices);
                    break;
                case 'RL':
                    result = calculateRL(prices, agent);
                    break;
                default:
                    result = { signal: 'NEUTRAL', reason: 'Unknown strategy' };
            }

            const newAgent = { ...agent, isThinking: true };
            let tradePnL = 0;

            // Close existing position if signal changed
            if (agent.position !== 'NEUTRAL' && result.signal !== agent.position) {
                if (agent.position === 'LONG') {
                    tradePnL = ((newPrice - agent.entryPrice) / agent.entryPrice) * agent.positionSize;
                } else {
                    tradePnL = ((agent.entryPrice - newPrice) / agent.entryPrice) * agent.positionSize;
                }

                newAgent.totalPnL += tradePnL;
                newAgent.totalTrades++;
                if (tradePnL > 0) newAgent.winningTrades++;
                else if (tradePnL < 0) newAgent.losingTrades++;

                newAgent.trades = [
                    ...agent.trades,
                    {
                        updateId,
                        action: 'NEUTRAL' as Position,
                        price: newPrice,
                        pnl: tradePnL,
                        timestamp: Date.now(),
                        reason: `Closed ${agent.position}: ${tradePnL >= 0 ? '+' : ''}$${tradePnL.toFixed(2)}`,
                    },
                ].slice(-30); // Keep last 30 trades
            }

            // Open new position
            if (result.signal !== 'NEUTRAL' && result.signal !== agent.position) {
                const size = (result as any).sizeMultiplier
                    ? agent.positionSize * (result as any).sizeMultiplier
                    : agent.positionSize;

                newAgent.position = result.signal;
                newAgent.entryPrice = newPrice;
                newAgent.positionSize = Math.round(size);

                newAgent.trades = [
                    ...newAgent.trades,
                    {
                        updateId,
                        action: result.signal,
                        price: newPrice,
                        pnl: 0,
                        timestamp: Date.now(),
                        reason: result.reason,
                    },
                ].slice(-30);
            } else if (result.signal === 'NEUTRAL' && agent.position !== 'NEUTRAL') {
                newAgent.position = 'NEUTRAL';
                newAgent.entryPrice = 0;
            } else if (result.signal === 'NEUTRAL') {
                newAgent.position = 'NEUTRAL';
            }

            // Calculate unrealized P&L
            if (newAgent.position === 'LONG') {
                newAgent.unrealizedPnL = ((newPrice - newAgent.entryPrice) / newAgent.entryPrice) * newAgent.positionSize;
            } else if (newAgent.position === 'SHORT') {
                newAgent.unrealizedPnL = ((newAgent.entryPrice - newPrice) / newAgent.entryPrice) * newAgent.positionSize;
            } else {
                newAgent.unrealizedPnL = 0;
            }

            // Update win rate
            const decided = newAgent.winningTrades + newAgent.losingTrades;
            newAgent.winRate = decided > 0 ? Math.round((newAgent.winningTrades / decided) * 100) : 50;

            // Update P&L history
            newAgent.pnlHistory = [...agent.pnlHistory, newAgent.totalPnL + newAgent.unrealizedPnL];

            return newAgent;
        });

        // Update leaderboard
        const sortedAgents = [...updatedAgents].sort(
            (a, b) => (b.totalPnL + b.unrealizedPnL) - (a.totalPnL + a.unrealizedPnL)
        );

        const oldLeaderboard = state.leaderboard;
        const newLeaderboard: LeaderboardEntry[] = sortedAgents.map((agent, idx) => {
            const oldEntry = oldLeaderboard.find(e => e.agentId === agent.id);
            return {
                agentId: agent.id,
                name: agent.name,
                rank: idx + 1,
                totalPnL: agent.totalPnL + agent.unrealizedPnL,
                winRate: agent.winRate,
                totalTrades: agent.totalTrades,
                previousRank: oldEntry?.rank ?? idx + 1,
            };
        });

        set({
            currentPrice: newPrice,
            priceHistory: [...state.priceHistory, { updateId, price: newPrice, timestamp: Date.now() }],
            agents: updatedAgents,
            leaderboard: newLeaderboard,
            updateCount: updateId,
        });

        // Clear thinking animation after 1.5s
        setTimeout(() => {
            set(s => ({
                agents: s.agents.map(a => ({ ...a, isThinking: false })),
            }));
        }, 1500);
    },

    runScenario: async (scenarioId: string) => {
        const scenario = SCENARIOS.find(s => s.id === scenarioId);
        if (!scenario) return;

        const state = get();
        set({ isRunning: true, activeScenario: scenarioId, scenarioProgress: 0 });

        for (let i = 0; i < scenario.prices.length; i++) {
            const currentState = get();
            if (!currentState.isRunning) break; // Stopped

            set({ scenarioProgress: ((i + 1) / scenario.prices.length) * 100 });
            get().triggerPriceUpdate(scenario.prices[i]);

            await new Promise(resolve => {
                scenarioTimer = setTimeout(resolve, currentState.simulationSpeed);
            });
        }

        set({ isRunning: false, activeScenario: null, scenarioProgress: 100 });
    },

    stopScenario: () => {
        if (scenarioTimer) {
            clearTimeout(scenarioTimer);
            scenarioTimer = null;
        }
        set({ isRunning: false, activeScenario: null });
    },

    resetArena: () => {
        if (scenarioTimer) {
            clearTimeout(scenarioTimer);
            scenarioTimer = null;
        }
        set({
            currentPrice: 1500,
            priceHistory: [{ updateId: 0, price: 1500, timestamp: Date.now() }],
            agents: JSON.parse(JSON.stringify(INITIAL_AGENTS)),
            leaderboard: INITIAL_AGENTS.map((a, i) => ({
                agentId: a.id,
                name: a.name,
                rank: i + 1,
                totalPnL: 0,
                winRate: 50,
                totalTrades: 0,
                previousRank: i + 1,
            })),
            updateCount: 0,
            isRunning: false,
            isPaused: false,
            activeScenario: null,
            scenarioProgress: 0,
        });
    },

    setSimulationSpeed: (speed: number) => {
        set({ simulationSpeed: speed });
    },
}));
