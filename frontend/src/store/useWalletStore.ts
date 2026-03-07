import { create } from 'zustand';
import { blockchain, type OnChainAgentStats, type PriceEvent } from '@/lib/blockchain';
import { SOMNIA_EXPLORER, CONTRACTS } from '@/lib/contracts';

export interface OnChainRanking {
    strategy: string;
    name: string;
    totalPnL: bigint;
    winRate: bigint;
    totalTrades: bigint;
    rank: bigint;
    isUserAgent?: boolean;
    owner?: string;
}

interface WalletStore {
    // Wallet state
    isConnected: boolean;
    walletAddress: string | null;
    isOwner: boolean;
    isOnChainMode: boolean;
    error: string | null;
    isTxPending: boolean;
    pendingScenarioId: string | null;
    lastTxHash: string | null;

    // On-chain data
    onChainPrice: number;
    onChainPriceHistory: number[];       // simple price[] for backward-compat
    onChainEventHistory: PriceEvent[];   // rich event data from queryFilter
    onChainAgents: OnChainAgentStats[];
    onChainRankings: OnChainRanking[];
    onChainUpdateCount: number;
    arenaState: number; // 0=IDLE, 1=ACTIVE, 2=PAUSED, 3=ENDED

    // Actions
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    toggleOnChainMode: () => void;
    fetchOnChainState: () => Promise<void>;
    triggerOnChainPrice: (price: number) => Promise<void>;
    triggerOnChainScenario: (prices: number[], scenarioId?: string) => Promise<void>;
    resetOnChainArena: () => Promise<void>;
    startOnChainRound: () => Promise<void>;
    clearError: () => void;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
    isConnected: false,
    walletAddress: null,
    isOwner: false,
    isOnChainMode: false,
    error: null,
    isTxPending: false,
    pendingScenarioId: null,
    lastTxHash: null,
    onChainPrice: 0,
    onChainPriceHistory: [],
    onChainEventHistory: [],
    onChainAgents: [],
    onChainRankings: [],
    onChainUpdateCount: 0,
    arenaState: 0,

    connectWallet: async () => {
        try {
            set({ error: null });
            await blockchain.connectWallet();
            set({
                isConnected: true,
                walletAddress: blockchain.walletAddress,
                isOwner: blockchain.isOwner,
            });
            // Auto-fetch on-chain data after connecting
            await get().fetchOnChainState();
        } catch (error: any) {
            set({ error: error.message || 'Failed to connect wallet' });
        }
    },

    disconnectWallet: () => {
        blockchain.disconnect();
        set({
            isConnected: false,
            walletAddress: null,
            isOwner: false,
            isOnChainMode: false,
        });
    },

    toggleOnChainMode: () => {
        const current = get().isOnChainMode;
        set({ isOnChainMode: !current });
        if (!current) {
            get().fetchOnChainState();
        }
    },

    fetchOnChainState: async () => {
        try {
            const [systemState, agents, rankings, eventHistory, contractPriceHistory] = await Promise.all([
                blockchain.getSystemState(),
                blockchain.getAllAgentStats(),
                blockchain.getAllRankings(),
                blockchain.getEventPriceHistory(200).catch(() => []),  // rich event log
                blockchain.getPriceHistory(50).catch(() => []),        // contract view fallback
            ]);

            // Use event history if available; otherwise fall back to contract view
            const hasEventData = eventHistory.length > 0;
            const simplePriceHistory = hasEventData
                ? eventHistory.map(e => e.price)
                : contractPriceHistory;

            set({
                onChainPrice: Number(systemState.currentPrice) / 1e18,
                onChainUpdateCount: Number(systemState.totalUpdates),
                arenaState: systemState.arenaState,
                onChainAgents: agents,
                onChainRankings: rankings,
                onChainEventHistory: eventHistory,
                onChainPriceHistory: simplePriceHistory,
                error: null,
            });
        } catch (error: any) {
            set({ error: 'Failed to fetch on-chain data: ' + (error.message || '') });
        }
    },

    triggerOnChainPrice: async (price: number) => {
        try {
            set({ isTxPending: true, error: null });
            const hash = await blockchain.triggerPriceUpdate(price);
            set({ lastTxHash: hash });
            await get().fetchOnChainState();
        } catch (error: any) {
            set({ error: error.message || 'Transaction failed' });
        } finally {
            set({ isTxPending: false });
        }
    },

    triggerOnChainScenario: async (prices: number[], scenarioId?: string) => {
        try {
            set({ isTxPending: true, pendingScenarioId: scenarioId || null, error: null });
            const hash = await blockchain.triggerScenario(prices);
            set({ lastTxHash: hash });
            await get().fetchOnChainState();
        } catch (error: any) {
            set({ error: error.message || 'Scenario transaction failed' });
        } finally {
            set({ isTxPending: false, pendingScenarioId: null });
        }
    },

    resetOnChainArena: async () => {
        try {
            set({ isTxPending: true, error: null });
            const hash = await blockchain.resetArena();
            set({ lastTxHash: hash });
            await get().fetchOnChainState();
        } catch (error: any) {
            set({ error: error.message || 'Reset failed' });
        } finally {
            set({ isTxPending: false });
        }
    },

    startOnChainRound: async () => {
        try {
            set({ isTxPending: true, error: null });
            const hash = await blockchain.startRound();
            set({ lastTxHash: hash });
            await get().fetchOnChainState();
        } catch (error: any) {
            set({ error: error.message || 'Start round failed' });
        } finally {
            set({ isTxPending: false });
        }
    },

    clearError: () => set({ error: null }),
}));

// Helper to get explorer link for a tx
export function getExplorerTxLink(hash: string) {
    return `${SOMNIA_EXPLORER}/tx/${hash}`;
}

export function getExplorerAddressLink(address: string) {
    return `${SOMNIA_EXPLORER}/address/${address}`;
}
