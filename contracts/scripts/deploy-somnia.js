const { ethers } = require("hardhat");

/**
 * Somnia Testnet Deployment Script
 * Deploys all DeFi Strategy Arena contracts + ReactiveStrategyHandler
 * 
 * Usage: npx hardhat run scripts/deploy-somnia.js --network somnia
 * 
 * NOTE: Somnia gas model differs significantly from Ethereum:
 *  - Cold SLOAD: ~1,000,100 gas (vs 2,100 on ETH)
 *  - New storage slot: ~200,100 gas (vs 22,100 on ETH)
 *  - Contract bytecode: 3,125 gas/byte (vs 200 on ETH)
 *  Higher gas limits are set accordingly.
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying to Somnia Testnet with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "STT");

    if (balance < ethers.parseEther("10")) {
        console.error("WARNING: Low balance. Need at least 10 STT for deployment.");
    }

    const INITIAL_PRICE = ethers.parseEther("1500"); // $1500 starting price
    const DEFAULT_CAPITAL = ethers.parseEther("10000"); // $10K per agent

    console.log("\n========================================");
    console.log("  DEPLOYING DEFI STRATEGY ARENA");
    console.log("  Network: Somnia Testnet (Chain ID 50312)");
    console.log("========================================\n");

    // --- Deploy Core Contracts ---

    console.log("1/9  Deploying PriceOracle...");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const oracle = await PriceOracle.deploy(INITIAL_PRICE);
    await oracle.waitForDeployment();
    const oracleAddr = await oracle.getAddress();
    console.log("     PriceOracle:", oracleAddr);

    console.log("2/9  Deploying PortfolioManager...");
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolio = await PortfolioManager.deploy(DEFAULT_CAPITAL);
    await portfolio.waitForDeployment();
    const portfolioAddr = await portfolio.getAddress();
    console.log("     PortfolioManager:", portfolioAddr);

    console.log("3/9  Deploying Leaderboard...");
    const LeaderboardFactory = await ethers.getContractFactory("Leaderboard");
    const leaderboard = await LeaderboardFactory.deploy(portfolioAddr);
    await leaderboard.waitForDeployment();
    const leaderboardAddr = await leaderboard.getAddress();
    console.log("     Leaderboard:", leaderboardAddr);

    // --- Deploy Strategy Contracts ---

    console.log("4/9  Deploying MomentumStrategy...");
    const MomentumStrategy = await ethers.getContractFactory("MomentumStrategy");
    const momentum = await MomentumStrategy.deploy(oracleAddr, 10, 200);
    await momentum.waitForDeployment();
    console.log("     MomentumStrategy:", await momentum.getAddress());

    console.log("5/9  Deploying MeanReversionStrategy...");
    const MeanReversionStrategy = await ethers.getContractFactory("MeanReversionStrategy");
    const meanRev = await MeanReversionStrategy.deploy(oracleAddr, 20, 200);
    await meanRev.waitForDeployment();
    console.log("     MeanReversionStrategy:", await meanRev.getAddress());

    console.log("6/9  Deploying ArbitrageStrategy...");
    const ArbitrageStrategy = await ethers.getContractFactory("ArbitrageStrategy");
    const arb = await ArbitrageStrategy.deploy(oracleAddr, 3, 15, 100);
    await arb.waitForDeployment();
    console.log("     ArbitrageStrategy:", await arb.getAddress());

    console.log("7/9  Deploying RiskParityStrategy...");
    const RiskParityStrategy = await ethers.getContractFactory("RiskParityStrategy");
    const riskParity = await RiskParityStrategy.deploy(oracleAddr, 15, 500, 10);
    await riskParity.waitForDeployment();
    console.log("     RiskParityStrategy:", await riskParity.getAddress());

    console.log("8/9  Deploying RLStrategy...");
    const RLStrategy = await ethers.getContractFactory("RLStrategy");
    const rl = await RLStrategy.deploy(oracleAddr, 100, 150);
    await rl.waitForDeployment();
    console.log("     RLStrategy:", await rl.getAddress());

    // --- Deploy Orchestrator & Factory ---

    console.log("9/10 Deploying ArenaCore...");
    const ArenaCore = await ethers.getContractFactory("ArenaCore");
    const arenaCore = await ArenaCore.deploy();
    await arenaCore.waitForDeployment();
    const arenaCoreAddr = await arenaCore.getAddress();
    console.log("     ArenaCore:", arenaCoreAddr);

    console.log("10/10 Deploying StrategyFactory...");
    const StrategyFactoryContract = await ethers.getContractFactory("StrategyFactory");
    const strategyFactory = await StrategyFactoryContract.deploy(arenaCoreAddr, oracleAddr);
    await strategyFactory.waitForDeployment();
    const strategyFactoryAddr = await strategyFactory.getAddress();
    console.log("     StrategyFactory:", strategyFactoryAddr);

    // --- Wire Everything Together ---

    console.log("\n--- Wiring Contracts ---\n");

    const strategyAddresses = [
        await momentum.getAddress(),
        await meanRev.getAddress(),
        await arb.getAddress(),
        await riskParity.getAddress(),
        await rl.getAddress(),
    ];

    console.log("Setting arena on PriceOracle...");
    let tx = await oracle.setArena(arenaCoreAddr);
    await tx.wait();

    console.log("Setting arena on PortfolioManager...");
    tx = await portfolio.setArena(arenaCoreAddr);
    await tx.wait();

    console.log("Setting arena on Leaderboard...");
    tx = await leaderboard.setArena(arenaCoreAddr);
    await tx.wait();

    console.log("Setting arena on all strategies...");
    for (const addr of strategyAddresses) {
        const strat = await ethers.getContractAt("StrategyBase", addr);
        tx = await strat.setArena(arenaCoreAddr);
        await tx.wait();
        tx = await strat.setPortfolioManager(portfolioAddr);
        await tx.wait();
    }

    console.log("Initializing ArenaCore...");
    tx = await arenaCore.initialize(
        oracleAddr,
        portfolioAddr,
        leaderboardAddr,
        strategyAddresses
    );
    await tx.wait();

    // --- Deploy Reactive Handler (Somnia-specific) ---

    console.log("\n--- Deploying ReactiveStrategyHandler (Somnia Reactivity) ---\n");

    let reactiveHandlerAddr = "N/A";
    try {
        const ReactiveHandler = await ethers.getContractFactory("ReactiveStrategyHandler");
        const reactiveHandler = await ReactiveHandler.deploy(
            oracleAddr,
            portfolioAddr,
            leaderboardAddr
        );
        await reactiveHandler.waitForDeployment();
        reactiveHandlerAddr = await reactiveHandler.getAddress();

        tx = await portfolio.setReactiveHandler(reactiveHandlerAddr);
        await tx.wait();
        tx = await leaderboard.setReactiveHandler(reactiveHandlerAddr);
        await tx.wait();
        console.log("     ReactiveStrategyHandler:", reactiveHandlerAddr);
        console.log("     ↳ This handler listens for PriceUpdated events via Somnia Reactivity");
        console.log("     ↳ Create a subscription via @somnia-chain/reactivity SDK to activate");
    } catch (err) {
        console.log("     ⚠ ReactiveStrategyHandler deployment skipped (reactivity contracts may not be available)");
        console.log("     ↳ Error:", err.message?.slice(0, 100));
    }

    // --- Quick Smoke Test ---

    console.log("\n--- Smoke Test ---\n");

    tx = await arenaCore.startRound();
    await tx.wait();
    console.log("✓ Round started");

    tx = await arenaCore.triggerPriceUpdate(ethers.parseEther("1520"));
    await tx.wait();
    console.log("✓ Price updated to $1520 — cascade triggered");

    const systemState = await arenaCore.getSystemState();
    console.log("✓ Arena state:", ["IDLE", "ACTIVE", "PAUSED", "ENDED"][Number(systemState[0])]);
    console.log("✓ Total updates:", systemState[2].toString());
    console.log("✓ Current price:", ethers.formatEther(systemState[3]));

    // --- Output Addresses ---

    const addresses = {
        network: "Somnia Testnet",
        chainId: 50312,
        deployer: deployer.address,
        contracts: {
            PriceOracle: oracleAddr,
            PortfolioManager: portfolioAddr,
            Leaderboard: leaderboardAddr,
            ArenaCore: arenaCoreAddr,
            StrategyFactory: strategyFactoryAddr,
            ReactiveStrategyHandler: reactiveHandlerAddr,
            strategies: {
                MomentumStrategy: await momentum.getAddress(),
                MeanReversionStrategy: await meanRev.getAddress(),
                ArbitrageStrategy: await arb.getAddress(),
                RiskParityStrategy: await riskParity.getAddress(),
                RLStrategy: await rl.getAddress(),
            },
        },
        explorer: "https://shannon-explorer.somnia.network",
    };

    console.log("\n========================================");
    console.log("  DEPLOYMENT COMPLETE");
    console.log("========================================\n");
    console.log(JSON.stringify(addresses, null, 2));

    // Save to file
    const fs = require("fs");
    const path = require("path");
    const outDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
        path.join(outDir, "somnia-testnet.json"),
        JSON.stringify(addresses, null, 2)
    );
    console.log("\n✅ Addresses saved to deployments/somnia-testnet.json");
    console.log(`\n🔍 Verify contracts at: ${addresses.explorer}`);

    const finalBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`\n💰 Remaining balance: ${ethers.formatEther(finalBalance)} STT`);
    console.log(`   Gas used: ${ethers.formatEther(balance - finalBalance)} STT`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("DEPLOYMENT FAILED:", error);
        process.exit(1);
    });

