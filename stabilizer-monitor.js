const { ethers } = require("ethers");
const axios = require("axios");

// ADD ALL POSSIBLE ADDRESSES HERE
const ACTIVE_ADDRESSES = [
    "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09",
    "0xFa6419a3d3503a016dF3A59F690734862CA2A78D",
    "0x3dd1A7A99CFa2554Da8b3483e6eD739120Fc35cB" // Added a common pool address
];

const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

async function monitor() {
    console.log("🛰️ Deep-Scan Monitor Starting...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        const startBlock = latestBlock - 9; 

        console.log(`🔎 Scanning Blocks: ${startBlock} to ${latestBlock}`);

        for (const contractAddr of ACTIVE_ADDRESSES) {
            // We remove the topics filter entirely to see IF the contract is even breathing
            const filter = {
                address: contractAddr,
                fromBlock: ethers.utils.hexlify(startBlock),
                toBlock: ethers.utils.hexlify(latestBlock)
            };

            const logs = await provider.getLogs(filter);
            
            if (logs.length > 0) {
                console.log(`🔥 ACTIVITY DETECTED on ${contractAddr}! Found ${logs.length} events.`);
                
                for (const log of logs) {
                    await axios.post(DISCORD_WEBHOOK, {
                        content: `📢 **Stabilizer Activity Detected!**\nContract: \`${contractAddr}\`\nTx: https://sepolia.etherscan.io/tx/${log.transactionHash}`
                    });
                }
            } else {
                console.log(`info: No events for ${contractAddr.slice(0,6)}`);
            }
        }
        console.log("✅ Scan complete.");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

monitor();
