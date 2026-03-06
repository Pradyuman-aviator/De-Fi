const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Scenario Overflow Check", function () {
    it("Should not overflow during Flash Crash scenario", async function () {
        const [deployer] = await ethers.getSigners();

        // Deploy Core
        const INITIAL_PRICE = ethers.parseEther("1500");
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        const oracle = await PriceOracle.deploy(INITIAL_PRICE);

        const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
        const portfolio = await PortfolioManager.deploy(ethers.parseEther("10000"));

        const Leaderboard = await ethers.getContractFactory("Leaderboard");
        const leaderboard = await Leaderboard.deploy(portfolio.target);

        // Deploy Strategies
        const MomentumStrategy = await ethers.getContractFactory("MomentumStrategy");
        const momentum = await MomentumStrategy.deploy(oracle.target, 10, 200);

        const MeanReversionStrategy = await ethers.getContractFactory("MeanReversionStrategy");
        const meanRev = await MeanReversionStrategy.deploy(oracle.target, 20, 200);

        const ArbitrageStrategy = await ethers.getContractFactory("ArbitrageStrategy");
        const arb = await ArbitrageStrategy.deploy(oracle.target, 3, 15, 100);

        const RiskParityStrategy = await ethers.getContractFactory("RiskParityStrategy");
        const riskParity = await RiskParityStrategy.deploy(oracle.target, 15, 500, 10);

        const RLStrategy = await ethers.getContractFactory("RLStrategy");
        const rl = await RLStrategy.deploy(oracle.target, 100, 150);

        // Deploy Arena
        const ArenaCore = await ethers.getContractFactory("ArenaCore");
        const arena = await ArenaCore.deploy();

        // Wire
        await oracle.setArena(arena.target);
        await portfolio.setArena(arena.target);
        await leaderboard.setArena(arena.target);

        const strategies = [momentum, meanRev, arb, riskParity, rl];
        for (const s of strategies) {
            await s.setArena(arena.target);
            await s.setPortfolioManager(portfolio.target);
        }

        await arena.initialize(
            oracle.target,
            portfolio.target,
            leaderboard.target,
            strategies.map(s => s.target)
        );

        await arena.startRound();

        // Run Flash Crash Scenario
        const prices = [1500, 1480, 1420, 1300, 1200, 1180, 1220, 1280, 1350, 1320, 1380, 1400];
        const pricesWei = prices.map(p => ethers.parseEther(p.toString()));

        console.log("Triggering Scenario...");
        const tx = await arena.triggerScenario(pricesWei);
        await tx.wait();
        console.log("Success! No overflow.");
    });
});
