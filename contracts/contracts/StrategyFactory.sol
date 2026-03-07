// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StrategyBase.sol";
import "./strategies/MomentumStrategy.sol";
import "./strategies/MeanReversionStrategy.sol";

interface IPortfolioManagerFactory {
    function registerStrategy(address _strategy) external;
    function arena() external view returns (address);
}

/**
 * @title StrategyFactory
 * @notice No-code deployment factory for user-created agents.
 *         Deploys strategy contracts and auto-registers them into PortfolioManager.
 */
contract StrategyFactory {
    address public owner;
    address public immutable portfolioManager;
    address public immutable priceOracle;

    uint256 public defaultMomentumWindow = 10;
    uint256 public defaultMeanReversionLookback = 20;

    event MomentumAgentDeployed(
        address indexed creator,
        address indexed strategy,
        string name,
        uint256 thresholdBps,
        uint256 timestamp
    );

    event MeanReversionAgentDeployed(
        address indexed creator,
        address indexed strategy,
        string name,
        uint256 deviationMultiple,
        uint256 timestamp
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _portfolioManager, address _priceOracle) {
        require(_portfolioManager != address(0), "Invalid portfolio manager");
        require(_priceOracle != address(0), "Invalid price oracle");

        owner = msg.sender;
        portfolioManager = _portfolioManager;
        priceOracle = _priceOracle;
    }

    function deployMomentumAgent(
        string memory _name,
        uint256 _thresholdBps
    ) external returns (address strategyAddress) {
        require(bytes(_name).length > 0, "Name required");

        uint256 threshold = _thresholdBps > 0 ? _thresholdBps : 200;

        MomentumStrategy strategy = new MomentumStrategy(
            priceOracle,
            defaultMomentumWindow,
            threshold
        );

        _wireAndRegisterStrategy(strategy, _name, msg.sender);

        emit MomentumAgentDeployed(msg.sender, address(strategy), _name, threshold, block.timestamp);
        return address(strategy);
    }

    function deployMeanReversionAgent(
        string memory _name,
        uint256 _deviationMultiple
    ) external returns (address strategyAddress) {
        require(bytes(_name).length > 0, "Name required");

        uint256 deviation = _deviationMultiple > 0 ? _deviationMultiple : 200;

        MeanReversionStrategy strategy = new MeanReversionStrategy(
            priceOracle,
            defaultMeanReversionLookback,
            deviation
        );

        _wireAndRegisterStrategy(strategy, _name, msg.sender);

        emit MeanReversionAgentDeployed(msg.sender, address(strategy), _name, deviation, block.timestamp);
        return address(strategy);
    }

    function _wireAndRegisterStrategy(
        StrategyBase _strategy,
        string memory _name,
        address _creator
    ) internal {
        _strategy.setName(_name);

        address arenaAddress = IPortfolioManagerFactory(portfolioManager).arena();
        if (arenaAddress != address(0)) {
            _strategy.setArena(arenaAddress);
        }

        _strategy.setPortfolioManager(portfolioManager);
        IPortfolioManagerFactory(portfolioManager).registerStrategy(address(_strategy));
        _strategy.transferOwnership(_creator);
    }

    function setDefaultMomentumWindow(uint256 _window) external onlyOwner {
        require(_window > 1, "Window too small");
        defaultMomentumWindow = _window;
    }

    function setDefaultMeanReversionLookback(uint256 _lookback) external onlyOwner {
        require(_lookback > 1, "Lookback too small");
        defaultMeanReversionLookback = _lookback;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
}
