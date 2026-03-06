const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("PriceOracle", function () {
    let oracle;
    let owner;
    let addr1;
    const INITIAL_PRICE = ethers.parseEther("1500");

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        oracle = await PriceOracle.deploy(INITIAL_PRICE);
        await oracle.waitForDeployment();
    });

    describe("Initialization", function () {
        it("should set initial price correctly", async function () {
            expect(await oracle.currentPrice()).to.equal(INITIAL_PRICE);
        });

        it("should set owner correctly", async function () {
            expect(await oracle.owner()).to.equal(owner.address);
        });

        it("should initialize history with one entry", async function () {
            expect(await oracle.historyCount()).to.equal(1);
        });

        it("should start with updateCount = 0", async function () {
            expect(await oracle.updateCount()).to.equal(0);
        });
    });

    describe("Price Updates", function () {
        it("should update price successfully", async function () {
            const newPrice = ethers.parseEther("1600");
            await oracle.updatePrice(newPrice);
            expect(await oracle.currentPrice()).to.equal(newPrice);
        });

        it("should increment updateCount", async function () {
            await oracle.updatePrice(ethers.parseEther("1600"));
            expect(await oracle.updateCount()).to.equal(1);
            await oracle.updatePrice(ethers.parseEther("1700"));
            expect(await oracle.updateCount()).to.equal(2);
        });

        it("should emit PriceUpdated event", async function () {
            const newPrice = ethers.parseEther("1600");
            await expect(oracle.updatePrice(newPrice))
                .to.emit(oracle, "PriceUpdated")
                .withArgs(
                    1, // updateId
                    newPrice, // newPrice
                    INITIAL_PRICE, // oldPrice
                    newPrice - INITIAL_PRICE, // priceChange
                    anyValue, // volatility is computed from updated history
                    anyValue // timestamp depends on mined block time
                );
        });

        it("should reject zero price", async function () {
            await expect(oracle.updatePrice(0)).to.be.revertedWith("Price must be > 0");
        });

        it("should reject unauthorized callers", async function () {
            await expect(
                oracle.connect(addr1).updatePrice(ethers.parseEther("1600"))
            ).to.be.revertedWith("Not authorized");
        });

        it("should store price in history", async function () {
            await oracle.updatePrice(ethers.parseEther("1600"));
            await oracle.updatePrice(ethers.parseEther("1700"));
            const history = await oracle.getPriceHistory(3);
            expect(history.length).to.equal(3);
            expect(history[0]).to.equal(INITIAL_PRICE);
            expect(history[1]).to.equal(ethers.parseEther("1600"));
            expect(history[2]).to.equal(ethers.parseEther("1700"));
        });
    });

    describe("Batch Updates", function () {
        it("should process multiple prices", async function () {
            const prices = [
                ethers.parseEther("1480"),
                ethers.parseEther("1420"),
                ethers.parseEther("1200"),
            ];
            await oracle.batchUpdatePrices(prices);
            expect(await oracle.currentPrice()).to.equal(ethers.parseEther("1200"));
            expect(await oracle.updateCount()).to.equal(3);
        });
    });

    describe("Price History", function () {
        it("should return correct history length", async function () {
            for (let i = 0; i < 5; i++) {
                await oracle.updatePrice(ethers.parseEther((1500 + i * 10).toString()));
            }
            const history = await oracle.getPriceHistory(3);
            expect(history.length).to.equal(3);
        });

        it("should handle requesting more than available", async function () {
            const history = await oracle.getPriceHistory(50);
            expect(history.length).to.equal(1); // Only initial price
        });
    });

    describe("Volatility", function () {
        it("should return 0 for single price", async function () {
            expect(await oracle.getVolatility()).to.equal(0);
        });

        it("should calculate non-zero volatility after price changes", async function () {
            await oracle.updatePrice(ethers.parseEther("1600"));
            await oracle.updatePrice(ethers.parseEther("1400"));
            await oracle.updatePrice(ethers.parseEther("1550"));
            const vol = await oracle.getVolatility();
            expect(vol).to.be.gt(0);
        });
    });

    describe("Moving Average", function () {
        it("should calculate correct moving average", async function () {
            await oracle.updatePrice(ethers.parseEther("1600"));
            // MA of 2 = (1500 + 1600) / 2 = 1550
            const ma = await oracle.getMovingAverage(2);
            expect(ma).to.equal(ethers.parseEther("1550"));
        });
    });

    describe("Admin Functions", function () {
        it("should reset oracle state", async function () {
            await oracle.updatePrice(ethers.parseEther("1600"));
            await oracle.updatePrice(ethers.parseEther("1700"));
            await oracle.resetOracle(INITIAL_PRICE);
            expect(await oracle.currentPrice()).to.equal(INITIAL_PRICE);
            expect(await oracle.updateCount()).to.equal(0);
            expect(await oracle.historyCount()).to.equal(1);
        });

        it("should set arena address", async function () {
            await oracle.setArena(addr1.address);
            expect(await oracle.arena()).to.equal(addr1.address);
        });

        it("should allow arena to update price", async function () {
            await oracle.setArena(addr1.address);
            await oracle.connect(addr1).updatePrice(ethers.parseEther("1600"));
            expect(await oracle.currentPrice()).to.equal(ethers.parseEther("1600"));
        });
    });
});

