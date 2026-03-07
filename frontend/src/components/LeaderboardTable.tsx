'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useArenaStore, type LeaderboardEntry } from '@/store/useArenaStore';
import { useWalletStore } from '@/store/useWalletStore';

const agentColors: Record<string, string> = {
    momentum: '#3b82f6',
    meanrev: '#a855f7',
    arb: '#eab308',
    riskparity: '#22c55e',
    rl: '#ef4444',
};

export default function LeaderboardTable() {
    const mockLeaderboard = useArenaStore(s => s.leaderboard);
    const { isOnChainMode, onChainRankings } = useWalletStore();

    const leaderboard = isOnChainMode ? onChainRankings.map(ocr => {
        const mockMatch = mockLeaderboard.find(a => a.name === ocr.name) || mockLeaderboard[0];
        return {
            agentId: mockMatch.agentId,
            name: ocr.name,
            rank: Number(ocr.rank),
            totalPnL: Number(ocr.totalPnL) / 1e18,
            winRate: Number(ocr.winRate),
            totalTrades: Number(ocr.totalTrades),
            previousRank: Number(ocr.rank), // On-chain doesn't track previous rank natively
        };
    }).sort((a, b) => a.rank - b.rank) : mockLeaderboard;

    return (
        <div className="glass-card rounded-2xl overflow-hidden relative">
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-arena-accent/50 to-transparent" />

            <div className="px-5 py-4 border-b border-arena-border/50">
                <h2 className="text-lg font-bold text-arena-text-primary flex items-center gap-2 uppercase tracking-wide">
                    LEADERBOARD
                    <span className="text-xs px-2 py-0.5 rounded-sm bg-arena-accent/10 border border-arena-accent/30 text-arena-accent font-medium">LIVE</span>
                </h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-xs text-arena-text-muted uppercase tracking-wider">
                            <th className="px-5 py-3 text-left font-medium">Rank</th>
                            <th className="px-5 py-3 text-left font-medium">Agent</th>
                            <th className="px-5 py-3 text-right font-medium">Total P&L</th>
                            <th className="px-5 py-3 text-right font-medium">Win Rate</th>
                            <th className="px-5 py-3 text-right font-medium">Trades</th>
                            <th className="px-5 py-3 text-right font-medium">Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {leaderboard.map((entry) => {
                                const rankChange = entry.previousRank - entry.rank;
                                const isPositive = entry.totalPnL >= 0;
                                const color = agentColors[entry.agentId] || '#6366f1';

                                return (
                                    <motion.tr
                                        key={entry.agentId}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                            backgroundColor: rankChange !== 0 ? `${color}08` : 'transparent',
                                        }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{
                                            layout: { duration: 0.5, type: 'spring', stiffness: 300, damping: 30 },
                                            default: { duration: 0.3 },
                                        }}
                                        className="border-b border-arena-border/30 last:border-0 hover:bg-white/[0.03] transition-colors group"
                                    >
                                        <td className="px-5 py-4">
                                            <span className="text-base font-mono text-arena-text-muted">
                                                #{entry.rank}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold uppercase"
                                                    style={{
                                                        backgroundColor: color + '15',
                                                        color: color,
                                                        border: `1px solid ${color}40`,
                                                    }}
                                                >
                                                    {entry.name.substring(0, 2)}
                                                </span>
                                                <span className="font-semibold text-arena-text-primary">{entry.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span
                                                className={`font-semibold text-base tabular-nums ${isPositive ? 'text-arena-success' : 'text-arena-danger'
                                                    }`}
                                            >
                                                {isPositive ? '+' : ''}${entry.totalPnL.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-1.5 bg-arena-bg rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${entry.winRate}%`,
                                                            backgroundColor: color
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-arena-text-secondary tabular-nums font-mono text-sm">{entry.winRate}%</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className="text-arena-text-muted tabular-nums font-mono">{entry.totalTrades}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            {rankChange > 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="inline-flex items-center gap-0.5 text-arena-success text-sm font-semibold bg-arena-success/10 px-2 py-1 rounded-lg"
                                                >
                                                    <span>▲</span>{rankChange}
                                                </motion.span>
                                            )}
                                            {rankChange < 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="inline-flex items-center gap-0.5 text-arena-danger text-sm font-semibold bg-arena-danger/10 px-2 py-1 rounded-lg"
                                                >
                                                    <span>▼</span>{Math.abs(rankChange)}
                                                </motion.span>
                                            )}
                                            {rankChange === 0 && (
                                                <span className="text-arena-text-muted/50 text-sm">—</span>
                                            )}
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
