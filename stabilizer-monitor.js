const { ethers } = require("ethers");
const axios = require("axios");

// 1. Setup - Using the Router Address you provided
const ROUTER_ADDRESS = "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09";
const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

const WHALE_THRESHOLD = 0; 

// IMPORTANT: Addresses here MUST be lowercase to match the .toLowerCase() logic
const TOKENS = {
    "0xee0418bd560613fbcf924c36235ab1ec301d4933": "USDT",
    "0x77ef087024f87976aada0aa7f73bb8eae6e9dda1": "USDC",
    "0x55cc481d28db3f1ffc9347745aa6fbb940505bdd": "USDZ",
    "0xf85938e2bfc178026f60c5ea50cc347d42c73b3d": "USDS"
};

async function monitor() {
    console.log("🛰️ Initializing Stabilizer Sentinel...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        // --- TEST STEP: This confirms your Discord Webhook is valid ---
        // Once you see this message in Discord, you can comment this line out.
        await axios.post(DISCORD_WEBHOOK, { 
            content: "📡 **Sentinel Status:** Scanning Sepolia blocks for Stabilizer activity..." 
        });

        const latestBlock = await provider.getBlockNumber();
        const startBlock = latestBlock - 50; 

        const swapTopic = ethers.utils.id("Swap(address,address,address,uint256,uint256)");
        
        const filter = {
            address: ROUTER_ADDRESS,
            fromBlock: startBlock,
            toBlock: latestBlock,
            topics: [swapTopic]
        };

        const logs = await provider.getLogs(filter);
        console.log(`🔎 Blocks ${startBlock} to ${latestBlock} | Found: ${logs.length} swaps.`);

        const iface = new ethers.utils.Interface([
            "event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)"
        ]);

        for (const log of logs) {
            const parsed = iface.parseLog(log);
            
            // Check decimals: If tokens use 6 decimals (like USDC/USDT), change 18 to 6
            const amount = parseFloat(ethers.utils.formatUnits(parsed.args.amountIn, 18));

            if (amount >= WHALE_THRESHOLD) {
                const addrIn = parsed.args.tokenIn.toLowerCase();
                const addrOut = parsed.args.tokenOut.toLowerCase();
                
                const tokenIn = TOKENS[addrIn] || `Unknown (${addrIn.slice(0,6)})`;
                const tokenOut = TOKENS[addrOut] || `Unknown (${addrOut.slice(0,6)})`;

                await axios.post(DISCORD_WEBHOOK, {
                    embeds: [{
                        title: "🐋 STABILIZER ACTIVITY DETECTED",
                        color: 0x00ffcc,
                        description: `**${amount.toLocaleString()} ${tokenIn}** ➔ **${tokenOut}**`,
                        fields: [
                            { name: "Transaction", value: `[View on Etherscan](https://sepolia.etherscan.io/tx/${log.transactionHash})` }
                        ],
                        footer: { text: `Block: ${log.blockNumber} • Sentinel Node` },
                        timestamp: new Date()
                    }]
                });
            }
        }
        console.log("✅ Scan cycle complete.");
    } catch (error) {
        console.error("❌ Fatal Error:", error.message);
        // This helps you see in GitHub Actions if the Webhook URL is the problem
        if (error.response) {
            console.error("Discord API Error:", error.response.data);
        }
    }
}

monitor();
