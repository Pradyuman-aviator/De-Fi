'use client';

import AgentCard from '@/components/AgentCard';
import PriceChart from '@/components/PriceChart';
import LeaderboardTable from '@/components/LeaderboardTable';
import SimulationPanel from '@/components/SimulationPanel';
import ArenaHeader from '@/components/ArenaHeader';
import { useArenaStore } from '@/store/useArenaStore';
import { useWalletStore } from '@/store/useWalletStore';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddAgentModal from '@/components/AddAgentModal';

export default function ArenaPage() {
    const router = useRouter();
    const mockAgents = useArenaStore(s => s.agents);
    const { isOnChainMode, onChainAgents } = useWalletStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Transform on-chain data to match AgentState format for the UI
    const agents = isOnChainMode ? onChainAgents.map(oca => {
        const mockMatch = mockAgents.find(a => a.id === oca.agentId) || mockAgents[0];
        return {
            ...mockMatch,
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
    }) : mockAgents;

    return (
        <div className="min-h-screen relative">
            {/* Animated mesh gradient background */}
            <div className="arena-bg-mesh" />

            <ArenaHeader />

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Agent Cards Grid */}
                <section>
                    <h2 className="text-sm font-semibold text-arena-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-arena-accent animate-pulse" />
                        Active Agents
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {agents.map((agent, i) => (
                            <motion.div
                                key={agent.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <AgentCard
                                    agent={agent}
                                    onClick={() => router.push(`/arena/agent/${agent.id}`)}
                                />
                            </motion.div>
                        ))}

                        {/* Add Custom Agent Placeholder */}
                        <motion.button
                            onClick={() => setIsAddModalOpen(true)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: agents.length * 0.1 }}
                            className="glass-card flex flex-col items-center justify-center p-6 h-[178px] rounded-xl border border-dashed border-arena-border hover:border-arena-accent/50 group transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-arena-accent/10 flex items-center justify-center mb-3 group-hover:bg-arena-accent/20 transition-colors">
                                <span className="text-2xl text-arena-accent font-bold">+</span>
                            </div>
                            <h3 className="font-semibold text-arena-text-primary text-sm">Deploy Agent</h3>
                            <p className="text-[10px] text-arena-text-muted mt-1 text-center">Open platform to external AI models</p>
                        </motion.button>
                    </div>
                </section>

                {/* Charts + Simulation */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <PriceChart showAgents={true} height={350} />
                    </div>
                    <div>
                        <SimulationPanel />
                    </div>
                </div>

                {/* Leaderboard */}
                <section>
                    <LeaderboardTable />
                </section>

                {/* Architecture Info */}
                <section className="glass-card rounded-xl p-6">
                    <h2 className="text-lg font-bold text-arena-text-primary mb-4 flex items-center gap-2">
                        ⚡ How the Reactive Cascade Works
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        {[
                            { emoji: '🔄', label: 'Price Update', desc: 'Oracle receives new price', time: 'T+0ms' },
                            { emoji: '📡', label: 'Event Emitted', desc: 'PriceUpdated event fires', time: 'T+50ms' },
                            { emoji: '🤖', label: 'Agents React', desc: '5 strategies execute simultaneously', time: 'T+150ms' },
                            { emoji: '📊', label: 'P&L Updated', desc: 'PortfolioManager recalculates', time: 'T+200ms' },
                            { emoji: '🏆', label: 'Rankings', desc: 'Leaderboard re-sorts', time: 'T+250ms' },
                            { emoji: '🖥️', label: 'UI Updates', desc: 'Frontend reflects changes', time: 'T+350ms' },
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="text-center p-3 rounded-lg bg-arena-bg border border-arena-border"
                            >
                                <span className="text-2xl">{step.emoji}</span>
                                <h3 className="text-xs font-semibold text-arena-text-primary mt-1">{step.label}</h3>
                                <p className="text-xs text-arena-text-muted mt-0.5">{step.desc}</p>
                                <span className="text-xs font-mono text-arena-accent mt-1 block">{step.time}</span>
                                {i < 5 && (
                                    <span className="hidden md:block text-arena-text-muted mt-1">→</span>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-arena-border mt-12 py-6">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-xs text-arena-text-muted">
                        Built for Somnia Hackathon • Multi-Agent DeFi Strategy Arena •{' '}
                        <span className="text-arena-accent">AlphaGo meets On-Chain Finance</span>
                    </p>
                </div>
            </footer>

            {/* Add Agent Modal */}
            <AddAgentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
}
