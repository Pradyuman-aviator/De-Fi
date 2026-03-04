// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../StrategyBase.sol";

interface IPriceOracleMR {
    function getPriceHistory(uint256 count) external view returns (uint256[] memory);
    function currentPrice() external view returns (uint256);
}

/**
 * @title MeanReversionStrategy
 * @notice "Buy low, sell high - everything returns to the mean"
 *         Uses Bollinger Band-style deviation to identify oversold/overbought conditions.
 */
contract MeanReversionStrategy is StrategyBase {
    uint256 public lookbackPeriod;     // Number of prices for moving average (10-50)
    uint256 public deviationMultiple;  // Std dev multiplier × 100 (200 = 2.0x)

    constructor(
        address _priceOracle,
        uint256 _lookbackPeriod,
        uint256 _deviationMultiple
    ) StrategyBase(
        "Mean Reverter",
        StrategyType.MEAN_REVERSION,
        _priceOracle,
        1000 ether,
        700  // 7% stop loss (wider because counter-trend)
    ) {
        lookbackPeriod = _lookbackPeriod > 0 ? _lookbackPeriod : 20;
        deviationMultiple = _deviationMultiple > 0 ? _deviationMultiple : 200;
    }

    function _executeStrategy(
        uint256 _currentPrice,
        uint256 /* _updateId */
    ) internal view override returns (Position signal, uint256 size, string memory reason) {
        IPriceOracleMR oracle = IPriceOracleMR(priceOracle);
        uint256[] memory history = oracle.getPriceHistory(lookbackPeriod);

        if (history.length < 5) {
            return (Position.NEUTRAL, 0, "Insufficient data for mean reversion");
        }

        // Calculate mean
        uint256 sum = 0;
        for (uint256 i = 0; i < history.length; i++) {
            sum += history[i];
        }
        uint256 mean = sum / history.length;
        if (mean == 0) return (Position.NEUTRAL, 0, "Invalid mean");

        // Calculate mean absolute deviation (simpler than stddev, saves gas)
        uint256 madSum = 0;
        for (uint256 i = 0; i < history.length; i++) {
            if (history[i] > mean) {
                madSum += history[i] - mean;
            } else {
                madSum += mean - history[i];
            }
        }
        uint256 mad = madSum / history.length;

        // Deviation bands: mean ± (deviationMultiple/100 * mad)
        uint256 deviation = (mad * deviationMultiple) / 100;
        uint256 upperBand = mean + deviation;
        uint256 lowerBand = deviation > mean ? 0 : mean - deviation;

        // Position sizing based on how far from mean
        size = defaultPositionSize;
        if (_currentPrice > upperBand && deviation > 0) {
            uint256 distancePct = ((_currentPrice - mean) * 100) / mean;
            size = (defaultPositionSize * (100 + distancePct)) / 100;
            if (size > maxPositionSize) size = maxPositionSize;
        } else if (_currentPrice < lowerBand && deviation > 0) {
            uint256 distancePct = ((mean - _currentPrice) * 100) / mean;
            size = (defaultPositionSize * (100 + distancePct)) / 100;
            if (size > maxPositionSize) size = maxPositionSize;
        }

        // Bollinger-style signals
        if (_currentPrice < lowerBand) {
            return (Position.LONG, size, "Price below lower band - oversold, buying dip");
        } else if (_currentPrice > upperBand) {
            return (Position.SHORT, size, "Price above upper band - overbought, selling rally");
        } else {
            // If in a position and price returned to mean, close
            if (currentPosition != Position.NEUTRAL) {
                uint256 distToMean;
                if (_currentPrice > mean) {
                    distToMean = ((_currentPrice - mean) * 10000) / mean;
                } else {
                    distToMean = ((mean - _currentPrice) * 10000) / mean;
                }
                if (distToMean < 50) { // Within 0.5% of mean
                    return (Position.NEUTRAL, 0, "Price reverted to mean - taking profit");
                }
            }
            return (currentPosition, size, "Price within bands - holding position");
        }
    }

    function setMeanReversionParams(uint256 _lookback, uint256 _devMultiple) external onlyAuthorized {
        lookbackPeriod = _lookback;
        deviationMultiple = _devMultiple;
    }
}
