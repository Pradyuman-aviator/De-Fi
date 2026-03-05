'use client';

import { motion } from 'framer-motion';
import { useArenaStore } from '@/store/useArenaStore';
import { useWalletStore, getExplorerAddressLink } from '@/store/useWalletStore';
import { CONTRACTS } from '@/lib/contracts';
import Link from 'next/link';

export default function ArenaHeader() {
    const currentPrice = useArenaStore(s => s.currentPrice);
    const updateCount = useArenaStore(s => s.updateCount);
    const priceHistory = useArenaStore(s => s.priceHistory);
    const isRunning = useArenaStore(s => s.isRunning);
    const agents = useArenaStore(s => s.agents);

    const {
        isConnected, walletAddress, isOwner, isOnChainMode,
        connectWallet, disconnectWallet, toggleOnChainMode,
        isTxPending, error, onChainPrice, onChainUpdateCount, arenaState, onChainAgents
    } = useWalletStore();

    // Calculate price change
    const displayPrice = isOnChainMode ? onChainPrice : currentPrice;
    const prevPrice = priceHistory.length >= 2 ? priceHistory[priceHistory.length - 2].price : currentPrice;
    const priceChange = currentPrice - prevPrice;
    const priceChangePct = prevPrice > 0 ? ((priceChange / prevPrice) * 100) : 0;
    const isUp = priceChange >= 0;

    // Count active positions
    const activeAgents: any[] = isOnChainMode ? onChainAgents : agents;
    // On-Chain: 0=NEUTRAL, 1=LONG, 2=SHORT. Mock: 'NEUTRAL', 'LONG', 'SHORT'
    const longCount = activeAgents.filter(a => a.position === (isOnChainMode ? 1 : 'LONG')).length;
    const shortCount = activeAgents.filter(a => a.position === (isOnChainMode ? 2 : 'SHORT')).length;
    const neutralCount = activeAgents.filter(a => a.position === (isOnChainMode ? 0 : 'NEUTRAL')).length;

    const ARENA_STATES = ['IDLE', 'ACTIVE', 'PAUSED', 'ENDED'];

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
                                {isOnChainMode ? (
                                    <span className="text-green-400">🟢 On-Chain Mode (Somnia)</span>
                                ) : (
                                    'Powered by Somnia Reactive Contracts'
                                )}
                            </p>
                        </div>
                    </Link>

                    {/* Center: Live Price */}
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-xs text-arena-text-muted mb-0.5">
                                {isOnChainMode ? '⛓️ On-Chain Price' : 'Live Price'}
                            </p>
                            <div className="flex items-center gap-2">
                                <motion.span
                                    key={displayPrice}
                                    initial={{ y: isUp ? 10 : -10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-2xl font-bold font-mono text-arena-text-primary"
                                >
                                    ${displayPrice.toFixed(0)}
                                </motion.span>
                                {!isOnChainMode && (
                                    <motion.span
                                        key={`change-${updateCount}`}
                                        initial={{ scale: 1.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${isUp ? 'bg-arena-success/20 text-arena-success' : 'bg-arena-danger/20 text-arena-danger'}`}
                                    >
                                        {isUp ? '+' : ''}{priceChangePct.toFixed(2)}%
                                    </motion.span>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-arena-border" />

                        {/* Agent Activity */}
                        <div className="text-center hidden md:block">
                            <p className="text-xs text-arena-text-muted mb-1">Agents</p>
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <span className="bg-arena-success/20 text-arena-success px-1.5 py-0.5 rounded">{longCount}L</span>
                                    <span className="bg-arena-danger/20 text-arena-danger px-1.5 py-0.5 rounded">{shortCount}S</span>
                                    <span className="bg-arena-border text-arena-text-muted px-1.5 py-0.5 rounded">{neutralCount}N</span>
                                </div>
                                {isOnChainMode && (
                                    <span className={`text-[10px] font-mono px-1.5 py-0 rounded ${arenaState === 1 ? 'text-arena-success' : 'text-arena-text-muted'}`}>
                                        Status: {ARENA_STATES[arenaState]}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-arena-border hidden md:block" />

                        {/* Update Count + Status */}
                        <div className="text-center hidden md:block">
                            <p className="text-xs text-arena-text-muted mb-1">Updates</p>
                            <span className="text-sm font-mono text-arena-text-secondary">
                                {isOnChainMode ? onChainUpdateCount : updateCount}
                            </span>
                        </div>
                    </div>

                    {/* Right: Wallet + Nav */}
                    <div className="flex items-center gap-2">
                        {isRunning && !isOnChainMode && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-arena-accent/10 border border-arena-accent/30">
                                <div className="w-2 h-2 rounded-full bg-arena-accent animate-pulse" />
                                <span className="text-xs font-medium text-arena-accent">LIVE</span>
                            </div>
                        )}

                        {isTxPending && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-xs font-medium text-yellow-500">TX...</span>
                            </div>
                        )}

                        {/* Wallet Connect */}
                        {isConnected ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleOnChainMode}
                                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${isOnChainMode
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-arena-border text-arena-text-muted hover:text-arena-text-primary'
                                        }`}
                                >
                                    {isOnChainMode ? '⛓️ On-Chain' : '💻 Mock'}
                                </button>
                                <button
                                    onClick={disconnectWallet}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-arena-border text-arena-text-muted hover:text-arena-text-primary font-mono transition-colors"
                                    title={walletAddress || ''}
                                >
                                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                                    {isOwner && <span className="text-yellow-400 ml-1">👑</span>}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={connectWallet}
                                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-arena-accent to-purple-600 text-white hover:shadow-lg hover:shadow-arena-accent/30 transition-all font-medium"
                            >
                                🔗 Connect
                            </button>
                        )}

                        <Link
                            href="/how-it-works"
                            className="px-3 py-1.5 text-xs rounded-lg border border-arena-border text-arena-text-secondary hover:text-arena-text-primary hover:border-arena-accent/50 transition-colors font-medium hidden md:inline-block"
                        >
                            📖 Docs
                        </Link>
                        <Link
                            href="/simulate"
                            className="px-3 py-1.5 text-xs rounded-lg bg-arena-accent text-white hover:bg-arena-accent-bright transition-colors font-medium shadow-lg shadow-arena-accent/20"
                        >
                            🎮 Simulate
                        </Link>
                    </div>
                </div>

                {/* Error bar */}
                {error && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
                        <span>⚠️ {error}</span>
                        <button onClick={() => useWalletStore.getState().clearError()} className="text-red-400 hover:text-red-300 ml-2">✕</button>
                    </div>
                )}
            </div>
        </header>
    );
}

