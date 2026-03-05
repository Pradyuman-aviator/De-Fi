// Contract addresses on Somnia Testnet (Chain ID: 50312)
// Deployed via scripts/deploy-somnia.js

export const SOMNIA_CHAIN_ID = 50312;
export const SOMNIA_RPC = 'https://api.infra.testnet.somnia.network';
export const SOMNIA_EXPLORER = 'https://shannon-explorer.somnia.network';

export const CONTRACTS = {
    ArenaCore: '0x914eaFE3B3794F10358B74cD0D449233Ea7A84Fb',
    PriceOracle: '0x98730ce0dAB0a49275B4B9fAB6AD07d52Be956B9',
    PortfolioManager: '0x7e75B70Ec1Bb392E1f0b4d20beBB1f1DeACD0Cbd',
    Leaderboard: '0x8DBB0182119ADC6f36AF55C0D67616156267fBad',
    ReactiveStrategyHandler: '0xE326A438fcd19dB4206857B030700B7cA80ED95d',
    strategies: {
        MomentumStrategy: '0x0577b77528a47F557f117700E213Ed0fcb19CF42',
        MeanReversionStrategy: '0x431bfaD480c007F12EB508A8176CdFa2236f3fa7',
        ArbitrageStrategy: '0x8c4c66f8d5b539A0d8b675291a37102eD0aD9bd1',
        RiskParityStrategy: '0x42cEce4993649021CE1a19e7415eabF7B716029C',
        RLStrategy: '0xd433E5DD1cE5126eC1bbb7596e01317C0c217a61',
    },
} as const;

// Minimal ABIs — only the functions the frontend calls
export const ABIS = {
    ArenaCore: [
        'function getSystemState() view returns (uint8, uint256, uint256, uint256, uint256, uint256)',
        'function triggerPriceUpdate(uint256 _newPrice)',
        'function triggerScenario(uint256[] _prices)',
        'function resetArena(uint256 _initialPrice)',
        'function startRound()',
        'function endRound()',
        'function currentState() view returns (uint8)',
        'function owner() view returns (address)',
        'event PriceUpdateTriggered(uint256 indexed updateId, uint256 price)',
        'event ArenaReset()',
    ],
    PriceOracle: [
        'function currentPrice() view returns (uint256)',
        'function updateCount() view returns (uint256)',
        'function getPriceHistory(uint256 count) view returns (uint256[])',
        'function getVolatility() view returns (uint256)',
        'event PriceUpdated(uint256 indexed updateId, uint256 newPrice, uint256 oldPrice, int256 priceChange, uint256 volatility, uint256 timestamp)',
    ],
    PortfolioManager: [
        'function getAllAgentStats(uint256 _currentPrice) view returns (tuple(address strategyAddress, string name, uint8 strategyType, uint8 position, uint256 entryPrice, uint256 positionSize, int256 totalPnL, int256 unrealizedPnL, uint256 totalTrades, uint256 winRate, bool isActive)[])',
        'function getPortfolioSummary(uint256 _currentPrice) view returns (int256, uint256, uint256, uint256, int256, int256)',
        'function getStrategyCount() view returns (uint256)',
    ],
    Leaderboard: [
        'function getAllRankings() view returns (tuple(address strategy, string name, int256 totalPnL, uint256 winRate, uint256 totalTrades, uint256 rank)[])',
        'function updateCount() view returns (uint256)',
        'event RankingsUpdated(uint256 indexed updateId, address topAgent, int256 topPnL, uint256 timestamp)',
    ],
};

// Agent ID mapping: contract address → frontend agent ID
export const STRATEGY_TO_AGENT_ID: Record<string, string> = {
    [CONTRACTS.strategies.MomentumStrategy.toLowerCase()]: 'momentum',
    [CONTRACTS.strategies.MeanReversionStrategy.toLowerCase()]: 'meanrev',
    [CONTRACTS.strategies.ArbitrageStrategy.toLowerCase()]: 'arb',
    [CONTRACTS.strategies.RiskParityStrategy.toLowerCase()]: 'riskparity',
    [CONTRACTS.strategies.RLStrategy.toLowerCase()]: 'rl',
};
