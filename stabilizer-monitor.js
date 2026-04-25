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
    console.log("🛰️ Robust Deep-Scan Starting...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        
        // Increase range to 15 blocks to catch lag (Overlap)
        // If Alchemy errors with '400', change 14 back to 9
        const startBlock = latestBlock - 14; 

        console.log(`🔎 Range: ${startBlock} to ${latestBlock} (${latestBlock - startBlock + 1} blocks)`);

        for (const contractAddr of ACTIVE_ADDRESSES) {
            const filter = {
                address: contractAddr,
                fromBlock: ethers.utils.hexlify(startBlock),
                toBlock: ethers.utils.hexlify(latestBlock)
            };

            const logs = await provider.getLogs(filter);
            
            if (logs.length > 0) {
                console.log(`🔥 Found ${logs.length} events on ${contractAddr.slice(0,6)}`);
                
                for (const log of logs) {
                    // Send notification
                    await axios.post(DISCORD_WEBHOOK, {
                        embeds: [{
                            title: "🐋 STABILIZER ACTIVITY DETECTED",
                            color: 0x00ffcc,
                            description: `New activity found on contract \`${contractAddr}\``,
                            fields: [
                                { name: "Transaction Link", value: `[View on Etherscan](https://sepolia.etherscan.io/tx/${log.transactionHash})` }
                            ],
                            footer: { text: `Block: ${log.blockNumber}` },
                            timestamp: new Date()
                        }]
                    });
                }
            }
        }
        console.log("✅ Scan complete.");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

monitor();
