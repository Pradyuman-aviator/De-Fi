// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PriceOracle.sol";
import "./PortfolioManager.sol";
import "./Leaderboard.sol";

/**
 * @title ArenaCore
 * @notice The Orchestrator - central hub that ties the entire DeFi Arena together.
 *         Deploys nothing but wires everything, manages rounds, and provides admin controls.
 */
contract ArenaCore {
    // --- State ---
    address public owner;
    address public priceOracle;
    address public portfolioManager;
    address public leaderboard;

    address[] public strategyAddresses;

    // Arena state
    enum ArenaState { IDLE, ACTIVE, PAUSED, ENDED }
    ArenaState public currentState;

    uint256 public roundNumber;
    uint256 public roundStartTime;
    uint256 public totalUpdates;

    // --- Events ---
    event ArenaInitialized(
        address oracle,
        address portfolio,
        address leaderboardAddr,
        uint256 strategyCount
    );
    event RoundStarted(uint256 indexed roundNumber, uint256 timestamp);
    event RoundEnded(uint256 indexed roundNumber, uint256 totalUpdates);
    event PriceUpdateTriggered(uint256 indexed updateId, uint256 price);
    event ArenaPaused();
    event ArenaResumed();
    event ArenaReset();

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenActive() {
        require(currentState == ArenaState.ACTIVE, "Arena not active");
        _;
    }

    // --- Constructor ---
    constructor() {
        owner = msg.sender;
        currentState = ArenaState.IDLE;
    }

    // --- Initialization ---

    /**
     * @notice Wire up all pre-deployed contracts
     */
    function initialize(
        address _priceOracle,
        address _portfolioManager,
        address _leaderboard,
        address[] calldata _strategies
    ) external onlyOwner {
        priceOracle = _priceOracle;
        portfolioManager = _portfolioManager;
        leaderboard = _leaderboard;

        // Register strategies with portfolio manager
        PortfolioManager pm = PortfolioManager(_portfolioManager);
        for (uint256 i = 0; i < _strategies.length; i++) {
            strategyAddresses.push(_strategies[i]);
            if (!pm.isRegistered(_strategies[i])) {
                pm.registerStrategy(_strategies[i]);
            }
        }

        emit ArenaInitialized(
            _priceOracle,
            _portfolioManager,
            _leaderboard,
            _strategies.length
        );
    }

    /**
     * @notice Register a custom user agent from the StrategyFactory
     */
    function registerUserStrategy(address _strategy, address _owner, string memory _label) external {
        strategyAddresses.push(_strategy);
        
        StrategyBase(_strategy).setPortfolioManager(portfolioManager);

        // Arena is authorized to register strategies in PM
        PortfolioManager(portfolioManager).registerStrategy(_strategy);
        
        // Tag it as a user agent in the leaderboard
        Leaderboard(leaderboard).registerUserAgent(_strategy, _owner, _label);
    }

    // --- Round Management ---

    function startRound() external onlyOwner {
        require(
            currentState == ArenaState.IDLE || currentState == ArenaState.ENDED,
            "Cannot start round now"
        );

        roundNumber++;
        roundStartTime = block.timestamp;
        totalUpdates = 0;
        currentState = ArenaState.ACTIVE;

        emit RoundStarted(roundNumber, block.timestamp);
    }

    function endRound() external onlyOwner whenActive {
        currentState = ArenaState.ENDED;

        // Final leaderboard update
        uint256 currentPrice = PriceOracle(priceOracle).currentPrice();
        Leaderboard(leaderboard).updateRankings(currentPrice);

        emit RoundEnded(roundNumber, totalUpdates);
    }

    // --- Price Update (The Big Trigger) ---

    /**
     * @notice Update price and trigger the full reactive cascade:
     *         Oracle → All Strategies → Portfolio → Leaderboard
     */
    function triggerPriceUpdate(uint256 _newPrice) external onlyOwner whenActive {
        // 1. Update the price oracle
        PriceOracle(priceOracle).updatePrice(_newPrice);

        // 2. Portfolio manager triggers all strategies and recalculates
        uint256 updateId = PriceOracle(priceOracle).updateCount();
        PortfolioManager(portfolioManager).updatePositions(_newPrice, updateId);

        // 3. Leaderboard re-ranks
        Leaderboard(leaderboard).updateRankings(_newPrice);

        totalUpdates++;

        emit PriceUpdateTriggered(updateId, _newPrice);
    }

    /**
     * @notice Batch price updates for scenario simulation
     */
    function triggerScenario(uint256[] calldata _prices) external onlyOwner whenActive {
        for (uint256 i = 0; i < _prices.length; i++) {
            // Update oracle
            PriceOracle(priceOracle).updatePrice(_prices[i]);

            // Trigger cascade
            uint256 updateId = PriceOracle(priceOracle).updateCount();
            PortfolioManager(portfolioManager).updatePositions(_prices[i], updateId);
        }

        // Final leaderboard update after all prices
        uint256 lastPrice = _prices[_prices.length - 1];
        Leaderboard(leaderboard).updateRankings(lastPrice);

        totalUpdates += _prices.length;
    }

    // --- Admin Controls ---

    function pause() external onlyOwner whenActive {
        currentState = ArenaState.PAUSED;
        emit ArenaPaused();
    }

    function resume() external onlyOwner {
        require(currentState == ArenaState.PAUSED, "Not paused");
        currentState = ArenaState.ACTIVE;
        emit ArenaResumed();
    }

    /**
     * @notice Full arena reset for repeatable demos
     */
    function resetArena(uint256 _initialPrice) external onlyOwner {
        // Reset oracle
        PriceOracle(priceOracle).resetOracle(_initialPrice);

        // Reset all strategies
        for (uint256 i = 0; i < strategyAddresses.length; i++) {
            (bool success,) = strategyAddresses[i].call(
                abi.encodeWithSignature("resetStrategy()")
            );
            if (!success) {
                continue;
            }
        }

        // Reset leaderboard
        Leaderboard(leaderboard).resetLeaderboard();

        // Reset portfolio
        PortfolioManager(portfolioManager).resetPortfolio();

        // Reset arena state
        totalUpdates = 0;
        currentState = ArenaState.IDLE;

        emit ArenaReset();
    }

    // --- View Functions ---

    /**
     * @notice Get full system state in one call
     */
    function getSystemState() external view returns (
        ArenaState _state,
        uint256 _roundNumber,
        uint256 _totalUpdates,
        uint256 _currentPrice,
        uint256 _strategyCount,
        uint256 _roundStartTime
    ) {
        return (
            currentState,
            roundNumber,
            totalUpdates,
            PriceOracle(priceOracle).currentPrice(),
            strategyAddresses.length,
            roundStartTime
        );
    }

    function getStrategyAddresses() external view returns (address[] memory) {
        return strategyAddresses;
    }
}


