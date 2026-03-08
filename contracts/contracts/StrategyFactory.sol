// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StrategyBase.sol";
import "./strategies/MomentumStrategy.sol";
import "./strategies/MeanReversionStrategy.sol";
import "./strategies/ArbitrageStrategy.sol";
import "./strategies/RiskParityStrategy.sol";

interface IArenaCoreFactory {
    function registerUserStrategy(address _strategy, address _owner, string memory _label) external;
}

/**
 * @title StrategyFactory
 * @notice Factory for AI-generated and custom agents.
 *         Accepts plain English parsed parameters to deploy and auto-register agents.
 */
contract StrategyFactory {
    address public owner;
    address public immutable arenaCore;
    address public immutable priceOracle;

    mapping(address => address) public ownerToStrategy;

    enum StrategyTypeEnum { MOMENTUM, MEAN_REVERT, SPREAD, RISK_PARITY }
    enum RiskLevel { LOW, MEDIUM, HIGH }

    event AgentDeployed(address indexed creator, address indexed strategy, string name, string strategyType, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _arenaCore, address _priceOracle) {
        require(_arenaCore != address(0), "Invalid arena core");
        require(_priceOracle != address(0), "Invalid price oracle");

        owner = msg.sender;
        arenaCore = _arenaCore;
        priceOracle = _priceOracle;
    }

    /**
     * @notice Universal deployment method called via Frontend/AI Parser
     */
    function deployAgent(
        uint8 _strategyType,
        uint256 _threshold,
        uint8 _riskLevel,
        uint256 _positionSize,
        uint256 _lookbackWindow,
        string memory _label
    ) external returns (address strategyAddress) {
        require(ownerToStrategy[msg.sender] == address(0), "Only one agent per wallet allowed");
        require(bytes(_label).length > 0, "Agent name required");

        uint256 posSizeEthers = _positionSize * 1 ether;
        if (posSizeEthers == 0) posSizeEthers = 500 ether;

        StrategyBase newStrategy;

        // Map Risk Level to Stop Loss settings (in basis points)
        // LOW = 2%, MEDIUM = 5%, HIGH = 8%
        uint256 stopLoss;
        if (_riskLevel == uint8(RiskLevel.LOW)) stopLoss = 200;
        else if (_riskLevel == uint8(RiskLevel.MEDIUM)) stopLoss = 500;
        else stopLoss = 800;
        
        // Ensure defaults if missing
        uint256 lookback = _lookbackWindow > 1 ? _lookbackWindow : 10;
        uint256 threshold = _threshold > 10 ? _threshold : 200;

        string memory typeLabel;

        // Map frontend requests to the 4 underlying logic contracts
        if (_strategyType == uint8(StrategyTypeEnum.MOMENTUM)) {
            newStrategy = new MomentumStrategy(priceOracle, lookback, threshold);
            typeLabel = "MOMENTUM";
            
        } else if (_strategyType == uint8(StrategyTypeEnum.MEAN_REVERT)) {
            newStrategy = new MeanReversionStrategy(priceOracle, lookback, threshold);
            typeLabel = "MEAN_REVERT";
            
        } else if (_strategyType == uint8(StrategyTypeEnum.SPREAD)) {
            newStrategy = new ArbitrageStrategy(priceOracle, lookback / 2, lookback, threshold);
            typeLabel = "SPREAD";
            
        } else if (_strategyType == uint8(StrategyTypeEnum.RISK_PARITY)) {
            newStrategy = new RiskParityStrategy(priceOracle, lookback, threshold, lookback / 2);
            typeLabel = "RISK_PARITY";
            
        } else {
            revert("Unknown Strategy Type");
        }

        // Apply configuration and finalize wiring
        newStrategy.updateConfig(posSizeEthers * 2, stopLoss, posSizeEthers);
        newStrategy.setName(_label);
        newStrategy.setArena(arenaCore);
        newStrategy.transferOwnership(msg.sender);

        // Core registration triggers PortfolioManager and Leaderboard tracking
        IArenaCoreFactory(arenaCore).registerUserStrategy(address(newStrategy), msg.sender, _label);

        ownerToStrategy[msg.sender] = address(newStrategy);

        emit AgentDeployed(msg.sender, address(newStrategy), _label, typeLabel, block.timestamp);
        return address(newStrategy);
    }

    // --- Admin ---

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
}
