'use client';

import ArenaHeader from '@/components/ArenaHeader';
import { useArenaStore } from '@/store/useArenaStore';
import { useWalletStore } from '@/store/useWalletStore';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useMemo } from 'react';

const agentColors: Record<string, string> = {
    momentum: '#3b82f6',
    meanrev: '#a855f7',
    arb: '#eab308',
    riskparity: '#22c55e',
    rl: '#ef4444',
};

export default function AgentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const agentId = params.id as string;

    // Global stores
    const mockAgents = useArenaStore(s => s.agents);
    const mockLeaderboard = useArenaStore(s => s.leaderboard);

    const { isOnChainMode, onChainAgents, onChainRankings } = useWalletStore();

    // 1. Resolve combined agent state
    const agent = useMemo(() => {
        if (isOnChainMode) {
            const oca = onChainAgents.find(a => a.agentId === agentId);
            const mockMatch = mockAgents.find(a => a.id === agentId) || mockAgents[0];

            if (!oca) return null;

            return {
                ...mockMatch,
                id: oca.agentId,
                name: oca.name,
                position: oca.position === 1 ? 'LONG' : (oca.position === 2 ? 'SHORT' : 'NEUTRAL') as any,
                entryPrice: Number(oca.entryPrice) / 1e18,
                positionSize: Number(oca.positionSize),
                totalPnL: Number(oca.totalPnL) / 1e18,
                unrealizedPnL: Number(oca.unrealizedPnL) / 1e18,
                totalTrades: Number(oca.totalTrades),
                winRate: Number(oca.winRate),
                isActive: oca.isActive,
                isThinking: false,
            };
        } else {
            return mockAgents.find(a => a.id === agentId);
        }
    }, [isOnChainMode, onChainAgents, mockAgents, agentId]);


    // 2. Resolve rank positioning
    const rank = useMemo(() => {
        if (isOnChainMode) {
            const onchainR = onChainRankings.find(r => r.name === agent?.name);
            return onchainR ? Number(onchainR.rank) : 0;
        } else {
            return mockLeaderboard.find(e => e.agentId === agentId)?.rank ?? 0;
        }
    }, [isOnChainMode, onChainRankings, mockLeaderboard, agent?.name, agentId]);


    if (!agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-arena-text-muted">Agent not found or still syncing on-chain data...</p>
            </div>
        );
    }

    // Determine derived UI constants
    const color = agentColors[agent.id] || '#6366f1';
    const combinedPnL = agent.totalPnL + agent.unrealizedPnL;
   
    // In on-chain mode, detailed trade history isn't trivially exposed by the contracts without deep graph lookups.
    // For now we'll map the mock ones if available, or empty if fundamentally an on-chain custom bot.
    const trades = agent.trades || [];
    const pnlData = agent.pnlHistory?.map((pnl, i) => ({ update: i, pnl })) || [];

    return (
        <div className="min-h-screen">
            <ArenaHeader />

            <main className="max-w-5xl mx-auto px-4 py-8">
                {/* Back button */}
                <button
                    onClick={() => router.push('/arena')}
                    className="text-sm text-arena-text-muted hover:text-arena-text-secondary transition-colors mb-6 flex items-center gap-1"
                >
                    ← Back to Arena
                </button>

                {/* Agent Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-6 mb-6 relative overflow-hidden"
                    style={{ borderColor: color + '40' }}
                >
                    <div className="absolute top-0 right-0 p-4">
                        {isOnChainMode && (
                            <span className="text-[10px] px-2 py-1 bg-arena-accent/10 text-arena-accent font-mono uppercase tracking-widest rounded-sm border border-arena-accent/30">
                                [ON-CHAIN SYNCED]
                            </span>
                        )}
                    </div>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-16 h-16 rounded-sm flex items-center justify-center text-3xl font-bold uppercase tracking-wider"
                                style={{ backgroundColor: color + '20', border: `1px solid ${color}`, color: color }}
                            >
                                {agent.name.substring(0, 2)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-arena-text-primary">{agent.name}</h1>
                                <p className="text-sm text-arena-text-muted font-mono">{agent.type ? agent.type.replace('_', ' ') : 'Custom Strategy'}</p>
                                <p className="text-sm text-arena-text-secondary mt-1 max-w-lg">{agent.description || 'A decentralized strategy contract running autonomously on Somnia.'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-bold font-mono text-arena-text-secondary">#{rank}</span>
                            <p className="text-xs text-arena-text-muted mt-1">Current Rank</p>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        {
                            label: 'Total P&L',
                            value: `${combinedPnL >= 0 ? '+' : ''}$${combinedPnL.toFixed(2)}`,
                            color: combinedPnL >= 0 ? 'text-arena-success' : 'text-arena-danger',
                            bg: combinedPnL >= 0 ? 'bg-arena-success/10' : 'bg-arena-danger/10',
                        },
                        {
                            label: 'Win Rate',
                            value: `${agent.winRate}%`,
                            color: agent.winRate >= 50 ? 'text-arena-success' : 'text-arena-danger',
                            bg: 'bg-arena-accent/10',
                        },
                        {
                            label: 'Total Trades',
                            value: `${agent.totalTrades}`,
                            color: 'text-arena-text-primary',
                            bg: 'bg-arena-border',
                        },
                        {
                            label: 'Position',
                            value: agent.position,
                            color: agent.position === 'LONG' ? 'text-arena-success' : agent.position === 'SHORT' ? 'text-arena-danger' : 'text-arena-text-muted',
                            bg: 'bg-arena-border',
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`glass-card rounded-xl p-4 ${stat.bg}`}
                        >
                            <p className="text-xs text-arena-text-muted mb-1">{stat.label}</p>
                            <p className={`text-xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* P&L Chart */}
                {pnlData.length > 0 && (
                    <div className="glass-card rounded-xl p-4 mb-6">
                        <h2 className="text-lg font-bold font-mono text-arena-text-primary mb-4 tracking-wide uppercase">[CHART] P&L Performance</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={pnlData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 30, 46, 0.8)" vertical={false} />
                                <XAxis dataKey="update" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#12121a',
                                        border: '1px solid #1e1e2e',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                    }}
                                />
                                <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                                <Line type="monotone" dataKey="pnl" stroke={color} strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Trade History */}
                <div className="glass-card rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-arena-border">
                        <h2 className="text-lg font-bold font-mono text-arena-text-primary tracking-wide uppercase">[LOGS] Trade History {isOnChainMode && '(Unavailable On-Chain)'}</h2>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {trades.length === 0 ? (
                            <div className="p-8 text-center text-arena-text-muted font-mono text-sm">No historical trade logs available for this agent on this network.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-arena-text-muted uppercase tracking-wider border-b border-arena-border">
                                        <th className="px-4 py-2 text-left">#</th>
                                        <th className="px-4 py-2 text-left">Action</th>
                                        <th className="px-4 py-2 text-right">Price</th>
                                        <th className="px-4 py-2 text-right">P&L</th>
                                        <th className="px-4 py-2 text-left">Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...trades].reverse().map((trade, i) => (
                                        <tr key={i} className="border-b border-arena-border last:border-0 hover:bg-white/[0.02]">
                                            <td className="px-4 py-2 text-arena-text-muted font-mono text-xs">{trade.updateId}</td>
                                            <td className="px-4 py-2">
                                                <span className={
                                                    trade.action === 'LONG' ? 'badge-long' :
                                                        trade.action === 'SHORT' ? 'badge-short' :
                                                            'badge-neutral'
                                                }>
                                                    {trade.action === 'LONG' ? '↗ LONG' : trade.action === 'SHORT' ? '↘ SHORT' : '— CLOSE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right font-mono text-arena-text-secondary">
                                                ${trade.price.toFixed(0)}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {trade.pnl !== 0 ? (
                                                    <span className={`font-mono font-medium ${trade.pnl >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>
                                                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-arena-text-muted">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-xs text-arena-text-muted max-w-xs truncate">{trade.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Strategy Explainer Grid */}
                <div className="glass-card rounded-xl p-6 mt-6">
                    <h2 className="text-lg font-bold font-mono text-arena-text-primary mb-3 tracking-wide uppercase">[SYSTEM] Historical Performance</h2>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-arena-bg border border-arena-border">
                            <p className="text-lg font-bold text-arena-text-primary">{agent.winningTrades || 0}</p>
                            <p className="text-xs text-arena-success">Winning Trades</p>
                        </div>
                        <div className="p-3 rounded-lg bg-arena-bg border border-arena-border">
                            <p className="text-lg font-bold text-arena-text-primary">{agent.losingTrades || 0}</p>
                            <p className="text-xs text-arena-danger">Losing Trades</p>
                        </div>
                        <div className="p-3 rounded-lg bg-arena-bg border border-arena-border">
                            <p className="text-lg font-bold text-arena-text-primary">
                                {agent.entryPrice > 0 ? `$${agent.entryPrice.toFixed(0)}` : '—'}
                            </p>
                            <p className="text-xs text-arena-text-muted">Entry Price</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
