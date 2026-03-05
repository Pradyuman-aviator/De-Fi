// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StrategyBase.sol";

interface IPortfolioManagerLB {
    function strategies(uint256 idx) external view returns (address);
    function getStrategyCount() external view returns (uint256);
}

interface IStrategyStatsLB {
    function totalPnL() external view returns (int256);
    function getWinRate() external view returns (uint256);
    function totalTrades() external view returns (uint256);
    function name() external view returns (string memory);
    function getStats(uint256 _currentPrice) external view returns (
        string memory, StrategyBase.StrategyType, StrategyBase.Position,
        uint256, uint256, int256, int256, uint256, uint256, bool
    );
}

/**
 * @title Leaderboard
 * @notice The Scoreboard - maintains real-time rankings of agents by P&L,
 *         win rate, and total trades. Updated reactively after portfolio updates.
 */
contract Leaderboard {
    address public owner;
    address public arena;
    address public portfolioManager;

    // --- Ranking Data ---
    struct RankEntry {
        address strategy;
        string name;
        int256 totalPnL;
        uint256 winRate;
        uint256 totalTrades;
        uint256 rank;
    }

    RankEntry[] public rankings;
    uint256 public lastUpdateTime;
    uint256 public updateCount;

    // Historical ranking snapshots (last 20)
    struct RankSnapshot {
        uint256 timestamp;
        address[] rankedAddresses;
        int256[] rankedPnLs;
    }

    RankSnapshot[] public rankHistory;
    uint256 public constant MAX_HISTORY = 20;

    // --- Events ---
    event RankingsUpdated(
        uint256 indexed updateId,
        address topAgent,
        int256 topPnL,
        uint256 timestamp
    );

    event RankChanged(
        address indexed strategy,
        uint256 oldRank,
        uint256 newRank
    );

    // --- Constructor ---
    constructor(address _portfolioManager) {
        owner = msg.sender;
        portfolioManager = _portfolioManager;
    }

    // --- Core Functions ---

    /**
     * @notice Update rankings based on current P&L - called reactively
     * @param _currentPrice The current price for unrealized P&L calculation
     */
    function updateRankings(uint256 _currentPrice) external {
        IPortfolioManagerLB pm = IPortfolioManagerLB(portfolioManager);
        uint256 count = pm.getStrategyCount();

        if (count == 0) return;

        // Rebuild rankings array
        delete rankings;

        for (uint256 i = 0; i < count; i++) {
            address stratAddr = pm.strategies(i);
            IStrategyStatsLB strat = IStrategyStatsLB(stratAddr);

            // Get combined P&L (realized + unrealized)
            (,,,,, int256 sPnL, int256 sUnrealized, uint256 sTrades, uint256 sWinRate,) = strat.getStats(_currentPrice);

            rankings.push(RankEntry({
                strategy: stratAddr,
                name: strat.name(),
                totalPnL: sPnL + sUnrealized,
                winRate: sWinRate,
                totalTrades: sTrades,
                rank: 0
            }));
        }

        // Sort by total P&L (descending) — simple insertion sort (max 5-10 agents)
        for (uint256 i = 1; i < rankings.length; i++) {
            RankEntry memory key = rankings[i];
            int256 j = int256(i) - 1;
            while (j >= 0 && rankings[uint256(j)].totalPnL < key.totalPnL) {
                rankings[uint256(j) + 1] = rankings[uint256(j)];
                j--;
            }
            rankings[uint256(j) + 1] = key;
        }

        // Assign ranks
        for (uint256 i = 0; i < rankings.length; i++) {
            rankings[i].rank = i + 1;
        }

        // Save snapshot to history
        _saveSnapshot();

        updateCount++;
        lastUpdateTime = block.timestamp;

        // Emit events
        if (rankings.length > 0) {
            emit RankingsUpdated(
                updateCount,
                rankings[0].strategy,
                rankings[0].totalPnL,
                block.timestamp
            );
        }
    }

    // History tracking uses circular buffer
    uint256 public historyIndex;

    function _saveSnapshot() internal {
        address[] memory addrs = new address[](rankings.length);
        int256[] memory pnls = new int256[](rankings.length);

        for (uint256 i = 0; i < rankings.length; i++) {
            addrs[i] = rankings[i].strategy;
            pnls[i] = rankings[i].totalPnL;
        }

        RankSnapshot memory snap = RankSnapshot({
            timestamp: block.timestamp,
            rankedAddresses: addrs,
            rankedPnLs: pnls
        });

        if (rankHistory.length < MAX_HISTORY) {
            rankHistory.push(snap);
        } else {
            rankHistory[historyIndex] = snap;
        }
        historyIndex = (historyIndex + 1) % MAX_HISTORY;
    }

    // --- View Functions ---

    /**
     * @notice Get top N agents
     */
    function getTopN(uint256 n) external view returns (RankEntry[] memory) {
        uint256 count = n > rankings.length ? rankings.length : n;
        RankEntry[] memory top = new RankEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            top[i] = rankings[i];
        }
        return top;
    }

    /**
     * @notice Get all rankings
     */
    function getAllRankings() external view returns (RankEntry[] memory) {
        return rankings;
    }

    /**
     * @notice Get rank of specific agent
     */
    function getAgentRank(address _strategy) external view returns (uint256) {
        for (uint256 i = 0; i < rankings.length; i++) {
            if (rankings[i].strategy == _strategy) {
                return rankings[i].rank;
            }
        }
        return 0; // Not ranked
    }

    /**
     * @notice Get number of ranking history snapshots
     */
    function getRankHistoryCount() external view returns (uint256) {
        return rankHistory.length;
    }

    /**
     * @notice Get ranking history at specific index
     */
    function getRankHistoryAt(uint256 index) external view returns (
        uint256 timestamp,
        address[] memory rankedAddresses,
        int256[] memory rankedPnLs
    ) {
        require(index < rankHistory.length, "Index out of bounds");
        RankSnapshot storage snap = rankHistory[index];
        return (snap.timestamp, snap.rankedAddresses, snap.rankedPnLs);
    }

    function getRankingCount() external view returns (uint256) {
        return rankings.length;
    }

    // --- Admin ---

    function setArena(address _arena) external {
        require(msg.sender == owner, "Only owner");
        arena = _arena;
    }

    function setPortfolioManager(address _pm) external {
        require(msg.sender == owner || msg.sender == arena, "Not authorized");
        portfolioManager = _pm;
    }

    function resetLeaderboard() external {
        require(msg.sender == owner || msg.sender == arena, "Not authorized");
        delete rankings;
        delete rankHistory;
        updateCount = 0;
    }
}
