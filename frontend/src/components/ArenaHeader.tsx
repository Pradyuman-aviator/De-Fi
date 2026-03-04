'use client';

import { motion } from 'framer-motion';
import { useArenaStore } from '@/store/useArenaStore';
import Link from 'next/link';

export default function ArenaHeader() {
    const currentPrice = useArenaStore(s => s.currentPrice);
    const updateCount = useArenaStore(s => s.updateCount);
    const priceHistory = useArenaStore(s => s.priceHistory);
    const isRunning = useArenaStore(s => s.isRunning);
    const agents = useArenaStore(s => s.agents);

    // Calculate price change
    const prevPrice = priceHistory.length >= 2 ? priceHistory[priceHistory.length - 2].price : currentPrice;
    const priceChange = currentPrice - prevPrice;
    const priceChangePct = prevPrice > 0 ? ((priceChange / prevPrice) * 100) : 0;
    const isUp = priceChange >= 0;

    // Count active positions
    const longCount = agents.filter(a => a.position === 'LONG').length;
    const shortCount = agents.filter(a => a.position === 'SHORT').length;
    const neutralCount = agents.filter(a => a.position === 'NEUTRAL').length;

    return (
        <header className="glass-card border-b border-arena-border sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Left: Branding */}
                    <Link href="/arena" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-arena-accent to-purple-600 flex items-center justify-center text-lg font-bold shadow-lg shadow-arena-accent/20">
                            ⚔️
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-arena-text-primary tracking-tight group-hover:text-arena-accent transition-colors">
                                DeFi Strategy Arena
                            </h1>
                            <p className="text-xs text-arena-text-muted -mt-0.5">
                                Powered by Somnia Reactive Contracts
                            </p>
                        </div>
                    </Link>

                    {/* Center: Live Price */}
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-xs text-arena-text-muted mb-0.5">Live Price</p>
                            <div className="flex items-center gap-2">
                                <motion.span
                                    key={currentPrice}
                                    initial={{ y: isUp ? 10 : -10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-2xl font-bold font-mono text-arena-text-primary"
                                >
                                    ${currentPrice.toFixed(0)}
                                </motion.span>
                                <motion.span
                                    key={`change-${updateCount}`}
                                    initial={{ scale: 1.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${isUp ? 'bg-arena-success/20 text-arena-success' : 'bg-arena-danger/20 text-arena-danger'
                                        }`}
                                >
                                    {isUp ? '+' : ''}{priceChangePct.toFixed(2)}%
                                </motion.span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-arena-border" />

                        {/* Agent Activity */}
                        <div className="text-center hidden md:block">
                            <p className="text-xs text-arena-text-muted mb-1">Agents</p>
                            <div className="flex items-center gap-1.5 text-xs font-mono">
                                <span className="bg-arena-success/20 text-arena-success px-1.5 py-0.5 rounded">
                                    {longCount}L
                                </span>
                                <span className="bg-arena-danger/20 text-arena-danger px-1.5 py-0.5 rounded">
                                    {shortCount}S
                                </span>
                                <span className="bg-arena-border text-arena-text-muted px-1.5 py-0.5 rounded">
                                    {neutralCount}N
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-arena-border hidden md:block" />

                        {/* Update Count + Status */}
                        <div className="text-center hidden md:block">
                            <p className="text-xs text-arena-text-muted mb-1">Updates</p>
                            <span className="text-sm font-mono text-arena-text-secondary">{updateCount}</span>
                        </div>
                    </div>

                    {/* Right: Status + Nav */}
                    <div className="flex items-center gap-3">
                        {isRunning && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-arena-accent/10 border border-arena-accent/30">
                                <div className="w-2 h-2 rounded-full bg-arena-accent animate-pulse" />
                                <span className="text-xs font-medium text-arena-accent">LIVE</span>
                            </div>
                        )}
                        <Link
                            href="/simulate"
                            className="px-4 py-2 text-sm rounded-lg bg-arena-accent text-white hover:bg-arena-accent-bright transition-colors font-medium shadow-lg shadow-arena-accent/20"
                        >
                            🎮 Simulate
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
