const { ethers } = require("ethers");

const rpcUrl = "https://api.infra.testnet.somnia.network";

// Provider
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Addresses
const arenaAddress = "0x03da74bE7a4FE1D14d618a9eb5AfBD9456787197";

// ABIs
const arenaAbi = [
    "function owner() view returns (address)",
    "function currentState() view returns (uint8)",
    "function getSystemState() view returns (uint8, uint256, uint256, uint256, uint256, uint256)"
];

async function main() {
    console.log("Checking Arena Core State...");
    const arena = new ethers.Contract(arenaAddress, arenaAbi, provider);
    const owner = await arena.owner();
    console.log("Owner is:", owner);
    const systemState = await arena.getSystemState();
    console.log("System State Array:", systemState);
    console.log("Current State Enum (0=IDLE, 1=ACTIVE):", systemState[0].toString());
}
main();
