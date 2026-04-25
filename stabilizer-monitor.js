const { ethers } = require("ethers");
const axios = require("axios");

// 1. Configuration - All 3 addresses included
const ACTIVE_ADDRESSES = [
    "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09",
    "0xFa6419a3d3503a016dF3A59F690734862CA2A78D",
    "0x3dd1A7A99CFa2554Da8b3483e6eD739120Fc35cB" 
];

const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

async function monitor() {
    console.log("🛰️ Initializing Triple-Address Shielded Monitor...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        const startBlock = latestBlock - 9; // Strictly 10 blocks for Alchemy Free Tier

        console.log(`🔎 Scanning Blocks: ${startBlock} to ${latestBlock}`);

        // The "Fingerprint" for a Swap event. This filters out the 60+ system events.
        const swapTopic = ethers.utils.id("Swap(address,address,address,uint256,uint256)");

        for (const contractAddr of ACTIVE_ADDRESSES) {
            const filter = {
                address: contractAddr,
                fromBlock: ethers.utils.hexlify(startBlock),
                toBlock: ethers.utils.hexlify(latestBlock),
                topics: [swapTopic] 
            };

            const logs = await provider.getLogs(filter);
            
            if (logs.length > 0) {
                console.log(`🔥 Filtered Swaps on ${contractAddr.slice(0,6)}: Found ${logs.length}`);
                
                for (const log of logs) {
                    try {
                        await axios.post(DISCORD_WEBHOOK, {
                            embeds: [{
                                title: "🐋 STABILIZER SWAP DETECTED",
                                color: 0x00ffcc,
                                description: `Action detected on monitored contract: \`${contractAddr}\``,
                                fields: [
                                    { name: "Block Number", value: `${log.blockNumber}`, inline: true },
                                    { name: "Explorer Link", value: `[View on Etherscan](https://sepolia.etherscan.io/tx/${log.transactionHash})`, inline: true }
                                ],
                                timestamp: new Date()
                            }]
                        });

                        // --- THE 1.5 SECOND SHIELD ---
                        // This prevents Discord "429 Too Many Requests"
                        console.log(`✅ Notification sent for ${log.transactionHash.slice(0,10)}... Pausing for safety.`);
                        await new Promise(resolve => setTimeout(resolve, 1500));

                    } catch (discordError) {
                        if (discordError.response && discordError.response.status === 429) {
                            console.error("⚠️ Discord limit hit. Waiting 5 seconds...");
                            await new Promise(resolve => setTimeout(resolve, 5000));
                        } else {
                            throw discordError;
                        }
                    }
                }
            } else {
                console.log(`info: No swaps found for ${contractAddr.slice(0,6)}`);
            }
        }
        console.log("✅ Full scan complete. All tiers compliant.");
    } catch (error) {
        if (error.body && error.body.includes("10 block range")) {
            console.error("❌ Alchemy Error: Block range too wide. Check startBlock logic.");
        } else {
            console.error("❌ General Error:", error.message);
        }
    }
}

monitor();
