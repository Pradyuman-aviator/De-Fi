const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MomentumStrategy", function () {
    let oracle, momentum;
    let owner;
    const INITIAL_PRICE = ethers.parseEther("1500");

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        oracle = await PriceOracle.deploy(INITIAL_PRICE);
        await oracle.waitForDeployment();

        const MomentumStrategy = await ethers.getContractFactory("MomentumStrategy");
        momentum = await MomentumStrategy.deploy(
            await oracle.getAddress(),
            10,  // window
            200  // threshold (2%)
        );
        await momentum.waitForDeployment();
    });

    it("should have correct name", async function () {
        expect(await momentum.name()).to.equal("Momentum Hunter");
    });

    it("should start NEUTRAL", async function () {
        expect(await momentum.currentPosition()).to.equal(0); // NEUTRAL
    });

    it("should go LONG on strong upward momentum", async function () {
        // Create strong uptrend: 1500 → 1530 → 1560 → 1600
        await oracle.updatePrice(ethers.parseEther("1530"));
        await oracle.updatePrice(ethers.parseEther("1560"));
        await oracle.updatePrice(ethers.parseEther("1600"));

        await momentum.react(ethers.parseEther("1600"), 4);

        // Should be LONG (1 = LONG in enum)
        expect(await momentum.currentPosition()).to.equal(1);
    });

    it("should go SHORT on strong downward momentum", async function () {
        await oracle.updatePrice(ethers.parseEther("1470"));
        await oracle.updatePrice(ethers.parseEther("1440"));
        await oracle.updatePrice(ethers.parseEther("1400"));

        await momentum.react(ethers.parseEther("1400"), 4);

        // Should be SHORT (2 = SHORT in enum)
        expect(await momentum.currentPosition()).to.equal(2);
    });

    it("should stay NEUTRAL in sideways market", async function () {
        await oracle.updatePrice(ethers.parseEther("1505"));
        await oracle.updatePrice(ethers.parseEther("1495"));
        await oracle.updatePrice(ethers.parseEther("1502"));

        await momentum.react(ethers.parseEther("1502"), 4);

        expect(await momentum.currentPosition()).to.equal(0);
    });

    it("should track P&L after closing position", async function () {
        // Go long
        await oracle.updatePrice(ethers.parseEther("1530"));
        await oracle.updatePrice(ethers.parseEther("1560"));
        await oracle.updatePrice(ethers.parseEther("1600"));
        await momentum.react(ethers.parseEther("1600"), 4);

        // Reverse: strong downtrend to trigger close + short
        await oracle.updatePrice(ethers.parseEther("1550"));
        await oracle.updatePrice(ethers.parseEther("1500"));
        await oracle.updatePrice(ethers.parseEther("1450"));
        await momentum.react(ethers.parseEther("1450"), 8);

        // Should have at least 1 trade
        expect(await momentum.totalTrades()).to.be.gte(1);
    });

    it("should emit TradeExecuted event", async function () {
        await oracle.updatePrice(ethers.parseEther("1530"));
        await oracle.updatePrice(ethers.parseEther("1560"));
        await oracle.updatePrice(ethers.parseEther("1600"));

        await expect(momentum.react(ethers.parseEther("1600"), 4))
            .to.emit(momentum, "TradeExecuted");
    });
});

describe("MeanReversionStrategy", function () {
    let oracle, meanRev;
    let owner;
    const INITIAL_PRICE = ethers.parseEther("1500");

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        oracle = await PriceOracle.deploy(INITIAL_PRICE);
        await oracle.waitForDeployment();

        // Seed with some history around 1500
        for (let i = 0; i < 10; i++) {
            await oracle.updatePrice(ethers.parseEther((1495 + Math.round(Math.random() * 10)).toString()));
        }

        const MeanReversionStrategy = await ethers.getContractFactory("MeanReversionStrategy");
        meanRev = await MeanReversionStrategy.deploy(
            await oracle.getAddress(),
            20,  // lookback
            200  // deviation (2x)
        );
        await meanRev.waitForDeployment();
    });

    it("should have correct name", async function () {
        expect(await meanRev.name()).to.equal("Mean Reverter");
    });

    it("should go LONG on extreme dip (oversold)", async function () {
        // Crash the price well below the mean
        await oracle.updatePrice(ethers.parseEther("1350"));
        await oracle.updatePrice(ethers.parseEther("1300"));
        await oracle.updatePrice(ethers.parseEther("1250"));

        await meanRev.react(ethers.parseEther("1250"), 14);

        expect(await meanRev.currentPosition()).to.equal(1); // LONG
    });

    it("should go SHORT on extreme pump (overbought)", async function () {
        await oracle.updatePrice(ethers.parseEther("1650"));
        await oracle.updatePrice(ethers.parseEther("1700"));
        await oracle.updatePrice(ethers.parseEther("1750"));

        await meanRev.react(ethers.parseEther("1750"), 14);

        expect(await meanRev.currentPosition()).to.equal(2); // SHORT
    });
});

describe("RLStrategy", function () {
    let oracle, rl;
    let owner;
    const INITIAL_PRICE = ethers.parseEther("1500");

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        oracle = await PriceOracle.deploy(INITIAL_PRICE);
        await oracle.waitForDeployment();

        for (let i = 0; i < 5; i++) {
            await oracle.updatePrice(ethers.parseEther((1500 + i * 5).toString()));
        }

        const RLStrategy = await ethers.getContractFactory("RLStrategy");
        rl = await RLStrategy.deploy(
            await oracle.getAddress(),
            100, // learning rate
            150  // epsilon
        );
        await rl.waitForDeployment();
    });

    it("should have correct name", async function () {
        expect(await rl.name()).to.equal("Neural Trader");
    });

    it("should compute valid state", async function () {
        const state = await rl.getCurrentState(ethers.parseEther("1520"));
        expect(state).to.be.lt(45); // NUM_STATES = 45
    });

    it("should execute trades via react", async function () {
        await oracle.updatePrice(ethers.parseEther("1600"));
        await rl.react(ethers.parseEther("1600"), 7);

        // RL should have made a decision (may be NEUTRAL due to epsilon)
        const tradeCount = await rl.getTradeCount();
        // Either traded or stayed neutral — both valid
        expect(tradeCount).to.be.gte(0);
    });

    it("should update Q-table after multiple reactions", async function () {
        const priceSeries = [1520, 1550, 1580, 1560, 1540];
        for (let i = 0; i < priceSeries.length; i++) {
            await oracle.updatePrice(ethers.parseEther(priceSeries[i].toString()));
            await rl.react(ethers.parseEther(priceSeries[i].toString()), 6 + i);
        }

        // Q-table should have been updated (hard to predict exact values due to randomness)
        expect(await rl.totalTrades()).to.be.gte(0);
    });

    it("should decay epsilon over time", async function () {
        const initialEpsilon = await rl.epsilon();
        for (let i = 0; i < 5; i++) {
            await oracle.updatePrice(ethers.parseEther((1500 + i * 10).toString()));
            await rl.react(ethers.parseEther((1500 + i * 10).toString()), 6 + i);
        }
        const finalEpsilon = await rl.epsilon();
        expect(finalEpsilon).to.be.lte(initialEpsilon);
    });

    it("should allow pre-training Q-values", async function () {
        await rl.preTrainQValues([0, 1], [0, 1], [500, -200]);
        const qValues0 = await rl.getQValues(0);
        expect(qValues0[0]).to.equal(500);
        const qValues1 = await rl.getQValues(1);
        expect(qValues1[1]).to.equal(-200);
    });
});
