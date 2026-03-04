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
            className={`glass-card rounded-xl p-4 cursor-pointer transition-all duration-300 hover:border-opacity-100 ${agent.isThinking ? `animate-thinking ${agentGlowClasses[agent.type]}` : ''
                }`}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            animate={agent.isThinking ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.3 }}
            style={{
                borderColor: agent.isThinking ? agent.color : undefined,
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: agent.color + '20', border: `2px solid ${agent.color}` }}
                    >
                        {agent.emoji}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-arena-text-primary">{agent.name}</h3>
                        <p className="text-xs text-arena-text-muted font-mono">{agent.type.replace('_', ' ')}</p>
                    </div>
                </div>
                <span className={positionColors[agent.position]}>
                    {agent.position === 'LONG' ? '↗ LONG' : agent.position === 'SHORT' ? '↘ SHORT' : '— NEUTRAL'}
                </span>
            </div>

            {/* P&L */}
            <div className="mb-3">
                <div className="flex items-baseline gap-2">
                    <span
                        className={`text-2xl font-bold tabular-nums ${isPositive ? 'text-arena-success' : 'text-arena-danger'
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
                <svg width={svgWidth} height={svgHeight} className="mt-1 opacity-60">
                    <defs>
                        <linearGradient id={`grad-${agent.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={agent.color} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={agent.color} stopOpacity="0.8" />
                        </linearGradient>
                    </defs>
                    <path d={sparklinePath} fill="none" stroke={agent.color} strokeWidth="1.5" />
                </svg>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs text-arena-text-secondary border-t border-arena-border pt-2">
                <span>Win: {agent.winRate}%</span>
                <span>Trades: {agent.totalTrades}</span>
                {agent.entryPrice > 0 && <span>Entry: ${agent.entryPrice.toFixed(0)}</span>}
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
