const { ethers } = require("ethers");
const axios = require("axios");

// 1. Configuration - All 4 high-priority addresses
const ACTIVE_ADDRESSES = [
    "0xF85938e2Bfc178026f60c5Ea50cC347D42C73b3D", // USDS
    "0xFa6419a3d3503a016dF3A59F690734862CA2A78D", // Main Router
    "0xee0418Bd560613fbcF924C36235AB1ec301D4933", // USDT
    "0x55Cc481D28Db3f1ffc9347745AA6fbB940505BdD"  // USDZ
];

const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

async function monitor() {
    console.log("🛰️ Monitoring Core Assets: USDS, USDT, USDZ & Router...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        const startBlock = latestBlock - 9; // Alchemy Free Tier Safe Range

        console.log(`🔎 Blocks: ${startBlock} to ${latestBlock}`);

        const filter = {
            fromBlock: ethers.utils.hexlify(startBlock),
            toBlock: ethers.utils.hexlify(latestBlock)
        };

        const allLogs = await provider.getLogs(filter);
        
        // Filter for our 4 specific targets (case-insensitive)
        const relevantLogs = allLogs.filter(log => 
            ACTIVE_ADDRESSES.map(a => a.toLowerCase()).includes(log.address.toLowerCase())
        );

        if (relevantLogs.length > 0) {
            // Group by TxHash to prevent spamming Discord
            const uniqueTxs = [...new Set(relevantLogs.map(l => l.transactionHash))];

            for (const txHash of uniqueTxs) {
                const triggerLog = relevantLogs.find(l => l.transactionHash === txHash);
                
                await axios.post(DISCORD_WEBHOOK, {
                    embeds: [{
                        title: "🐋 STABILIZER PROTOCOL ACTIVITY",
                        color: 0x00ffcc,
                        fields: [
                            { name: "Trigger Contract", value: `\`${triggerLog.address}\`` },
                            { name: "Transaction", value: `[View on Etherscan](https://sepolia.etherscan.io/tx/${txHash})` }
                        ],
                        footer: { text: `Block: ${triggerLog.blockNumber} | Quad-Address Coverage` },
                        timestamp: new Date()
                    }]
                });

                console.log(`✅ Alert Sent for ${txHash.slice(0,10)}...`);
                // Standard 2-second cooldown for Discord safety
                await new Promise(r => setTimeout(r, 2000));
            }
        } else {
            console.log("info: No major asset activity detected in this cycle.");
        }
        
        console.log("✅ Scan Complete.");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

monitor();
