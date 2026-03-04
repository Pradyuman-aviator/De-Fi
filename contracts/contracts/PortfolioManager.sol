// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StrategyBase.sol";

interface IStrategyStats {
    function getStats(uint256 _currentPrice) external view returns (
        string memory _name,
        StrategyBase.StrategyType _type,
        StrategyBase.Position _position,
        uint256 _entryPrice,
        uint256 _positionSize,
        int256 _totalPnL,
        int256 _unrealizedPnL,
        uint256 _totalTrades,
        uint256 _winRate,
        bool _isActive
    );
    function totalPnL() external view returns (int256);
    function currentPosition() external view returns (StrategyBase.Position);
    function react(uint256 _currentPrice, uint256 _updateId) external;
}

/**
 * @title PortfolioManager
 * @notice The Accountant - tracks all agents' positions and P&L in aggregate.
 *         Provides batch read functions for the frontend.
 */
contract PortfolioManager {
    address public owner;
    address public arena;

    // Strategy registry
    address[] public strategies;
    mapping(address => bool) public isRegistered;
    mapping(address => uint256) public allocatedCapital;

    uint256 public totalCapital;
    uint256 public defaultCapitalPerAgent;

    // Aggregate metrics
    int256 public totalPortfolioPnL;
    uint256 public totalPortfolioTrades;

    // --- Events ---
    event StrategyRegistered(address indexed strategy, uint256 capital);
    event PositionsUpdated(
        uint256 indexed updateId,
        int256 totalPnL,
        uint256 timestamp
    );
    event CapitalAllocated(address indexed strategy, uint256 amount);

    // --- Structs ---
    struct AgentSnapshot {
        address strategyAddress;
        string name;
        uint8 strategyType;
        uint8 position;        // 0=NEUTRAL, 1=LONG, 2=SHORT
        uint256 entryPrice;
        uint256 positionSize;
        int256 totalPnL;
        int256 unrealizedPnL;
        uint256 totalTrades;
        uint256 winRate;
        bool isActive;
    }

    // --- Modifiers ---
    modifier onlyAuthorized() {
        require(msg.sender == owner || msg.sender == arena, "Not authorized");
        _;
    }

    // --- Constructor ---
    constructor(uint256 _defaultCapital) {
        owner = msg.sender;
        defaultCapitalPerAgent = _defaultCapital;
    }

    // --- Registration ---

    function registerStrategy(address _strategy) external onlyAuthorized {
        require(!isRegistered[_strategy], "Already registered");
        strategies.push(_strategy);
        isRegistered[_strategy] = true;
        allocatedCapital[_strategy] = defaultCapitalPerAgent;
        totalCapital += defaultCapitalPerAgent;

        emit StrategyRegistered(_strategy, defaultCapitalPerAgent);
    }

    function registerStrategies(address[] calldata _strategies) external onlyAuthorized {
        for (uint256 i = 0; i < _strategies.length; i++) {
            if (!isRegistered[_strategies[i]]) {
                strategies.push(_strategies[i]);
                isRegistered[_strategies[i]] = true;
                allocatedCapital[_strategies[i]] = defaultCapitalPerAgent;
                totalCapital += defaultCapitalPerAgent;

                emit StrategyRegistered(_strategies[i], defaultCapitalPerAgent);
            }
        }
    }

    // --- Reactive Update ---

    /**
     * @notice Called after price update - triggers all agents and recalculates P&L
     * @param _currentPrice The current price from oracle
     * @param _updateId The update sequence number
     */
    function updatePositions(uint256 _currentPrice, uint256 _updateId) external {
        // Trigger all strategies to react
        for (uint256 i = 0; i < strategies.length; i++) {
            try IStrategyStats(strategies[i]).react(_currentPrice, _updateId) {
                // Strategy reacted successfully
            } catch {
                // Strategy failed - continue with others
            }
        }

        // Recalculate total portfolio P&L
        int256 totalPnL = 0;
        uint256 totalTrades = 0;

        for (uint256 i = 0; i < strategies.length; i++) {
            IStrategyStats strategy = IStrategyStats(strategies[i]);
            (,,,,, int256 sPnL, int256 sUnrealized, uint256 sTrades,,) = strategy.getStats(_currentPrice);
            totalPnL += sPnL + sUnrealized;
            totalTrades += sTrades;
        }

        totalPortfolioPnL = totalPnL;
        totalPortfolioTrades = totalTrades;

        emit PositionsUpdated(_updateId, totalPnL, block.timestamp);
    }

    // --- View Functions ---

    /**
     * @notice Get all agent stats in one call (gas efficient for frontend)
     */
    function getAllAgentStats(uint256 _currentPrice) external view returns (AgentSnapshot[] memory) {
        AgentSnapshot[] memory snapshots = new AgentSnapshot[](strategies.length);

        for (uint256 i = 0; i < strategies.length; i++) {
            IStrategyStats strategy = IStrategyStats(strategies[i]);

            (
                string memory sName,
                StrategyBase.StrategyType sType,
                StrategyBase.Position sPos,
                uint256 sEntry,
                uint256 sSize,
                int256 sPnL,
                int256 sUnrealized,
                uint256 sTrades,
                uint256 sWinRate,
                bool sActive
            ) = strategy.getStats(_currentPrice);

            snapshots[i] = AgentSnapshot({
                strategyAddress: strategies[i],
                name: sName,
                strategyType: uint8(sType),
                position: uint8(sPos),
                entryPrice: sEntry,
                positionSize: sSize,
                totalPnL: sPnL,
                unrealizedPnL: sUnrealized,
                totalTrades: sTrades,
                winRate: sWinRate,
                isActive: sActive
            });
        }

        return snapshots;
    }

    function getStrategyCount() external view returns (uint256) {
        return strategies.length;
    }

    function getStrategyAddresses() external view returns (address[] memory) {
        return strategies;
    }

    /**
     * @notice Aggregate portfolio summary
     */
    function getPortfolioSummary(uint256 _currentPrice) external view returns (
        int256 _totalPnL,
        uint256 _totalTrades,
        uint256 _strategyCount,
        uint256 _totalCapital,
        int256 _bestPnL,
        int256 _worstPnL
    ) {
        int256 totalPnL = 0;
        uint256 totalTrades = 0;
        int256 bestPnL = type(int256).min;
        int256 worstPnL = type(int256).max;

        for (uint256 i = 0; i < strategies.length; i++) {
            IStrategyStats strategy = IStrategyStats(strategies[i]);
            (,,,,, int256 sPnL, int256 sUnrealized, uint256 sTrades,,) = strategy.getStats(_currentPrice);
            int256 combinedPnL = sPnL + sUnrealized;
            totalPnL += combinedPnL;
            totalTrades += sTrades;
            if (combinedPnL > bestPnL) bestPnL = combinedPnL;
            if (combinedPnL < worstPnL) worstPnL = combinedPnL;
        }

        return (totalPnL, totalTrades, strategies.length, totalCapital, bestPnL, worstPnL);
    }

    // --- Admin ---

    function setArena(address _arena) external {
        require(msg.sender == owner, "Only owner");
        arena = _arena;
    }

    function resetPortfolio() external onlyAuthorized {
        totalPortfolioPnL = 0;
        totalPortfolioTrades = 0;
    }
}
