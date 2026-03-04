// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../StrategyBase.sol";

interface IPriceOracleRP {
    function getPriceHistory(uint256 count) external view returns (uint256[] memory);
    function currentPrice() external view returns (uint256);
    function getVolatility() external view returns (uint256);
    function getMovingAverage(uint256 period) external view returns (uint256);
}

/**
 * @title RiskParityStrategy
 * @notice "Size positions based on volatility"
 *         Adapts position sizes dynamically — big in calm markets, small in volatile ones.
 *         Combines with simple trend following for direction.
 */
contract RiskParityStrategy is StrategyBase {
    uint256 public volatilityLookback;  // Period for vol calculation
    uint256 public riskBudget;          // Target risk per trade in basis points (500 = 5%)
    uint256 public trendMAPeriod;       // Moving average for trend direction

    constructor(
        address _priceOracle,
        uint256 _volatilityLookback,
        uint256 _riskBudget,
        uint256 _trendMAPeriod
    ) StrategyBase(
        "Risk Guardian",
        StrategyType.RISK_PARITY,
        _priceOracle,
        1200 ether,
        600  // 6% stop loss
    ) {
        volatilityLookback = _volatilityLookback > 0 ? _volatilityLookback : 15;
        riskBudget = _riskBudget > 0 ? _riskBudget : 500;
        trendMAPeriod = _trendMAPeriod > 0 ? _trendMAPeriod : 10;
    }

    function _executeStrategy(
        uint256 _currentPrice,
        uint256 /* _updateId */
    ) internal view override returns (Position signal, uint256 size, string memory reason) {
        IPriceOracleRP oracle = IPriceOracleRP(priceOracle);

        uint256 volatility = oracle.getVolatility();
        uint256 ma = oracle.getMovingAverage(trendMAPeriod);

        if (ma == 0) {
            return (Position.NEUTRAL, 0, "Insufficient data");
        }

        // Dynamic position sizing based on inverse volatility
        // Low vol = take bigger bets, High vol = reduce exposure
        if (volatility == 0) volatility = 100; // Default to 1% vol

        // Calculate risk-adjusted size: riskBudget / volatility * base
        // Higher volatility → smaller position
        size = (defaultPositionSize * riskBudget) / (volatility + 100);
        if (size > maxPositionSize) size = maxPositionSize;
        if (size < defaultPositionSize / 10) size = defaultPositionSize / 10;

        // Simple trend following for direction
        uint256 trendStrength;
        if (_currentPrice > ma) {
            trendStrength = ((_currentPrice - ma) * 10000) / ma;
        } else {
            trendStrength = ((ma - _currentPrice) * 10000) / ma;
        }

        // Need at least 0.5% trend strength to take position
        if (trendStrength < 50) {
            if (currentPosition != Position.NEUTRAL) {
                return (Position.NEUTRAL, 0, "Trend too weak - de-risking");
            }
            return (Position.NEUTRAL, 0, "No clear trend - staying flat");
        }

        // Determine direction
        if (_currentPrice > ma) {
            string memory vol_info;
            if (volatility > 300) {
                vol_info = "High vol: small LONG position on uptrend";
            } else {
                vol_info = "Low vol: aggressive LONG position on uptrend";
            }
            return (Position.LONG, size, vol_info);
        } else {
            string memory vol_info;
            if (volatility > 300) {
                vol_info = "High vol: small SHORT position on downtrend";
            } else {
                vol_info = "Low vol: aggressive SHORT position on downtrend";
            }
            return (Position.SHORT, size, vol_info);
        }
    }

    function setRiskParityParams(
        uint256 _volLookback,
        uint256 _riskBudget,
        uint256 _trendMA
    ) external onlyAuthorized {
        volatilityLookback = _volLookback;
        riskBudget = _riskBudget;
        trendMAPeriod = _trendMA;
    }
}
