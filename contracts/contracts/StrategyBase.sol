// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StrategyBase
 * @notice Abstract base contract that all AI trading agents inherit from.
 *         Provides identity, performance tracking, position management,
 *         and the reactive interface.
 */
abstract contract StrategyBase {
    // --- Enums ---
    enum Position { NEUTRAL, LONG, SHORT }
    enum StrategyType { MOMENTUM, MEAN_REVERSION, ARBITRAGE, RISK_PARITY, RL }

    // --- Identity ---
    string public name;
    StrategyType public strategyType;
    address public owner;
    address public arena;
    address public priceOracle;
    address public portfolioManager;

    // --- Performance Metrics ---
    int256 public totalPnL;
    uint256 public totalTrades;
    uint256 public winningTrades;
    uint256 public losingTrades;

    // --- Current Position ---
    Position public currentPosition;
    uint256 public entryPrice;
    uint256 public positionSize;
    uint256 public positionOpenTime;

    // --- Configuration ---
    uint256 public maxPositionSize;
    uint256 public stopLossPercent; // in basis points (e.g., 500 = 5%)
    uint256 public defaultPositionSize;
    bool public isActive;

    // --- Trade History ---
    struct Trade {
        uint256 updateId;
        Position action;
        uint256 price;
        int256 pnl;
        uint256 timestamp;
        string reason;
    }

    Trade[] public tradeHistory;

    // --- Events ---
    event TradeExecuted(
        address indexed strategy,
        string strategyName,
        Position position,
        uint256 price,
        int256 pnl,
        uint256 timestamp,
        string reason
    );

    event PositionClosed(
        address indexed strategy,
        int256 pnl,
        uint256 entryPrice,
        uint256 exitPrice
    );

    // --- Modifiers ---
    modifier onlyAuthorized() {
        require(
            msg.sender == owner || msg.sender == arena || msg.sender == address(this),
            "Not authorized"
        );
        _;
    }

    modifier whenActive() {
        require(isActive, "Strategy not active");
        _;
    }

    // --- Constructor ---
    constructor(
        string memory _name,
        StrategyType _type,
        address _priceOracle,
        uint256 _maxPositionSize,
        uint256 _stopLossPercent
    ) {
        name = _name;
        strategyType = _type;
        owner = msg.sender;
        priceOracle = _priceOracle;
        maxPositionSize = _maxPositionSize;
        stopLossPercent = _stopLossPercent;
        defaultPositionSize = _maxPositionSize / 2;
        isActive = true;
        currentPosition = Position.NEUTRAL;
    }

    // --- Reactive Entry Point ---

    /**
     * @notice Called by the reactive system when PriceOracle emits PriceUpdated
     * @param _currentPrice The new price
     * @param _updateId The update sequence number
     */
    function react(uint256 _currentPrice, uint256 _updateId) external {
        require(isActive, "Strategy not active");

        // Check stop loss first
        if (currentPosition != Position.NEUTRAL) {
            if (_shouldStopLoss(_currentPrice)) {
                _closePosition(_currentPrice, _updateId, "Stop Loss Hit");
            }
        }

        // Execute strategy-specific logic
        (Position signal, uint256 size, string memory reason) = _executeStrategy(
            _currentPrice,
            _updateId
        );

        // Act on signal
        if (signal != currentPosition) {
            // Close existing position first
            if (currentPosition != Position.NEUTRAL) {
                _closePosition(_currentPrice, _updateId, reason);
            }
            // Open new position if signal is not neutral
            if (signal != Position.NEUTRAL) {
                _openPosition(signal, _currentPrice, size, _updateId, reason);
            }
        }
    }

    // --- Abstract: Strategy Logic ---

    /**
     * @notice Each strategy implements this differently
     * @return signal The desired position (LONG/SHORT/NEUTRAL)
     * @return size The suggested position size
     * @return reason Human-readable explanation for the trade
     */
    function _executeStrategy(
        uint256 _currentPrice,
        uint256 _updateId
    ) internal virtual returns (Position signal, uint256 size, string memory reason);

    // --- Position Management ---

    function _openPosition(
        Position _position,
        uint256 _price,
        uint256 _size,
        uint256 _updateId,
        string memory _reason
    ) internal {
        currentPosition = _position;
        entryPrice = _price;
        positionSize = _size > 0 ? _size : defaultPositionSize;
        positionOpenTime = block.timestamp;

        Trade memory trade = Trade({
            updateId: _updateId,
            action: _position,
            price: _price,
            pnl: 0,
            timestamp: block.timestamp,
            reason: _reason
        });
        tradeHistory.push(trade);
        totalTrades++;

        emit TradeExecuted(
            address(this),
            name,
            _position,
            _price,
            0,
            block.timestamp,
            _reason
        );
    }

    function _closePosition(
        uint256 _exitPrice,
        uint256 _updateId,
        string memory _reason
    ) internal {
        int256 pnl = _calculatePnL(_exitPrice);
        totalPnL += pnl;

        if (pnl > 0) {
            winningTrades++;
        } else if (pnl < 0) {
            losingTrades++;
        }

        emit PositionClosed(address(this), pnl, entryPrice, _exitPrice);

        Trade memory trade = Trade({
            updateId: _updateId,
            action: Position.NEUTRAL,
            price: _exitPrice,
            pnl: pnl,
            timestamp: block.timestamp,
            reason: _reason
        });
        tradeHistory.push(trade);

        // Reset position
        currentPosition = Position.NEUTRAL;
        entryPrice = 0;
        positionSize = 0;
        positionOpenTime = 0;
    }

    function _calculatePnL(uint256 _exitPrice) internal view returns (int256) {
        if (entryPrice == 0) return 0;

        int256 priceDiff;
        if (currentPosition == Position.LONG) {
            priceDiff = int256(_exitPrice) - int256(entryPrice);
        } else if (currentPosition == Position.SHORT) {
            priceDiff = int256(entryPrice) - int256(_exitPrice);
        } else {
            return 0;
        }

        // PnL as scaled value (price diff * position size / entry price)
        return (priceDiff * int256(positionSize)) / int256(entryPrice);
    }

    function _shouldStopLoss(uint256 _currentPrice) internal view returns (bool) {
        if (stopLossPercent == 0 || entryPrice == 0) return false;

        uint256 lossPercent;
        if (currentPosition == Position.LONG && _currentPrice < entryPrice) {
            lossPercent = ((entryPrice - _currentPrice) * 10000) / entryPrice;
        } else if (currentPosition == Position.SHORT && _currentPrice > entryPrice) {
            lossPercent = ((_currentPrice - entryPrice) * 10000) / entryPrice;
        } else {
            return false;
        }

        return lossPercent >= stopLossPercent;
    }

    // --- View Functions ---

    function getUnrealizedPnL(uint256 _currentPrice) external view returns (int256) {
        if (currentPosition == Position.NEUTRAL) return 0;
        return _calculatePnL(_currentPrice);
    }

    function getWinRate() external view returns (uint256) {
        if (totalTrades == 0) return 0;
        uint256 totalDecided = winningTrades + losingTrades;
        if (totalDecided == 0) return 50;
        return (winningTrades * 100) / totalDecided;
    }

    function getTradeCount() external view returns (uint256) {
        return tradeHistory.length;
    }

    function getRecentTrades(uint256 count) external view returns (Trade[] memory) {
        uint256 total = tradeHistory.length;
        if (count > total) count = total;

        Trade[] memory recent = new Trade[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = tradeHistory[total - count + i];
        }
        return recent;
    }

    /**
     * @notice Get all stats in one call (gas efficient for frontend)
     */
    function getStats(uint256 _currentPrice) external view returns (
        string memory _name,
        StrategyType _type,
        Position _position,
        uint256 _entryPrice,
        uint256 _positionSize,
        int256 _totalPnL,
        int256 _unrealizedPnL,
        uint256 _totalTrades,
        uint256 _winRate,
        bool _isActive
    ) {
        int256 unrealized = currentPosition != Position.NEUTRAL
            ? _calculatePnL(_currentPrice)
            : int256(0);

        uint256 winRate = totalTrades == 0 ? 50 :
            (winningTrades + losingTrades == 0 ? 50 :
            (winningTrades * 100) / (winningTrades + losingTrades));

        return (
            name,
            strategyType,
            currentPosition,
            entryPrice,
            positionSize,
            totalPnL,
            unrealized,
            totalTrades,
            winRate,
            isActive
        );
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

    function toggleActive() external onlyAuthorized {
        isActive = !isActive;
    }

    function resetStrategy() external onlyAuthorized {
        totalPnL = 0;
        totalTrades = 0;
        winningTrades = 0;
        losingTrades = 0;
        currentPosition = Position.NEUTRAL;
        entryPrice = 0;
        positionSize = 0;
        positionOpenTime = 0;
        delete tradeHistory;
    }

    function updateConfig(
        uint256 _maxPositionSize,
        uint256 _stopLossPercent,
        uint256 _defaultPositionSize
    ) external onlyAuthorized {
        maxPositionSize = _maxPositionSize;
        stopLossPercent = _stopLossPercent;
        defaultPositionSize = _defaultPositionSize;
    }
}
