// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./somnia/SomniaEventHandler.sol";
import "./StrategyBase.sol";

interface IPortfolioManagerReactive {
    function updatePositions(uint256 _currentPrice, uint256 _updateId) external;
}

interface ILeaderboardReactive {
    function updateRankings(uint256 _currentPrice) external;
}

interface IPriceOracleReactive {
    function currentPrice() external view returns (uint256);
    function updateCount() external view returns (uint256);
}

/**
 * @title ReactiveStrategyHandler
 * @notice Somnia Reactivity handler that listens to PriceUpdated events from PriceOracle
 *         and triggers the full strategy cascade automatically via validator execution.
 * @dev Inherits SomniaEventHandler; only the Reactivity precompile (0x0100) can call onEvent.
 *      When PriceOracle emits PriceUpdated, validators invoke this handler which then:
 *      1. Triggers all strategies via PortfolioManager.updatePositions()
 *      2. Updates the Leaderboard rankings
 *      This is the "true reactive cascade" — no manual triggerPriceUpdate() needed.
 *      Somnia gas note: keep handler logic minimal to stay within gasLimit.
 */
contract ReactiveStrategyHandler is SomniaEventHandler {
    /// @notice Emitted when the reactive cascade completes successfully.
    /// @param price The price that triggered the cascade.
    /// @param updateId The oracle update sequence number.
    event ReactiveCascadeTriggered(uint256 indexed price, uint256 indexed updateId);

    /// @notice Thrown when the emitter is not the expected PriceOracle contract.
    /// @param emitter The address that emitted the event.
    error UnexpectedEmitter(address emitter);

    /// @notice The PriceOracle contract whose PriceUpdated events this handler monitors.
    address public immutable priceOracle;

    /// @notice The PortfolioManager that triggers all strategies.
    address public immutable portfolioManager;

    /// @notice The Leaderboard that re-ranks agents.
    address public immutable leaderboard;

    /// @notice The deployer/owner of this handler.
    address public immutable owner;

    /// @notice keccak256("PriceUpdated(uint256,uint256,uint256,int256,uint256,uint256)")
    bytes32 public constant PRICE_UPDATED_TOPIC = keccak256("PriceUpdated(uint256,uint256,uint256,int256,uint256,uint256)");

    /// @param _priceOracle Address of the PriceOracle contract.
    /// @param _portfolioManager Address of the PortfolioManager contract.
    /// @param _leaderboard Address of the Leaderboard contract.
    constructor(
        address _priceOracle,
        address _portfolioManager,
        address _leaderboard
    ) {
        priceOracle = _priceOracle;
        portfolioManager = _portfolioManager;
        leaderboard = _leaderboard;
        owner = msg.sender;
    }

    /// @inheritdoc SomniaEventHandler
    /// @notice Processes incoming PriceUpdated events and triggers the full cascade.
    /// @dev Decodes PriceUpdated event data and calls PortfolioManager + Leaderboard.
    ///      WARNING: This handler emits ReactiveCascadeTriggered — ensure your subscription
    ///      filters only PriceOracle events to avoid infinite loops.
    /// @dev Reverts with `UnexpectedEmitter` if the emitting contract is not the PriceOracle.
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // Only react to PriceOracle events
        if (emitter != priceOracle) revert UnexpectedEmitter(emitter);

        // Decode PriceUpdated event data:
        // PriceUpdated(uint256 indexed updateId, uint256 newPrice, uint256 oldPrice,
        //              int256 priceChange, uint256 volatility, uint256 timestamp)
        // eventTopics[0] = event signature hash
        // eventTopics[1] = indexed updateId
        // data = abi.encode(newPrice, oldPrice, priceChange, volatility, timestamp)
        uint256 updateId = uint256(eventTopics[1]);
        (uint256 newPrice,,,,) = abi.decode(data, (uint256, uint256, int256, uint256, uint256));

        // Trigger the cascade:
        // 1. PortfolioManager calls react() on all strategies + recalculates P&L
        IPortfolioManagerReactive(portfolioManager).updatePositions(newPrice, updateId);

        // 2. Leaderboard re-ranks based on updated P&L
        ILeaderboardReactive(leaderboard).updateRankings(newPrice);

        emit ReactiveCascadeTriggered(newPrice, updateId);
    }
}
