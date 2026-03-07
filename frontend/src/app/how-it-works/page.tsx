'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const AGENTS = [
    {
        emoji: '[TRD]', name: 'Momentum Hunter', color: '#3b82f6',
        type: 'Trend Following',
        logic: 'Calculates price change over the last 10 updates. If momentum exceeds ±2%, it enters a position in that direction.',
        strengths: ['Strong sustained trends (Bull Run, Bear Market)', 'Quick to catch big moves'],

        params: [
            { name: 'Lookback Window', value: '10 updates' },
            { name: 'Threshold', value: '±2%' },
            { name: 'Position Size', value: '$500 fixed' },
        ],
        formula: 'momentum = (currentPrice − price10UpdatesAgo) / price10UpdatesAgo × 100',
    },
    {
        emoji: '[MNR]', name: 'Mean Reverter', color: '#a855f7',
        type: 'Statistical Reversion',
        logic: 'Uses Bollinger Bands (via Mean Absolute Deviation) to detect when price deviates too far from its average. Buys the dip, sells the rip.',
        strengths: ['Flash Crash recovery — buys when everyone panics', 'Profits from overdone moves snapping back'],

        params: [
            { name: 'Lookback', value: '20 updates' },
            { name: 'Band Width', value: '2× MAD' },
            { name: 'Position Size', value: 'Dynamic (scales with deviation)' },
        ],
        formula: 'deviation = MAD × 2 → if price < mean − deviation → LONG',
    },
    {
        emoji: '[ARB]', name: 'Spread Sniper', color: '#eab308',
        type: 'Moving Average Crossover',
        logic: 'Compares a fast 3-period moving average against a slow 15-period MA. When the fast crosses above the slow, it goes long. Quick in-and-out trades.',
        strengths: ['Catches trend reversals early', 'Small consistent profits with tight stops'],

        params: [
            { name: 'Short MA', value: '3 updates' },
            { name: 'Long MA', value: '15 updates' },
            { name: 'Threshold', value: '±1% spread' },
        ],
        formula: 'spread = (shortMA − longMA) / longMA × 100',
    },
    {
        emoji: '[RSK]', name: 'Risk Guardian', color: '#22c55e',
        type: 'Volatility-Adaptive',
        logic: 'Measures market volatility first, then adjusts position size inversely — big bets in calm markets, tiny bets in storms. Uses simple trend for direction.',
        strengths: ['Survives everything — never gets blown up', 'Best risk-adjusted returns over time'],

        params: [
            { name: 'Vol > 3%', value: 'Position × 0.3 (cautious)' },
            { name: 'Vol 1.5-3%', value: 'Position × 0.7 (moderate)' },
            { name: 'Vol < 1.5%', value: 'Position × 1.5 (aggressive)' },
        ],
        formula: 'volatility = avg(|price − mean| / mean × 100) → inverse sizing',
    },
    {
        emoji: '[NRL]', name: 'Neural Trader', color: '#ef4444',
        type: 'Reinforcement Learning (Q-Learning)',
        logic: 'Maintains an on-chain Q-table with 45 states × 3 actions. Observes market trend, volatility, and its own P&L to pick optimal actions. Learns from rewards after each trade. Explores randomly 15% of the time.',
        strengths: ['Gets smarter over time — adapts to patterns', 'The only agent that truly learns', 'Can discover strategies humans miss'],

        params: [
            { name: 'States', value: '45 (3 trend × 3 vol × 5 PnL)' },
            { name: 'Actions', value: '3 (LONG, SHORT, NEUTRAL)' },
            { name: 'Learning Rate', value: '10%' },
            { name: 'Exploration', value: '15% → decays to 5%' },
        ],
        formula: 'Q[s][a] += α × (reward + γ × max(Q[s′]) − Q[s][a])',
    },
];

const CASCADE_STEPS = [
    {
        step: 1, emoji: '[NEW]', title: 'Price Arrives',
        detail: 'A new market price is submitted to the PriceOracle contract. It stores the price in a circular buffer of 100 entries and emits a PriceUpdated event with the new price, old price, change, and volatility.',
        time: 'T+0ms', contract: 'PriceOracle.sol',
    },
    {
        step: 2, emoji: '[EVT]', title: 'Event Fires',
        detail: 'The PriceUpdated event is emitted on-chain. On Somnia, the ReactiveStrategyHandler (which extends SomniaEventHandler) can auto-subscribe to this event. Validators detect the event and invoke the handler.',
        time: 'T+50ms', contract: 'ReactiveStrategyHandler.sol',
    },
    {
        step: 3, emoji: '[EXE]', title: 'Agents React',
        detail: 'All 5 strategy contracts receive the new price simultaneously. Each reads price history from the Oracle, computes its signal (LONG/SHORT/NEUTRAL), and executes the trade — closing old positions and opening new ones.',
        time: 'T+150ms', contract: 'StrategyBase.sol → 5 strategies',
    },
    {
        step: 4, emoji: '[PNL]', title: 'P&L Calculated',
        detail: 'PortfolioManager aggregates stats from all strategies — realized P&L, unrealized P&L, win rate, trade count. Each strategy tracks its own performance independently.',
        time: 'T+200ms', contract: 'PortfolioManager.sol',
    },
    {
        step: 5, emoji: '[RNK]', title: 'Rankings Update',
        detail: 'Leaderboard fetches fresh stats from PortfolioManager, sorts agents by total P&L, and saves a snapshot to its circular buffer of rank history. Rankings include position changes (↑↓).',
        time: 'T+250ms', contract: 'Leaderboard.sol',
    },
    {
        step: 6, emoji: '[GUI]', title: 'UI Refreshes',
        detail: 'The frontend receives the updated state — chart extends, agent cards light up with new positions, P&L numbers animate, and the leaderboard reshuffles with rank change indicators.',
        time: 'T+350ms', contract: 'Frontend (React/Zustand)',
    },
];

const SCENARIOS = [
    { name: 'Flash Crash', emoji: '[C]', desc: 'Sudden -20% crash followed by partial recovery', winner: 'Mean Reverter', color: '#ef4444' },
    { name: 'Moon Shot', emoji: '[M]', desc: 'Explosive +25% rally with pullbacks', winner: 'Momentum Hunter', color: '#22c55e' },
    { name: 'Volatility Storm', emoji: '[V]', desc: 'Wild ±5% swings in rapid succession', winner: 'Risk Guardian', color: '#a855f7' },
    { name: 'Sideways Chop', emoji: '[S]', desc: 'Price goes nowhere — tests patience', winner: 'Spread Sniper', color: '#64748b' },
    { name: 'Bull Run', emoji: '[B]', desc: 'Steady +15% uptrend over 12 updates', winner: 'Momentum Hunter', color: '#3b82f6' },
    { name: 'Bear Market', emoji: '[R]', desc: 'Grinding -15% decline', winner: 'Momentum Hunter', color: '#f59e0b' },
];

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
};

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="glass-card border-b border-arena-border sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/arena" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-sm bg-arena-card border border-arena-border flex items-center justify-center text-sm font-bold text-arena-accent font-mono">
                            {'///'}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-arena-text-primary tracking-tight group-hover:text-arena-accent transition-colors">
                                How It Works
                            </h1>
                            <p className="text-xs text-arena-text-muted -mt-0.5">DeFi Strategy Arena</p>
                        </div>
                    </Link>
                    <Link
                        href="/arena"
                        className="px-4 py-2 text-sm rounded-lg bg-arena-accent text-white hover:bg-arena-accent-bright transition-colors font-medium shadow-lg shadow-arena-accent/20"
                    >
                        ← Back to Arena
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-10 space-y-16">

                {/* Hero */}
                <motion.section {...fadeIn} className="text-center space-y-4">
                    <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-arena-accent via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        AlphaGo Meets On-Chain Finance
                    </h2>
                    <p className="text-lg text-arena-text-secondary max-w-2xl mx-auto leading-relaxed">
                        5 autonomous AI agents compete in real-time DeFi trading, each using a different strategy.
                        Watch them react to market scenarios, track their P&L, and discover which strategy wins.
                    </p>
                    <div className="flex items-center justify-center gap-4 pt-2">
                        <div className="flex -space-x-2">
                            {AGENTS.map(a => (
                                <span key={a.name} className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: a.color + '20', border: `2px solid ${a.color}` }}>
                                    {a.emoji}
                                </span>
                            ))}
                        </div>
                        <span className="text-sm text-arena-text-muted">5 agents • 6 scenarios • 1 winner</span>
                    </div>
                </motion.section>

                {/* The Reactive Cascade */}
                <motion.section {...fadeIn} className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-mono text-arena-text-primary">[THE REACTIVE CASCADE]</h2>
                        <p className="text-sm text-arena-text-muted mt-1">What happens in &lt;400ms when a new price arrives</p>
                    </div>
                    <div className="space-y-4">
                        {CASCADE_STEPS.map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card rounded-xl p-5 flex items-start gap-4 hover:border-arena-accent/40 transition-colors"
                            >
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-arena-accent/10 border border-arena-accent/30 flex items-center justify-center">
                                    <span className="text-2xl">{s.emoji}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-xs font-mono text-arena-accent bg-arena-accent/10 px-2 py-0.5 rounded">Step {s.step}</span>
                                        <h3 className="text-base font-bold text-arena-text-primary">{s.title}</h3>
                                        <span className="text-xs font-mono text-arena-text-muted ml-auto">{s.time}</span>
                                    </div>
                                    <p className="text-sm text-arena-text-secondary leading-relaxed">{s.detail}</p>
                                    <p className="text-xs font-mono text-arena-text-muted mt-1.5">📄 {s.contract}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Meet the Agents */}
                <motion.section {...fadeIn} className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-mono text-arena-text-primary">[MEET THE AGENTS]</h2>
                        <p className="text-sm text-arena-text-muted mt-1">Each agent uses a completely different trading strategy</p>
                    </div>
                    <div className="space-y-6">
                        {AGENTS.map((agent, i) => (
                            <motion.div
                                key={agent.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className="glass-card rounded-xl overflow-hidden"
                            >
                                {/* Agent Header */}
                                <div className="p-5 border-b border-arena-border" style={{ borderLeftWidth: 4, borderLeftColor: agent.color }}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{agent.emoji}</span>
                                        <div>
                                            <h3 className="text-lg font-bold text-arena-text-primary">{agent.name}</h3>
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: agent.color + '20', color: agent.color }}>
                                                {agent.type}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-arena-text-secondary mt-3 leading-relaxed">{agent.logic}</p>
                                </div>

                                {/* Agent Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-arena-border">
                                    {/* Parameters */}
                                    <div className="p-4">
                                        <h4 className="text-xs font-semibold text-arena-text-muted uppercase tracking-wider mb-2">PARAMETERS</h4>
                                        <div className="space-y-1.5">
                                            {agent.params.map(p => (
                                                <div key={p.name} className="flex justify-between text-xs">
                                                    <span className="text-arena-text-muted">{p.name}</span>
                                                    <span className="text-arena-text-secondary font-mono">{p.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Strengths */}
                                    <div className="p-4">
                                        <h4 className="text-xs font-semibold text-arena-success uppercase tracking-wider mb-2">STRENGTHS</h4>
                                        <ul className="space-y-1">
                                            {agent.strengths.map(s => (
                                                <li key={s} className="text-xs text-arena-text-secondary flex items-start gap-1.5">
                                                    <span className="text-arena-success mt-0.5">•</span> {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>


                                </div>

                                {/* Formula */}
                                <div className="px-5 py-3 bg-arena-bg border-t border-arena-border">
                                    <code className="text-xs font-mono text-arena-accent">{agent.formula}</code>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Scenarios */}
                <motion.section {...fadeIn} className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-mono text-arena-text-primary">[BATTLE SCENARIOS]</h2>
                        <p className="text-sm text-arena-text-muted mt-1">6 preset market conditions to test the agents</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {SCENARIOS.map((s, i) => (
                            <motion.div
                                key={s.name}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className="glass-card rounded-xl p-5 hover:border-arena-accent/40 transition-all hover:-translate-y-1"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{s.emoji}</span>
                                    <h3 className="text-base font-bold text-arena-text-primary">{s.name}</h3>
                                </div>
                                <p className="text-xs text-arena-text-secondary mb-3">{s.desc}</p>
                                <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-arena-text-muted">Best agent:</span>
                                    <span className="font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.color + '20', color: s.color }}>
                                        {s.winner}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Somnia & Smart Contracts */}
                <motion.section {...fadeIn} className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-mono text-arena-text-primary">[POWERED BY SOMNIA]</h2>
                        <p className="text-sm text-arena-text-muted mt-1">11 smart contracts deployed on Somnia Testnet</p>
                    </div>
                    <div className="glass-card rounded-xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-bold text-arena-text-primary mb-3">Why Somnia?</h3>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Native Reactivity', desc: 'Validators auto-trigger strategy handlers on price events' },
                                        { label: '400ms Block Time', desc: 'Full cascade completes in under 1 second' },
                                        { label: 'EVM Compatible', desc: 'Standard Solidity — but with superpowers' },
                                        { label: 'Affordable Gas', desc: 'Deploying 11 contracts cost only 1.49 STT' },
                                    ].map(f => (
                                        <div key={f.label} className="flex items-start gap-2 text-xs">
                                            <span className="text-arena-accent mt-0.5">✦</span>
                                            <div>
                                                <span className="font-semibold text-arena-text-primary">{f.label}</span>
                                                <span className="text-arena-text-muted ml-1">— {f.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-arena-text-primary mb-3">Architecture</h3>
                                <div className="bg-arena-bg rounded-lg p-4 font-mono text-xs text-arena-text-secondary space-y-1">
                                    <div className="text-arena-accent">ArenaCore (Orchestrator)</div>
                                    <div className="pl-4">├── PriceOracle <span className="text-arena-text-muted">← price feed</span></div>
                                    <div className="pl-4">├── PortfolioManager <span className="text-arena-text-muted">← P&L tracking</span></div>
                                    <div className="pl-8">├── MomentumStrategy</div>
                                    <div className="pl-8">├── MeanReversionStrategy</div>
                                    <div className="pl-8">├── ArbitrageStrategy</div>
                                    <div className="pl-8">├── RiskParityStrategy</div>
                                    <div className="pl-8">└── RLStrategy</div>
                                    <div className="pl-4">├── Leaderboard <span className="text-arena-text-muted">← rankings</span></div>
                                    <div className="pl-4 text-purple-400">└── ReactiveStrategyHandler <span className="text-arena-text-muted">← Somnia Reactivity</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* CTA */}
                <motion.section {...fadeIn} className="text-center py-8">
                    <Link
                        href="/arena"
                        className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-arena-accent to-purple-600 text-white hover:shadow-2xl hover:shadow-arena-accent/30 transition-all hover:-translate-y-1"
                    >
                        ENTER THE ARENA
                    </Link>
                    <p className="text-xs text-arena-text-muted mt-3">Click a scenario and watch the agents battle!</p>
                </motion.section>

            </main>

            {/* Footer */}
            <footer className="border-t border-arena-border py-6">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <p className="text-xs text-arena-text-muted">
                        Built for Somnia Hackathon • Multi-Agent DeFi Strategy Arena •{' '}
                        <span className="text-arena-accent">AlphaGo meets On-Chain Finance</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}
