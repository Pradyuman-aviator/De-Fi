const { ethers } = require("ethers");

const rpcUrl = "https://api.infra.testnet.somnia.network";
const CONTRACTS = {
    ArenaCore: "0x914eaFE3B3794F10358B74cD0D449233Ea7A84Fb",
    PriceOracle: "0x98730ce0dAB0a49275B4B9fAB6AD07d52Be956B9",
    PortfolioManager: "0x7e75B70Ec1Bb392E1f0b4d20beBB1f1DeACD0Cbd",
    Leaderboard: "0x8DBB0182119ADC6f36AF55C0D67616156267fBad",
};

const pmAddr = CONTRACTS.PortfolioManager;
const oracleAddr = CONTRACTS.PriceOracle;

const pmAbi = [
    "function getAllAgentStats(uint256) view returns (tuple(address strategyAddress, string name, uint8 strategyType, uint8 position, uint256 entryPrice, uint256 positionSize, int256 totalPnL, int256 unrealizedPnL, uint256 totalTrades, uint256 winRate, bool isActive)[])"
];
const oracleAbi = [
    "function currentPrice() view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const pmInfo = new ethers.Contract(pmAddr, pmAbi, provider);
    const oracle = new ethers.Contract(oracleAddr, oracleAbi, provider);

    const cp = await oracle.currentPrice();
    console.log("Current Price:", ethers.formatEther(cp));

    const stats = await pmInfo.getAllAgentStats(cp);
    stats.forEach(s => {
        console.log(`Agent ${s.name}: Position ${s.position}, PnL ${ethers.formatEther(s.totalPnL)} (Unrealized: ${ethers.formatEther(s.unrealizedPnL)})`);
    });
}
main();
