const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Integration Test: Full Reactive Cascade
 * Oracle → All 5 Strategies → PortfolioManager → Leaderboard
 * 
 * This test proves the entire system works end-to-end.
 */
describe("Full Arena Integration", function () {
    let oracle, portfolio, leaderboard, arenaCore;
    let momentum, meanRev, arb, riskParity, rl;
    let owner;
    const INITIAL_PRICE = ethers.parseEther("1500");
    const DEFAULT_CAPITAL = ethers.parseEther("10000");

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        // Deploy PriceOracle
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        oracle = await PriceOracle.deploy(INITIAL_PRICE);
        await oracle.waitForDeployment();

        // Deploy PortfolioManager
        const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
        portfolio = await PortfolioManager.deploy(DEFAULT_CAPITAL);
        await portfolio.waitForDeployment();

        // Deploy Leaderboard
        const Leaderboard = await ethers.getContractFactory("Leaderboard");
        leaderboard = await Leaderboard.deploy(await portfolio.getAddress());
        await leaderboard.waitForDeployment();

        // Deploy Strategies
        const oracleAddr = await oracle.getAddress();

        const MomentumStrategy = await ethers.getContractFactory("MomentumStrategy");
        momentum = await MomentumStrategy.deploy(oracleAddr, 10, 200);
        await momentum.waitForDeployment();

        const MeanReversionStrategy = await ethers.getContractFactory("MeanReversionStrategy");
        meanRev = await MeanReversionStrategy.deploy(oracleAddr, 20, 200);
        await meanRev.waitForDeployment();

        const ArbitrageStrategy = await ethers.getContractFactory("ArbitrageStrategy");
        arb = await ArbitrageStrategy.deploy(oracleAddr, 3, 15, 100);
        await arb.waitForDeployment();

        const RiskParityStrategy = await ethers.getContractFactory("RiskParityStrategy");
        riskParity = await RiskParityStrategy.deploy(oracleAddr, 15, 500, 10);
        await riskParity.waitForDeployment();

        const RLStrategy = await ethers.getContractFactory("RLStrategy");
        rl = await RLStrategy.deploy(oracleAddr, 100, 150);
        await rl.waitForDeployment();

        // Deploy ArenaCore
        const ArenaCore = await ethers.getContractFactory("ArenaCore");
        arenaCore = await ArenaCore.deploy();
        await arenaCore.waitForDeployment();

        const arenaCoreAddr = await arenaCore.getAddress();

        // Wire everything
        const strategyAddresses = [
            await momentum.getAddress(),
            await meanRev.getAddress(),
            await arb.getAddress(),
            await riskParity.getAddress(),
            await rl.getAddress(),
        ];

        await oracle.setArena(arenaCoreAddr);
        await portfolio.setArena(arenaCoreAddr);
        await leaderboard.setArena(arenaCoreAddr);

        for (const addr of strategyAddresses) {
            const strat = await ethers.getContractAt("StrategyBase", addr);
            await strat.setArena(arenaCoreAddr);
            await strat.setPortfolioManager(await portfolio.getAddress());
        }

        await arenaCore.initialize(
            oracleAddr,
            await portfolio.getAddress(),
            await leaderboard.getAddress(),
            strategyAddresses
        );

        // Start round
        await arenaCore.startRound();
    });

    it("should deploy and initialize all contracts", async function () {
        const state = await arenaCore.getSystemState();
        expect(state[0]).to.equal(1); // ACTIVE
        expect(state[4]).to.equal(5); // 5 strategies
        expect(state[3]).to.equal(INITIAL_PRICE); // current price
    });

    it("should trigger full cascade on single price update", async function () {
        await arenaCore.triggerPriceUpdate(ethers.parseEther("1550"));

        // Check price updated
        expect(await oracle.currentPrice()).to.equal(ethers.parseEther("1550"));

        // Check system state
        const state = await arenaCore.getSystemState();
        expect(state[2]).to.equal(1); // 1 total update

        // Check leaderboard has rankings
        const rankCount = await leaderboard.getRankingCount();
        expect(rankCount).to.equal(5);
    });

    it("should handle Flash Crash scenario (multiple updates)", async function () {
        const flashCrashPrices = [
            ethers.parseEther("1480"),
            ethers.parseEther("1420"),
            ethers.parseEther("1300"),
            ethers.parseEther("1200"),
            ethers.parseEther("1250"),
            ethers.parseEther("1350"),
        ];

        await arenaCore.triggerScenario(flashCrashPrices);

        // Price should be last in series
        expect(await oracle.currentPrice()).to.equal(ethers.parseEther("1350"));

        // Updates should be tracked
        const state = await arenaCore.getSystemState();
        expect(state[2]).to.equal(6);

        // Agents should have made decisions
        const stats = await portfolio.getAllAgentStats(ethers.parseEther("1350"));
        expect(stats.length).to.equal(5);

        // At least some agents should have traded
        let totalTrades = 0;
        for (const agent of stats) {
            totalTrades += Number(agent.totalTrades);
        }
        expect(totalTrades).to.be.gt(0);
    });

    it("should update leaderboard with correct rankings", async function () {
        // Run through a scenario
        const prices = [
            ethers.parseEther("1480"),
            ethers.parseEther("1420"),
            ethers.parseEther("1300"),
            ethers.parseEther("1200"),
            ethers.parseEther("1250"),
            ethers.parseEther("1350"),
            ethers.parseEther("1400"),
            ethers.parseEther("1500"),
        ];

        for (const price of prices) {
            await arenaCore.triggerPriceUpdate(price);
        }

        // Get leaderboard
        const rankings = await leaderboard.getAllRankings();
        expect(rankings.length).to.equal(5);

        // Rank 1 should have highest P&L
        if (rankings.length >= 2) {
            expect(rankings[0].totalPnL).to.be.gte(rankings[1].totalPnL);
        }
    });

    it("should reset arena completely for repeatable demos", async function () {
        // Run some updates
        await arenaCore.triggerPriceUpdate(ethers.parseEther("1600"));
        await arenaCore.triggerPriceUpdate(ethers.parseEther("1700"));

        // Reset
        await arenaCore.resetArena(INITIAL_PRICE);

        // Verify reset
        expect(await oracle.currentPrice()).to.equal(INITIAL_PRICE);
        expect(await oracle.updateCount()).to.equal(0);

        // Strategies should be reset
        expect(await momentum.totalPnL()).to.equal(0);
        expect(await momentum.totalTrades()).to.equal(0);
        expect(await momentum.currentPosition()).to.equal(0); // NEUTRAL
    });

    it("should get all agent stats in one call", async function () {
        await arenaCore.triggerPriceUpdate(ethers.parseEther("1550"));

        const stats = await portfolio.getAllAgentStats(ethers.parseEther("1550"));
        expect(stats.length).to.equal(5);

        // Each stat should have valid data
        for (const agent of stats) {
            expect(agent.strategyAddress).to.not.equal(ethers.ZeroAddress);
            expect(agent.name).to.not.equal("");
            expect(agent.winRate).to.be.lte(100);
        }
    });

    it("should allow pausing and resuming", async function () {
        await arenaCore.pause();
        const state1 = await arenaCore.getSystemState();
        expect(state1[0]).to.equal(2); // PAUSED

        // Should reject updates when paused
        await expect(
            arenaCore.triggerPriceUpdate(ethers.parseEther("1600"))
        ).to.be.revertedWith("Arena not active");

        await arenaCore.resume();
        const state2 = await arenaCore.getSystemState();
        expect(state2[0]).to.equal(1); // ACTIVE

        // Should work again
        await arenaCore.triggerPriceUpdate(ethers.parseEther("1600"));
        expect(await oracle.currentPrice()).to.equal(ethers.parseEther("1600"));
    });

    it("should handle portfolio summary correctly", async function () {
        await arenaCore.triggerPriceUpdate(ethers.parseEther("1600"));
        await arenaCore.triggerPriceUpdate(ethers.parseEther("1500"));
        await arenaCore.triggerPriceUpdate(ethers.parseEther("1400"));

        const summary = await portfolio.getPortfolioSummary(ethers.parseEther("1400"));
        expect(summary._strategyCount).to.equal(5);
        expect(summary._totalCapital).to.equal(DEFAULT_CAPITAL * BigInt(5));
    });
});
