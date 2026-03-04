// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../StrategyBase.sol";

interface IPriceOracleArb {
    function getPriceHistory(uint256 count) external view returns (uint256[] memory);
    function currentPrice() external view returns (uint256);
    function getMovingAverage(uint256 period) external view returns (uint256);
}

/**
 * @title ArbitrageStrategy
 * @notice "Exploit price discrepancies between time frames"
 *         Detects spread between short-term and long-term moving averages.
 *         Quick in-and-out trades with tight stop losses.
 */
contract ArbitrageStrategy is StrategyBase {
    uint256 public shortMAPeriod;    // Short moving average period (e.g., 3)
    uint256 public longMAPeriod;     // Long moving average period (e.g., 15)
    uint256 public minSpread;        // Minimum spread in basis points (e.g., 100 = 1%)
    uint256 public maxHoldingTime;   // Max updates to hold position
    uint256 public positionAge;      // Updates since position opened

    constructor(
        address _priceOracle,
        uint256 _shortMA,
        uint256 _longMA,
        uint256 _minSpread
    ) StrategyBase(
        "Spread Sniper",
        StrategyType.ARBITRAGE,
        _priceOracle,
        800 ether,
        300  // 3% tight stop loss (quick trader)
    ) {
        shortMAPeriod = _shortMA > 0 ? _shortMA : 3;
        longMAPeriod = _longMA > 0 ? _longMA : 15;
        minSpread = _minSpread > 0 ? _minSpread : 100;
        maxHoldingTime = 5;
    }

    function _executeStrategy(
        uint256 _currentPrice,
        uint256 /* _updateId */
    ) internal override returns (Position signal, uint256 size, string memory reason) {
        IPriceOracleArb oracle = IPriceOracleArb(priceOracle);

        // Get short and long moving averages
        uint256 shortMA = oracle.getMovingAverage(shortMAPeriod);
        uint256 longMA = oracle.getMovingAverage(longMAPeriod);

        if (shortMA == 0 || longMA == 0) {
            return (Position.NEUTRAL, 0, "Insufficient data for MA calculation");
        }

        // Track position age
        if (currentPosition != Position.NEUTRAL) {
            positionAge++;
            // Force close if held too long (arb is quick)
            if (positionAge >= maxHoldingTime) {
                positionAge = 0;
                return (Position.NEUTRAL, 0, "Max holding time reached - closing");
            }
        }

        // Calculate spread between short MA and long MA
        int256 spread;
        if (shortMA >= longMA) {
            spread = int256((shortMA - longMA) * 10000 / longMA);
        } else {
            spread = -int256((longMA - shortMA) * 10000 / longMA);
        }

        // Quick scalp: smaller positions, tighter entries
        size = defaultPositionSize / 2;

        // Trade the spread
        if (spread > int256(minSpread)) {
            // Short MA above Long MA - bullish crossover
            if (currentPosition != Position.LONG) {
                positionAge = 0;
                return (Position.LONG, size, "Bullish MA crossover - spread exploit");
            }
        } else if (spread < -int256(minSpread)) {
            // Short MA below Long MA - bearish crossover
            if (currentPosition != Position.SHORT) {
                positionAge = 0;
                return (Position.SHORT, size, "Bearish MA crossover - spread exploit");
            }
        } else if (currentPosition != Position.NEUTRAL) {
            // Spread closed - take profit
            positionAge = 0;
            return (Position.NEUTRAL, 0, "Spread converged - taking profit");
        }

        return (currentPosition, size, "Monitoring spread");
    }

    function setArbitrageParams(
        uint256 _shortMA,
        uint256 _longMA,
        uint256 _minSpread,
        uint256 _maxHolding
    ) external onlyAuthorized {
        shortMAPeriod = _shortMA;
        longMAPeriod = _longMA;
        minSpread = _minSpread;
        maxHoldingTime = _maxHolding;
    }
}
