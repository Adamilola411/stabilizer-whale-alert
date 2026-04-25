const { ethers } = require("ethers");
const axios = require("axios");

const ACTIVE_ADDRESSES = [
    "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09",
    "0xFa6419a3d3503a016dF3A59F690734862CA2A78D",
    "0x3dd1A7A99CFa2554Da8b3483e6eD739120Fc35cB"
];

const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

async function monitor() {
    console.log("🛰️ Initializing 10-Block Precision Monitor...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        
        // We use 9 because (Latest - 9) to Latest = exactly 10 blocks total.
        // Example: 100 to 109 is 10 blocks.
        const startBlock = latestBlock - 9; 

        console.log(`🔎 Range: ${startBlock} to ${latestBlock} (Alchemy Limit Compliance)`);

        for (const contractAddr of ACTIVE_ADDRESSES) {
            const filter = {
                address: contractAddr,
                fromBlock: ethers.utils.hexlify(startBlock),
                toBlock: ethers.utils.hexlify(latestBlock)
            };

            const logs = await provider.getLogs(filter);
            
            if (logs.length > 0) {
                console.log(`🔥 SUCCESS: Found ${logs.length} events on ${contractAddr.slice(0,6)}`);
                
                for (const log of logs) {
                    await axios.post(DISCORD_WEBHOOK, {
                        embeds: [{
                            title: "🐋 STABILIZER ACTIVITY DETECTED",
                            color: 0x00ffcc,
                            description: `Activity detected on monitored contract.`,
                            fields: [
                                { name: "Contract", value: `\`${contractAddr}\`` },
                                { name: "Explorer", value: `[View Transaction](https://sepolia.etherscan.io/tx/${log.transactionHash})` }
                            ],
                            footer: { text: `Block: ${log.blockNumber} | Alchemy Free Tier` },
                            timestamp: new Date()
                        }]
                    });
                }
            }
        }
        console.log("✅ Scan complete. No tier violations.");
    } catch (error) {
        // Detailed logging to see exactly what Alchemy dislikes
        if (error.body) {
            const errorData = JSON.parse(error.body);
            console.error("❌ Alchemy Error:", errorData.error.message);
        } else {
            console.error("❌ Script Error:", error.message);
        }
    }
}

monitor();
