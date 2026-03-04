// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PriceOracle
 * @notice The heartbeat of the DeFi Arena - stores prices, calculates volatility,
 *         and emits PriceUpdated events that trigger the entire reactive cascade.
 */
contract PriceOracle {
    // --- State Variables ---
    uint256 public currentPrice;
    uint256 public lastUpdateTime;
    uint256 public updateCount;
    address public owner;
    address public arena;

    // Circular buffer for price history (last 100 prices)
    uint256[100] public priceHistory;
    uint256 public historyIndex;
    uint256 public historyCount;

    // --- Events ---
    event PriceUpdated(
        uint256 indexed updateId,
        uint256 newPrice,
        uint256 oldPrice,
        int256 priceChange,
        uint256 volatility,
        uint256 timestamp
    );

    // --- Modifiers ---
    modifier onlyAuthorized() {
        require(msg.sender == owner || msg.sender == arena, "Not authorized");
        _;
    }

    // --- Constructor ---
    constructor(uint256 _initialPrice) {
        owner = msg.sender;
        currentPrice = _initialPrice;
        lastUpdateTime = block.timestamp;

        // Seed history with initial price
        priceHistory[0] = _initialPrice;
        historyCount = 1;
        historyIndex = 1;
    }

    // --- Core Functions ---

    /**
     * @notice Update the oracle price - this triggers the entire reactive cascade
     * @param _newPrice The new price in wei (18 decimals)
     */
    function updatePrice(uint256 _newPrice) external onlyAuthorized {
        require(_newPrice > 0, "Price must be > 0");

        uint256 oldPrice = currentPrice;
        int256 priceChange = int256(_newPrice) - int256(oldPrice);

        // Update state
        currentPrice = _newPrice;
        lastUpdateTime = block.timestamp;
        updateCount++;

        // Store in circular buffer
        priceHistory[historyIndex] = _newPrice;
        historyIndex = (historyIndex + 1) % 100;
        if (historyCount < 100) historyCount++;

        // Calculate current volatility
        uint256 vol = getVolatility();

        // THE TRIGGER - this event emission fires everything
        emit PriceUpdated(
            updateCount,
            _newPrice,
            oldPrice,
            priceChange,
            vol,
            block.timestamp
        );
    }

    /**
     * @notice Batch update prices (for scenario simulation)
     * @param _prices Array of prices to apply sequentially
     */
    function batchUpdatePrices(uint256[] calldata _prices) external onlyAuthorized {
        for (uint256 i = 0; i < _prices.length; i++) {
            require(_prices[i] > 0, "Price must be > 0");

            uint256 oldPrice = currentPrice;
            int256 priceChange = int256(_prices[i]) - int256(oldPrice);

            currentPrice = _prices[i];
            lastUpdateTime = block.timestamp;
            updateCount++;

            priceHistory[historyIndex] = _prices[i];
            historyIndex = (historyIndex + 1) % 100;
            if (historyCount < 100) historyCount++;

            uint256 vol = getVolatility();

            emit PriceUpdated(
                updateCount,
                _prices[i],
                oldPrice,
                priceChange,
                vol,
                block.timestamp
            );
        }
    }

    /**
     * @notice Get the last N prices from history
     * @param count Number of prices to return (max 100)
     */
    function getPriceHistory(uint256 count) external view returns (uint256[] memory) {
        if (count > historyCount) count = historyCount;

        uint256[] memory prices = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 idx;
            if (historyIndex >= count) {
                idx = historyIndex - count + i;
            } else {
                idx = (100 + historyIndex - count + i) % 100;
            }
            prices[i] = priceHistory[idx];
        }
        return prices;
    }

    /**
     * @notice Calculate price volatility (standard deviation × 100 for precision)
     * @return Volatility as a percentage × 100 (e.g., 500 = 5% volatility)
     */
    function getVolatility() public view returns (uint256) {
        if (historyCount < 2) return 0;

        uint256 count = historyCount > 20 ? 20 : historyCount;

        // Calculate mean
        uint256 sum = 0;
        for (uint256 i = 0; i < count; i++) {
            uint256 idx = (100 + historyIndex - 1 - i) % 100;
            sum += priceHistory[idx];
        }
        uint256 mean = sum / count;
        if (mean == 0) return 0;

        // Calculate variance
        uint256 varianceSum = 0;
        for (uint256 i = 0; i < count; i++) {
            uint256 idx = (100 + historyIndex - 1 - i) % 100;
            uint256 price = priceHistory[idx];
            if (price > mean) {
                varianceSum += ((price - mean) * 10000) / mean;
            } else {
                varianceSum += ((mean - price) * 10000) / mean;
            }
        }

        // Return average deviation as basis points
        return varianceSum / count;
    }

    /**
     * @notice Get a simple moving average of the last N prices
     * @param period Number of prices to average
     */
    function getMovingAverage(uint256 period) external view returns (uint256) {
        if (period > historyCount) period = historyCount;
        if (period == 0) return currentPrice;

        uint256 sum = 0;
        for (uint256 i = 0; i < period; i++) {
            uint256 idx = (100 + historyIndex - 1 - i) % 100;
            sum += priceHistory[idx];
        }
        return sum / period;
    }

    // --- Admin Functions ---

    function setArena(address _arena) external {
        require(msg.sender == owner, "Only owner");
        arena = _arena;
    }

    function resetOracle(uint256 _initialPrice) external {
        require(msg.sender == owner || msg.sender == arena, "Not authorized");
        currentPrice = _initialPrice;
        updateCount = 0;
        historyCount = 1;
        historyIndex = 1;
        priceHistory[0] = _initialPrice;
        lastUpdateTime = block.timestamp;
    }
}
