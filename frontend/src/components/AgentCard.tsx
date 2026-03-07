'use client';

import { motion } from 'framer-motion';
import { useArenaStore, type AgentState } from '@/store/useArenaStore';

const positionColors: Record<string, string> = {
    LONG: 'badge-long',
    SHORT: 'badge-short',
    NEUTRAL: 'badge-neutral',
};

const agentGlowClasses: Record<string, string> = {
    MOMENTUM: 'glow-blue',
    MEAN_REVERSION: 'glow-purple',
    ARBITRAGE: 'glow-yellow',
    RISK_PARITY: 'glow-green',
    RL: 'glow-red',
};

interface AgentCardProps {
    agent: AgentState;
    onClick?: () => void;
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
    const combinedPnL = agent.totalPnL + agent.unrealizedPnL;
    const isPositive = combinedPnL >= 0;
    const lastTrade = agent.trades[agent.trades.length - 1];

    // Mini sparkline from pnlHistory
    const sparklinePoints = agent.pnlHistory.slice(-15);
    const maxVal = Math.max(...sparklinePoints.map(Math.abs), 1);
    const svgWidth = 100;
    const svgHeight = 30;
    const sparklinePath = sparklinePoints
        .map((val, i) => {
            const x = (i / (sparklinePoints.length - 1 || 1)) * svgWidth;
            const y = svgHeight / 2 - (val / maxVal) * (svgHeight / 2 - 2);
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');

    return (
        <motion.div
            layout
            onClick={onClick}
            className={`relative group rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:border-opacity-100 overflow-hidden card-lift
                ${agent.isThinking ? `animate-thinking ${agentGlowClasses[agent.type]}` : ''}
                bg-gradient-to-br from-arena-card/90 to-arena-bg/90 backdrop-blur-xl`}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            animate={agent.isThinking ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.3 }}
            style={{
                borderColor: agent.isThinking ? agent.color : undefined,
            }}
        >
            {/* Gradient border effect */}
            <div
                className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: `linear-gradient(135deg, ${agent.color}30, transparent 60%)`,
                }}
            />

            {/* Top accent line */}
            <div
                className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                style={{
                    background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-3 relative">
                <div className="flex items-center gap-2">
                    <div
                        className="w-10 h-10 rounded-sm flex items-center justify-center text-sm font-bold uppercase tracking-wider"
                        style={{
                            backgroundColor: agent.color + '15',
                            color: agent.color,
                            border: `1px solid ${agent.color}40`,
                        }}
                    >
                        {agent.name.substring(0, 2)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-arena-text-primary">{agent.name}</h3>
                        <p className="text-xs text-arena-text-muted font-mono uppercase tracking-wider">{agent.type.replace('_', ' ')}</p>
                    </div>
                </div>
                <span className={positionColors[agent.position]}>
                    {agent.position === 'LONG' ? '↗ LONG' : agent.position === 'SHORT' ? '↘ SHORT' : '— NEUTRAL'}
                </span>
            </div>

            {/* P&L */}
            <div className="mb-3 relative">
                <div className="flex items-baseline gap-2">
                    <span
                        className={`text-2xl font-bold tabular-nums ${isPositive ? 'text-arena-success pnl-positive' : 'text-arena-danger pnl-negative'
                            }`}
                    >
                        {isPositive ? '+' : ''}${combinedPnL.toFixed(2)}
                    </span>
                    {agent.unrealizedPnL !== 0 && (
                        <span className="text-xs text-arena-text-muted">
                            (unrealized: {agent.unrealizedPnL >= 0 ? '+' : ''}${agent.unrealizedPnL.toFixed(2)})
                        </span>
                    )}
                </div>

                {/* Sparkline */}
                <div className="mt-2 relative">
                    <svg width={svgWidth} height={svgHeight} className="opacity-70">
                        <defs>
                            <linearGradient id={`grad-${agent.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={agent.color} stopOpacity="0.1" />
                                <stop offset="100%" stopColor={agent.color} stopOpacity="0.6" />
                            </linearGradient>
                        </defs>
                        <path
                            d={sparklinePath}
                            fill="none"
                            stroke={agent.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs text-arena-text-secondary border-t border-arena-border/50 pt-2">
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-arena-success/60" />
                    Win: {agent.winRate}%
                </span>
                <span className="font-mono text-arena-text-muted">{agent.totalTrades} trades</span>
                {agent.entryPrice > 0 && <span className="font-mono">${agent.entryPrice.toFixed(0)}</span>}
            </div>

            {/* Thinking indicator */}
            {agent.isThinking && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-xs font-mono text-arena-text-muted flex items-center gap-1"
                >
                    <span style={{ color: agent.color }}>⚡</span>
                    {lastTrade ? lastTrade.reason : 'Analyzing...'}
                </motion.div>
            )}
        </motion.div>
    );
}
