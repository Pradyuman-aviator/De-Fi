const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    const INITIAL_PRICE = ethers.parseEther("1500"); // $1500 starting price
    const DEFAULT_CAPITAL = ethers.parseEther("10000"); // $10K per agent

    console.log("\n=== DEPLOYING DEFI STRATEGY ARENA ===\n");

    // 1. Deploy PriceOracle
    console.log("1/8 Deploying PriceOracle...");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const oracle = await PriceOracle.deploy(INITIAL_PRICE);
    await oracle.waitForDeployment();
    console.log("   PriceOracle:", await oracle.getAddress());

    // 2. Deploy PortfolioManager
    console.log("2/8 Deploying PortfolioManager...");
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolio = await PortfolioManager.deploy(DEFAULT_CAPITAL);
    await portfolio.waitForDeployment();
    console.log("   PortfolioManager:", await portfolio.getAddress());

    // 3. Deploy Leaderboard
    console.log("3/8 Deploying Leaderboard...");
    const LeaderboardFactory = await ethers.getContractFactory("Leaderboard");
    const leaderboard = await LeaderboardFactory.deploy(await portfolio.getAddress());
    await leaderboard.waitForDeployment();
    console.log("   Leaderboard:", await leaderboard.getAddress());

    // 4. Deploy Strategy Contracts
    const oracleAddr = await oracle.getAddress();

    console.log("4/8 Deploying MomentumStrategy...");
    const MomentumStrategy = await ethers.getContractFactory("MomentumStrategy");
    const momentum = await MomentumStrategy.deploy(oracleAddr, 10, 200); // window=10, threshold=2%
    await momentum.waitForDeployment();
    console.log("   MomentumStrategy:", await momentum.getAddress());

    console.log("5/8 Deploying MeanReversionStrategy...");
    const MeanReversionStrategy = await ethers.getContractFactory("MeanReversionStrategy");
    const meanRev = await MeanReversionStrategy.deploy(oracleAddr, 20, 200); // lookback=20, dev=2x
    await meanRev.waitForDeployment();
    console.log("   MeanReversionStrategy:", await meanRev.getAddress());

    console.log("6/8 Deploying ArbitrageStrategy...");
    const ArbitrageStrategy = await ethers.getContractFactory("ArbitrageStrategy");
    const arb = await ArbitrageStrategy.deploy(oracleAddr, 3, 15, 100); // shortMA=3, longMA=15, spread=1%
    await arb.waitForDeployment();
    console.log("   ArbitrageStrategy:", await arb.getAddress());

    console.log("7/8 Deploying RiskParityStrategy...");
    const RiskParityStrategy = await ethers.getContractFactory("RiskParityStrategy");
    const riskParity = await RiskParityStrategy.deploy(oracleAddr, 15, 500, 10); // volLookback=15, risk=5%, trendMA=10
    await riskParity.waitForDeployment();
    console.log("   RiskParityStrategy:", await riskParity.getAddress());

    console.log("8/8 Deploying RLStrategy...");
    const RLStrategy = await ethers.getContractFactory("RLStrategy");
    const rl = await RLStrategy.deploy(oracleAddr, 100, 150); // lr=0.1, epsilon=15%
    await rl.waitForDeployment();
    console.log("   RLStrategy:", await rl.getAddress());

    // 9. Deploy ArenaCore
    console.log("\nDeploying ArenaCore (Orchestrator)...");
    const ArenaCore = await ethers.getContractFactory("ArenaCore");
    const arenaCore = await ArenaCore.deploy();
    await arenaCore.waitForDeployment();
    const arenaCoreAddr = await arenaCore.getAddress();
    console.log("   ArenaCore:", arenaCoreAddr);

    // 10. Wire everything together
    console.log("\n=== WIRING CONTRACTS ===\n");

    const strategyAddresses = [
        await momentum.getAddress(),
        await meanRev.getAddress(),
        await arb.getAddress(),
        await riskParity.getAddress(),
        await rl.getAddress(),
    ];

    // Set arena on oracle
    console.log("Setting arena on PriceOracle...");
    await oracle.setArena(arenaCoreAddr);

    // Set arena on portfolio manager
    console.log("Setting arena on PortfolioManager...");
    await portfolio.setArena(arenaCoreAddr);

    // Set arena on leaderboard
    console.log("Setting arena on Leaderboard...");
    await leaderboard.setArena(arenaCoreAddr);

    // Set arena on all strategies
    console.log("Setting arena on all strategies...");
    for (const addr of strategyAddresses) {
        const strat = await ethers.getContractAt("StrategyBase", addr);
        await strat.setArena(arenaCoreAddr);
        await strat.setPortfolioManager(await portfolio.getAddress());
    }

    // Initialize ArenaCore with all contracts
    console.log("Initializing ArenaCore...");
    await arenaCore.initialize(
        oracleAddr,
        await portfolio.getAddress(),
        await leaderboard.getAddress(),
        strategyAddresses
    );

    console.log("\n=== DEPLOYMENT COMPLETE ===\n");

    // Export addresses for frontend
    const addresses = {
        PriceOracle: oracleAddr,
        PortfolioManager: await portfolio.getAddress(),
        Leaderboard: await leaderboard.getAddress(),
        ArenaCore: arenaCoreAddr,
        strategies: {
            MomentumStrategy: await momentum.getAddress(),
            MeanReversionStrategy: await meanRev.getAddress(),
            ArbitrageStrategy: await arb.getAddress(),
            RiskParityStrategy: await riskParity.getAddress(),
            RLStrategy: await rl.getAddress(),
        },
    };

    console.log("Contract Addresses:");
    console.log(JSON.stringify(addresses, null, 2));

    // Write addresses to file for frontend
    const fs = require("fs");
    const path = require("path");
    const outDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
        path.join(outDir, "addresses.json"),
        JSON.stringify(addresses, null, 2)
    );
    console.log("\nAddresses saved to deployments/addresses.json");

    // Quick test: Start round and trigger one price update
    console.log("\n=== QUICK SMOKE TEST ===\n");
    await arenaCore.startRound();
    console.log("Round started!");

    await arenaCore.triggerPriceUpdate(ethers.parseEther("1520"));
    console.log("Price updated to $1520 - cascade triggered!");

    const systemState = await arenaCore.getSystemState();
    console.log("Arena state:", ["IDLE", "ACTIVE", "PAUSED", "ENDED"][Number(systemState[0])]);
    console.log("Total updates:", systemState[2].toString());
    console.log("Current price:", ethers.formatEther(systemState[3]));

    console.log("\n✅ All systems operational!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("DEPLOYMENT FAILED:", error);
        process.exit(1);
    });
