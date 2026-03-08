const cp = require('child_process');
try {
    console.log("Starting Hardhat Deployment...");
    const out = cp.execSync('npx hardhat run scripts/deploy-somnia.js --network somnia', { encoding: 'utf-8' });
    console.log(out);
    const fs = require('fs');
    fs.writeFileSync('deploy_log.txt', out);
} catch (e) {
    console.error("Deploy failed:", e);
}
