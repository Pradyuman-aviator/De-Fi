const { ethers } = require("ethers");

const rpcUrl = "https://api.infra.testnet.somnia.network";
const pmAddr = "0x5Ec4af50Abd3b13Def7FeCf7d3FC39574D2497dd";
const oracleAddr = "0xE88643c9310291275B93BA56EF155A077b8895b4";

const pmAbi = [
    "function getAllAgentStats(uint256) view returns (tuple(address,string,uint8,uint8,uint256,uint256,int256,int256,uint256,uint256,bool)[])"
];
const oracleAbi = [
    "function currentPrice() view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const pm = new ethers.Contract(pmAddr, pmAbi, provider);
    const oracle = new ethers.Contract(oracleAddr, oracleAbi, provider);

    const cp = await oracle.currentPrice();
    console.log("Current Price:", ethers.formatEther(cp));

    const stats = await pm.getAllAgentStats(cp);
    stats.forEach(s => {
        console.log(`Agent ${s[1]}: Position ${s[3]}, PnL ${ethers.formatEther(s[6])}`);
    });
}
main();
