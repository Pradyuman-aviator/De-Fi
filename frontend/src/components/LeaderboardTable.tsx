'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useArenaStore, type LeaderboardEntry } from '@/store/useArenaStore';
import { useWalletStore } from '@/store/useWalletStore';

const medals = ['🥇', '🥈', '🥉'];

const agentColors: Record<string, string> = {
    momentum: '#3b82f6',
    meanrev: '#a855f7',
    arb: '#eab308',
    riskparity: '#22c55e',
    rl: '#ef4444',
};

const agentEmojis: Record<string, string> = {
    momentum: '📈',
    meanrev: '⚖️',
    arb: '⚡',
    riskparity: '🛡️',
    rl: '🧠',
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
        <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-arena-border">
                <h2 className="text-lg font-bold text-arena-text-primary flex items-center gap-2">
                    🏆 Leaderboard
                    <span className="text-xs text-arena-text-muted font-normal">Live Rankings</span>
                </h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-xs text-arena-text-muted uppercase tracking-wider">
                            <th className="px-4 py-2 text-left">Rank</th>
                            <th className="px-4 py-2 text-left">Agent</th>
                            <th className="px-4 py-2 text-right">Total P&L</th>
                            <th className="px-4 py-2 text-right">Win Rate</th>
                            <th className="px-4 py-2 text-right">Trades</th>
                            <th className="px-4 py-2 text-right">Change</th>
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
                                            backgroundColor: rankChange !== 0 ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                                        }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{
                                            layout: { duration: 0.5, type: 'spring', stiffness: 300, damping: 30 },
                                            default: { duration: 0.3 },
                                        }}
                                        className="border-b border-arena-border last:border-0 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="text-lg">
                                                {entry.rank <= 3 ? medals[entry.rank - 1] : (
                                                    <span className="text-arena-text-muted font-mono text-sm">#{entry.rank}</span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                                                    style={{ backgroundColor: color + '20', border: `1.5px solid ${color}` }}
                                                >
                                                    {agentEmojis[entry.agentId] || '🤖'}
                                                </span>
                                                <span className="font-medium text-arena-text-primary">{entry.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span
                                                className={`font-bold tabular-nums ${isPositive ? 'text-arena-success' : 'text-arena-danger'
                                                    }`}
                                            >
                                                {isPositive ? '+' : ''}${entry.totalPnL.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-arena-text-secondary tabular-nums">{entry.winRate}%</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-arena-text-muted tabular-nums">{entry.totalTrades}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {rankChange > 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="text-arena-success text-xs font-medium"
                                                >
                                                    ▲{rankChange}
                                                </motion.span>
                                            )}
                                            {rankChange < 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="text-arena-danger text-xs font-medium"
                                                >
                                                    ▼{Math.abs(rankChange)}
                                                </motion.span>
                                            )}
                                            {rankChange === 0 && (
                                                <span className="text-arena-text-muted text-xs">—</span>
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
