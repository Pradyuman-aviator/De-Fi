// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../StrategyBase.sol";

interface IPriceOracleRL {
    function getPriceHistory(uint256 count) external view returns (uint256[] memory);
    function currentPrice() external view returns (uint256);
    function getVolatility() external view returns (uint256);
}

/**
 * @title RLStrategy
 * @notice "Learn from experience" - Reinforcement Learning agent
 *         Uses an on-chain Q-table that maps market states to optimal actions.
 *         State = (trend_bucket, volatility_bucket, recent_pnl_bucket)
 *         Actions = LONG (0), SHORT (1), NEUTRAL (2)
 *         Q-values updated after each trade based on reward.
 */
contract RLStrategy is StrategyBase {
    // --- Q-Learning Parameters ---
    uint256 public constant NUM_TREND_BUCKETS = 5;      // Very bearish, bearish, neutral, bullish, very bullish
    uint256 public constant NUM_VOL_BUCKETS = 3;         // Low, medium, high
    uint256 public constant NUM_PNL_BUCKETS = 3;         // Losing, neutral, winning
    uint256 public constant NUM_STATES = NUM_TREND_BUCKETS * NUM_VOL_BUCKETS * NUM_PNL_BUCKETS; // 45 states
    uint256 public constant NUM_ACTIONS = 3;             // LONG, SHORT, NEUTRAL

    // Q-table: state → action → Q-value (scaled by 1000)
    int256[NUM_ACTIONS][NUM_STATES] public qTable;

    // RL hyperparameters (scaled by 1000)
    uint256 public learningRate;     // alpha, e.g. 100 = 0.1
    uint256 public discountFactor;   // gamma, e.g. 900 = 0.9
    uint256 public epsilon;          // exploration rate, e.g. 100 = 10%
    uint256 public epsilonDecay;     // decay per trade, e.g. 995 = 0.995

    // State tracking
    uint256 public lastState;
    uint256 public lastAction;
    uint256 public lastPrice;
    bool public hasLastState;

    // Pseudo-random nonce for exploration
    uint256 private nonce;

    constructor(
        address _priceOracle,
        uint256 _learningRate,
        uint256 _epsilon
    ) StrategyBase(
        "Neural Trader",
        StrategyType.RL,
        _priceOracle,
        1000 ether,
        800  // 8% stop loss (learning, wider tolerance)
    ) {
        learningRate = _learningRate > 0 ? _learningRate : 100;  // 0.1
        discountFactor = 900;   // 0.9
        epsilon = _epsilon > 0 ? _epsilon : 150;     // 15% exploration
        epsilonDecay = 995;     // decay exploration over time

        // Initialize Q-table with slight optimistic bias (encourages exploration)
        for (uint256 s = 0; s < NUM_STATES; s++) {
            qTable[s][0] = 100;  // Slight LONG bias
            qTable[s][1] = 100;  // Equal start for SHORT
            qTable[s][2] = 50;   // Slightly less for NEUTRAL (prefer action)
        }

        // Pre-train some basic intuitions:
        // Very bullish + low vol → prefer LONG
        _setQValue(3 * NUM_VOL_BUCKETS * NUM_PNL_BUCKETS + 0 * NUM_PNL_BUCKETS + 1, 0, 500);
        // Very bearish + low vol → prefer SHORT
        _setQValue(0 * NUM_VOL_BUCKETS * NUM_PNL_BUCKETS + 0 * NUM_PNL_BUCKETS + 1, 1, 500);
        // High vol + any → prefer NEUTRAL
        for (uint256 t = 0; t < NUM_TREND_BUCKETS; t++) {
            _setQValue(t * NUM_VOL_BUCKETS * NUM_PNL_BUCKETS + 2 * NUM_PNL_BUCKETS + 1, 2, 400);
        }
    }

    function _setQValue(uint256 state, uint256 action, int256 value) internal {
        if (state < NUM_STATES && action < NUM_ACTIONS) {
            qTable[state][action] = value;
        }
    }

    function _executeStrategy(
        uint256 _currentPrice,
        uint256 /* _updateId */
    ) internal override returns (Position signal, uint256 size, string memory reason) {
        // 1. Compute current state
        uint256 currentState = _computeState(_currentPrice);

        // 2. If we have a previous state, update Q-table based on reward
        if (hasLastState) {
            int256 reward = _computeReward(_currentPrice);
            _updateQTable(lastState, lastAction, reward, currentState);
        }

        // 3. Choose action (epsilon-greedy)
        uint256 action = _chooseAction(currentState);

        // 4. Store for next update
        lastState = currentState;
        lastAction = action;
        lastPrice = _currentPrice;
        hasLastState = true;

        // 5. Decay epsilon
        if (epsilon > 10) {
            epsilon = (epsilon * epsilonDecay) / 1000;
        }

        // 6. Convert action to signal
        size = defaultPositionSize;
        
        // Scale confidence from Q-values
        int256 qValue = qTable[currentState][action];
        if (qValue > 300) {
            size = (defaultPositionSize * 15) / 10; // 1.5x for high confidence
        } else if (qValue < 100) {
            size = defaultPositionSize / 2; // 0.5x for low confidence
        }
        if (size > maxPositionSize) size = maxPositionSize;

        if (action == 0) {
            return (Position.LONG, size, "RL: Q-table signals LONG");
        } else if (action == 1) {
            return (Position.SHORT, size, "RL: Q-table signals SHORT");
        } else {
            return (Position.NEUTRAL, 0, "RL: Q-table signals NEUTRAL");
        }
    }

    function _computeState(uint256 _currentPrice) internal view returns (uint256) {
        IPriceOracleRL oracle = IPriceOracleRL(priceOracle);

        // Trend bucket (0-4): based on price vs 10-period history
        uint256[] memory history = oracle.getPriceHistory(10);
        uint256 trendBucket = 2; // Default: neutral
        if (history.length >= 2) {
            uint256 oldest = history[0];
            if (oldest > 0) {
                int256 change = (int256(_currentPrice) - int256(oldest)) * 100 / int256(oldest);
                if (change < -5) trendBucket = 0;        // Very bearish (< -5%)
                else if (change < -1) trendBucket = 1;   // Bearish (-5% to -1%)
                else if (change > 5) trendBucket = 4;    // Very bullish (> +5%)
                else if (change > 1) trendBucket = 3;    // Bullish (+1% to +5%)
                else trendBucket = 2;                     // Neutral (-1% to +1%)
            }
        }

        // Volatility bucket (0-2): from oracle
        uint256 vol = oracle.getVolatility();
        uint256 volBucket;
        if (vol < 150) volBucket = 0;        // Low vol
        else if (vol < 400) volBucket = 1;   // Medium vol
        else volBucket = 2;                   // High vol

        // PnL bucket (0-2): based on recent performance
        uint256 pnlBucket = 1; // Default: neutral
        if (totalPnL > int256(defaultPositionSize / 10)) pnlBucket = 2;   // Winning
        else if (totalPnL < -int256(defaultPositionSize / 10)) pnlBucket = 0;  // Losing

        // Combine into single state index
        uint256 state = trendBucket * NUM_VOL_BUCKETS * NUM_PNL_BUCKETS
                      + volBucket * NUM_PNL_BUCKETS
                      + pnlBucket;

        if (state >= NUM_STATES) state = NUM_STATES - 1;
        return state;
    }

    function _computeReward(uint256 _currentPrice) internal view returns (int256) {
        if (lastPrice == 0) return 0;

        int256 priceChange = int256(_currentPrice) - int256(lastPrice);

        // Reward based on whether our action aligned with price movement
        if (lastAction == 0) {
            // Was LONG: reward if price went up
            return (priceChange * 1000) / int256(lastPrice);
        } else if (lastAction == 1) {
            // Was SHORT: reward if price went down
            return (-priceChange * 1000) / int256(lastPrice);
        } else {
            // Was NEUTRAL: small reward for avoiding bad moves, penalty for missing good ones
            int256 absChange = priceChange >= 0 ? priceChange : -priceChange;
            int256 missedOpportunity = (absChange * 500) / int256(lastPrice);
            return -missedOpportunity; // Small penalty for being flat during moves
        }
    }

    function _updateQTable(
        uint256 state,
        uint256 action,
        int256 reward,
        uint256 nextState
    ) internal {
        // Find max Q-value for next state
        int256 maxNextQ = qTable[nextState][0];
        if (qTable[nextState][1] > maxNextQ) maxNextQ = qTable[nextState][1];
        if (qTable[nextState][2] > maxNextQ) maxNextQ = qTable[nextState][2];

        // Q(s,a) = Q(s,a) + alpha * (reward + gamma * maxQ(s') - Q(s,a))
        int256 currentQ = qTable[state][action];
        int256 tdTarget = reward + (int256(discountFactor) * maxNextQ) / 1000;
        int256 tdError = tdTarget - currentQ;
        int256 newQ = currentQ + (int256(learningRate) * tdError) / 1000;

        // Clamp Q-values to prevent unbounded growth
        if (newQ > 2000) newQ = 2000;
        if (newQ < -2000) newQ = -2000;

        qTable[state][action] = newQ;
    }

    function _chooseAction(uint256 state) internal returns (uint256) {
        // Epsilon-greedy: explore with probability epsilon
        nonce++;
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, nonce))) % 1000;

        if (rand < epsilon) {
            // Explore: random action
            return rand % NUM_ACTIONS;
        }

        // Exploit: choose best action
        int256 bestQ = qTable[state][0];
        uint256 bestAction = 0;

        if (qTable[state][1] > bestQ) {
            bestQ = qTable[state][1];
            bestAction = 1;
        }
        if (qTable[state][2] > bestQ) {
            bestAction = 2;
        }

        return bestAction;
    }

    // --- View Functions ---

    function getQTable() external view returns (int256[NUM_ACTIONS][NUM_STATES] memory) {
        return qTable;
    }

    function getQValues(uint256 state) external view returns (int256[3] memory) {
        require(state < NUM_STATES, "Invalid state");
        return [qTable[state][0], qTable[state][1], qTable[state][2]];
    }

    function getCurrentState(uint256 _price) external view returns (uint256) {
        return _computeState(_price);
    }

    // --- Admin ---

    function setRLParams(uint256 _lr, uint256 _epsilon, uint256 _discount) external onlyAuthorized {
        learningRate = _lr;
        epsilon = _epsilon;
        discountFactor = _discount;
    }

    function preTrainQValues(uint256[] calldata states, uint256[] calldata actions, int256[] calldata values) external onlyAuthorized {
        require(states.length == actions.length && actions.length == values.length, "Array length mismatch");
        for (uint256 i = 0; i < states.length; i++) {
            require(states[i] < NUM_STATES && actions[i] < NUM_ACTIONS, "Invalid index");
            qTable[states[i]][actions[i]] = values[i];
        }
    }
}
