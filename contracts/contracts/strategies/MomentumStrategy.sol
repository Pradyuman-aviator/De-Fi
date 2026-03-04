// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../StrategyBase.sol";

interface IPriceOracle {
    function getPriceHistory(uint256 count) external view returns (uint256[] memory);
    function currentPrice() external view returns (uint256);
}

/**
 * @title MomentumStrategy
 * @notice "Buy strength, sell weakness" - Chases trends
 *         Tracks recent price momentum and trades in the direction of strong moves.
 */
contract MomentumStrategy is StrategyBase {
    uint256 public momentumWindow;      // Number of updates to look back (5-20)
    uint256 public momentumThreshold;   // Threshold in basis points (200 = 2%)

    constructor(
        address _priceOracle,
        uint256 _momentumWindow,
        uint256 _momentumThreshold
    ) StrategyBase(
        "Momentum Hunter",
        StrategyType.MOMENTUM,
        _priceOracle,
        1000 ether,   // max position size
        500            // 5% stop loss
    ) {
        momentumWindow = _momentumWindow > 0 ? _momentumWindow : 10;
        momentumThreshold = _momentumThreshold > 0 ? _momentumThreshold : 200;
    }

    function _executeStrategy(
        uint256 _currentPrice,
        uint256 /* _updateId */
    ) internal view override returns (Position signal, uint256 size, string memory reason) {
        IPriceOracle oracle = IPriceOracle(priceOracle);
        uint256[] memory history = oracle.getPriceHistory(momentumWindow);

        if (history.length < 2) {
            return (Position.NEUTRAL, 0, "Insufficient data");
        }

        // Calculate momentum: (current - oldest) / oldest
        uint256 oldestPrice = history[0];
        if (oldestPrice == 0) return (Position.NEUTRAL, 0, "Invalid price data");

        int256 momentum;
        if (_currentPrice >= oldestPrice) {
            momentum = int256((_currentPrice - oldestPrice) * 10000 / oldestPrice);
        } else {
            momentum = -int256((oldestPrice - _currentPrice) * 10000 / oldestPrice);
        }

        // Determine signal strength for position sizing
        uint256 absMomentum = momentum >= 0 ? uint256(momentum) : uint256(-momentum);
        size = (defaultPositionSize * absMomentum) / 1000;
        if (size > maxPositionSize) size = maxPositionSize;
        if (size == 0) size = defaultPositionSize;

        // Generate signal
        if (momentum > int256(momentumThreshold)) {
            return (Position.LONG, size, "Strong upward momentum detected");
        } else if (momentum < -int256(momentumThreshold)) {
            return (Position.SHORT, size, "Strong downward momentum detected");
        } else {
            return (Position.NEUTRAL, 0, "Momentum within threshold - staying neutral");
        }
    }

    // --- Configuration ---
    function setMomentumParams(uint256 _window, uint256 _threshold) external onlyAuthorized {
        momentumWindow = _window;
        momentumThreshold = _threshold;
    }
}
