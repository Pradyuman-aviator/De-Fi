'use client';

import ArenaHeader from '@/components/ArenaHeader';
import SimulationPanel from '@/components/SimulationPanel';
import PriceChart from '@/components/PriceChart';
import AgentCard from '@/components/AgentCard';
import { useArenaStore } from '@/store/useArenaStore';
import { useWalletStore } from '@/store/useWalletStore';
import { motion } from 'framer-motion';

export default function SimulatePage() {
    const mockAgents = useArenaStore(s => s.agents);
    const activeScenario = useArenaStore(s => s.activeScenario);
    const { isOnChainMode, onChainAgents } = useWalletStore();

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
        <div className="min-h-screen">
            <ArenaHeader />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl font-bold text-arena-text-primary mb-2">
                        🎮 Simulation Arena
                    </h1>
                    <p className="text-arena-text-secondary max-w-xl mx-auto">
                        Trigger market scenarios and watch 5 AI agents react in real-time.
                        Each agent uses a different strategy — see who comes out on top.
                    </p>
                </motion.div>

                {/* Main Layout: Simulation + Chart side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <SimulationPanel />
                    <PriceChart showAgents={false} height={380} />
                </div>

                {/* Agent Reaction Grid */}
                <section className="mb-8">
                    <h2 className="text-sm font-semibold text-arena-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-arena-accent animate-pulse" />
                        Agent Reactions
                        {activeScenario && (
                            <span className="text-xs text-arena-accent font-normal normal-case ml-2">
                                Scenario running...
                            </span>
                        )}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {agents.map((agent, i) => (
                            <motion.div
                                key={agent.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                            >
                                <AgentCard agent={agent} />
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Full Performance Chart */}
                <PriceChart showAgents={true} height={300} />
            </main>
        </div>
    );
}
