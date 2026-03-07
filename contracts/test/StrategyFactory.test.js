const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StrategyFactory + Public Registration", function () {
    let owner;
    let creator;
    let stranger;

    let oracle;
    let portfolio;
    let factory;

    const INITIAL_PRICE = ethers.parseEther("1500");
    const DEFAULT_CAPITAL = ethers.parseEther("10000");

    beforeEach(async function () {
        [owner, creator, stranger] = await ethers.getSigners();

        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        oracle = await PriceOracle.deploy(INITIAL_PRICE);
        await oracle.waitForDeployment();

        const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
        portfolio = await PortfolioManager.deploy(DEFAULT_CAPITAL);
        await portfolio.waitForDeployment();

        // Set arena just to mimic normal deployment wiring (optional for this test).
        await portfolio.setArena(owner.address);

        const StrategyFactory = await ethers.getContractFactory("StrategyFactory");
        factory = await StrategyFactory.deploy(
            await portfolio.getAddress(),
            await oracle.getAddress()
        );
        await factory.waitForDeployment();
    });

    it("allows public registration for valid strategy contracts", async function () {
        const MomentumStrategy = await ethers.getContractFactory("MomentumStrategy");
        const strategy = await MomentumStrategy.deploy(await oracle.getAddress(), 10, 200);
        await strategy.waitForDeployment();

        await portfolio.connect(stranger).registerStrategy(await strategy.getAddress());

        expect(await portfolio.getStrategyCount()).to.equal(1);
        expect(await portfolio.isRegistered(await strategy.getAddress())).to.equal(true);
    });

    it("rejects EOA registration", async function () {
        await expect(
            portfolio.connect(stranger).registerStrategy(stranger.address)
        ).to.be.revertedWith("Strategy must be contract");
    });

    it("rejects non-strategy contract registration", async function () {
        const ArenaCore = await ethers.getContractFactory("ArenaCore");
        const randomContract = await ArenaCore.deploy();
        await randomContract.waitForDeployment();

        await expect(
            portfolio.connect(stranger).registerStrategy(await randomContract.getAddress())
        ).to.be.revertedWith("Invalid strategy contract");
    });

    it("factory deploys and auto-registers momentum strategy", async function () {
        const tx = await factory.connect(creator).deployMomentumAgent("Creator Bot", 250);
        await tx.wait();

        const strategyAddresses = await portfolio.getStrategyAddresses();
        expect(strategyAddresses.length).to.equal(1);

        const deployedAddress = strategyAddresses[0];
        const strategy = await ethers.getContractAt("MomentumStrategy", deployedAddress);

        expect(await strategy.name()).to.equal("Creator Bot");
        expect(await strategy.momentumThreshold()).to.equal(250);
        expect(await strategy.portfolioManager()).to.equal(await portfolio.getAddress());
        expect(await strategy.owner()).to.equal(creator.address);
        expect(await portfolio.isRegistered(deployedAddress)).to.equal(true);
    });
});
