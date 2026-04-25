const { ethers } = require("ethers");
const axios = require("axios");

// Configuration
const ACTIVE_ADDRESSES = [
    "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09",
    "0xFa6419a3d3503a016dF3A59F690734862CA2A78D",
    "0x3dd1A7A99CFa2554Da8b3483e6eD739120Fc35cB"
];

const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

async function monitor() {
    console.log("🛰️ Initializing Catch-All Universal Monitor...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        const startBlock = latestBlock - 9; // Strictly 10 blocks for Alchemy

        console.log(`🔎 Scanning Blocks: ${startBlock} to ${latestBlock}`);

        for (const contractAddr of ACTIVE_ADDRESSES) {
            const filter = {
                address: contractAddr,
                fromBlock: ethers.utils.hexlify(startBlock),
                toBlock: ethers.utils.hexlify(latestBlock)
                // Removed topics filter entirely to ensure we catch EVERY move
            };

            const logs = await provider.getLogs(filter);
            
            if (logs.length > 0) {
                console.log(`🔥 ACTIVITY DETECTED on ${contractAddr.slice(0,6)}! Found ${logs.length} events.`);
                
                // Group events by transaction so we don't spam 60 messages for 1 swap
                const uniqueTxHashes = [...new Set(logs.map(log => log.transactionHash))];

                for (const txHash of uniqueTxHashes) {
                    try {
                        await axios.post(DISCORD_WEBHOOK, {
                            embeds: [{
                                title: "🐋 STABILIZER PROTOCOL ACTIVITY",
                                color: 0x00ffcc,
                                description: `Action detected on contract \`${contractAddr}\``,
                                fields: [
                                    { name: "Explorer Link", value: `[View on Etherscan](https://sepolia.etherscan.io/tx/${txHash})` }
                                ],
                                timestamp: new Date()
                            }]
                        });

                        console.log(`✅ Alert sent for TX: ${txHash.slice(0,10)}`);
                        // Safety pause to keep Discord happy
                        await new Promise(resolve => setTimeout(resolve, 2000));

                    } catch (discordError) {
                        console.error("⚠️ Discord notification failed.");
                    }
                }
            } else {
                console.log(`info: No activity on ${contractAddr.slice(0,6)}`);
            }
        }
        console.log("✅ Scan complete.");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

monitor();
