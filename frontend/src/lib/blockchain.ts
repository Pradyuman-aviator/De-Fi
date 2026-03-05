// Blockchain service — connects frontend to deployed Somnia contracts
import { ethers } from 'ethers';
import { CONTRACTS, ABIS, SOMNIA_RPC, SOMNIA_CHAIN_ID, STRATEGY_TO_AGENT_ID } from './contracts';

// ============= TYPES =============

export interface OnChainAgentStats {
    agentId: string;
    name: string;
    strategyType: number;
    position: number; // 0=NEUTRAL, 1=LONG, 2=SHORT
    entryPrice: bigint;
    positionSize: bigint;
    totalPnL: bigint;
    unrealizedPnL: bigint;
    totalTrades: bigint;
    winRate: bigint;
    isActive: boolean;
}

export interface OnChainRanking {
    strategy: string;
    name: string;
    totalPnL: bigint;
    winRate: bigint;
    totalTrades: bigint;
    rank: bigint;
}

export interface SystemState {
    arenaState: number;
    roundNumber: bigint;
    totalUpdates: bigint;
    currentPrice: bigint;
    strategyCount: bigint;
    roundStartTime: bigint;
}

// ============= BLOCKCHAIN SERVICE =============

class BlockchainService {
    private readProvider: ethers.JsonRpcProvider;
    private signer: ethers.Signer | null = null;
    private _isConnected = false;
    private _walletAddress: string | null = null;
    private _isOwner = false;

    // Contract instances (read-only)
    public arenaCore: ethers.Contract;
    public priceOracle: ethers.Contract;
    public portfolioManager: ethers.Contract;
    public leaderboard: ethers.Contract;

    constructor() {
        this.readProvider = new ethers.JsonRpcProvider(SOMNIA_RPC);

        // Read-only contract instances
        this.arenaCore = new ethers.Contract(CONTRACTS.ArenaCore, ABIS.ArenaCore, this.readProvider);
        this.priceOracle = new ethers.Contract(CONTRACTS.PriceOracle, ABIS.PriceOracle, this.readProvider);
        this.portfolioManager = new ethers.Contract(CONTRACTS.PortfolioManager, ABIS.PortfolioManager, this.readProvider);
        this.leaderboard = new ethers.Contract(CONTRACTS.Leaderboard, ABIS.Leaderboard, this.readProvider);
    }

    // --- Wallet Connection ---

    get isConnected() { return this._isConnected; }
    get walletAddress() { return this._walletAddress; }
    get isOwner() { return this._isOwner; }

    async connectWallet(): Promise<boolean> {
        try {
            if (typeof window === 'undefined' || !(window as any).ethereum) {
                throw new Error('MetaMask not found. Please install MetaMask.');
            }

            const ethereum = (window as any).ethereum;

            // Request accounts
            await ethereum.request({ method: 'eth_requestAccounts' });

            // Check/switch to Somnia network
            const chainId = await ethereum.request({ method: 'eth_chainId' });
            if (parseInt(chainId, 16) !== SOMNIA_CHAIN_ID) {
                try {
                    await ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x' + SOMNIA_CHAIN_ID.toString(16) }],
                    });
                } catch (switchError: any) {
                    // Chain not added — add it
                    if (switchError.code === 4902) {
                        await ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x' + SOMNIA_CHAIN_ID.toString(16),
                                chainName: 'Somnia Testnet (Shannon)',
                                nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
                                rpcUrls: [SOMNIA_RPC],
                                blockExplorerUrls: ['https://shannon-explorer.somnia.network'],
                            }],
                        });
                    } else {
                        throw switchError;
                    }
                }
            }

            const provider = new ethers.BrowserProvider(ethereum);
            this.signer = await provider.getSigner();
            this._walletAddress = await this.signer.getAddress();
            this._isConnected = true;

            // Check if connected wallet is the contract owner
            const owner = await this.arenaCore.owner();
            this._isOwner = owner.toLowerCase() === this._walletAddress.toLowerCase();

            // Create writable contract instances
            this.arenaCore = new ethers.Contract(CONTRACTS.ArenaCore, ABIS.ArenaCore, this.signer);

            return true;
        } catch (error: any) {
            console.error('Wallet connection failed:', error);
            this._isConnected = false;
            throw error;
        }
    }

    disconnect() {
        this._isConnected = false;
        this._walletAddress = null;
        this._isOwner = false;
        this.signer = null;

        // Reset to read-only
        this.arenaCore = new ethers.Contract(CONTRACTS.ArenaCore, ABIS.ArenaCore, this.readProvider);
    }

    // --- Read Functions (no wallet needed) ---

    async getSystemState(): Promise<SystemState> {
        const result = await this.arenaCore.getSystemState();
        return {
            arenaState: Number(result[0]),
            roundNumber: result[1],
            totalUpdates: result[2],
            currentPrice: result[3],
            strategyCount: result[4],
            roundStartTime: result[5],
        };
    }

    async getCurrentPrice(): Promise<number> {
        const price = await this.priceOracle.currentPrice();
        return Number(ethers.formatEther(price));
    }

    async getPriceHistory(count: number = 20): Promise<number[]> {
        try {
            const prices = await this.priceOracle.getPriceHistory(count);
            return prices.map((p: bigint) => Number(ethers.formatEther(p)));
        } catch {
            return [];
        }
    }

    async getAllAgentStats(): Promise<OnChainAgentStats[]> {
        const price = await this.priceOracle.currentPrice();
        const stats = await this.portfolioManager.getAllAgentStats(price);

        return stats.map((s: any) => ({
            agentId: STRATEGY_TO_AGENT_ID[s.strategyAddress.toLowerCase()] || 'unknown',
            name: s.name,
            strategyType: Number(s.strategyType),
            position: Number(s.position),
            entryPrice: s.entryPrice,
            positionSize: s.positionSize,
            totalPnL: s.totalPnL,
            unrealizedPnL: s.unrealizedPnL,
            totalTrades: s.totalTrades,
            winRate: s.winRate,
            isActive: s.isActive,
        }));
    }

    async getAllRankings(): Promise<OnChainRanking[]> {
        try {
            const rankings = await this.leaderboard.getAllRankings();
            return rankings.map((r: any) => ({
                strategy: r.strategy,
                name: r.name,
                totalPnL: r.totalPnL,
                winRate: r.winRate,
                totalTrades: r.totalTrades,
                rank: r.rank,
            }));
        } catch {
            return [];
        }
    }

    // --- Write Functions (wallet required, owner only) ---

    async triggerPriceUpdate(priceUsd: number): Promise<string> {
        if (!this.signer || !this._isOwner) throw new Error('Must be connected as owner');
        const priceWei = ethers.parseEther(priceUsd.toString());
        const tx = await this.arenaCore.triggerPriceUpdate(priceWei);
        await tx.wait();
        return tx.hash;
    }

    async triggerScenario(pricesUsd: number[]): Promise<string> {
        if (!this.signer || !this._isOwner) throw new Error('Must be connected as owner');
        const pricesWei = pricesUsd.map(p => ethers.parseEther(p.toString()));
        const tx = await this.arenaCore.triggerScenario(pricesWei);
        await tx.wait();
        return tx.hash;
    }

    async resetArena(initialPrice: number = 1500): Promise<string> {
        if (!this.signer || !this._isOwner) throw new Error('Must be connected as owner');
        const priceWei = ethers.parseEther(initialPrice.toString());
        const tx = await this.arenaCore.resetArena(priceWei);
        await tx.wait();
        return tx.hash;
    }

    async startRound(): Promise<string> {
        if (!this.signer || !this._isOwner) throw new Error('Must be connected as owner');
        const tx = await this.arenaCore.startRound();
        await tx.wait();
        return tx.hash;
    }
}

// Singleton instance
export const blockchain = new BlockchainService();
