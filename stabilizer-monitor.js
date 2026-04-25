const { ethers } = require("ethers");
const axios = require("axios");

const ACTIVE_ADDRESSES = [
    "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09",
    "0xFa6419a3d3503a016dF3A59F690734862CA2A78D"
];

const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// Increase this slightly so you only get "real" activity alerts
const WHALE_THRESHOLD = 1; 

async function monitor() {
    console.log("🛰️ Initializing Rate-Limit Protected Monitor...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        const startBlock = latestBlock - 9; 

        // The specific "Swap" fingerprint
        const swapTopic = ethers.utils.id("Swap(address,address,address,uint256,uint256)");

        for (const contractAddr of ACTIVE_ADDRESSES) {
            const filter = {
                address: contractAddr,
                fromBlock: ethers.utils.hexlify(startBlock),
                toBlock: ethers.utils.hexlify(latestBlock),
                topics: [swapTopic] // ONLY look for swaps to reduce the 67 events down to a few
            };

            const logs = await provider.getLogs(filter);
            console.log(`🔎 ${contractAddr.slice(0,6)}: Found ${logs.length} actual swaps.`);

            for (const log of logs) {
                await axios.post(DISCORD_WEBHOOK, {
                    embeds: [{
                        title: "🐋 STABILIZER SWAP DETECTED",
                        color: 0x00ffcc,
                        description: `Swap detected in block ${log.blockNumber}`,
                        fields: [{ name: "Tx", value: `[Etherscan](https://sepolia.etherscan.io/tx/${log.transactionHash})` }],
                        timestamp: new Date()
                    }]
                });
                
                // --- PAUSE FOR 1 SECOND ---
                // This prevents the 429 error by spacing out the messages
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        console.log("✅ Scan complete. Discord happy.");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

monitor();
