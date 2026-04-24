const { ethers } = require("ethers");
const axios = require("axios");

// 1. Setup
const ROUTER_ADDRESS = "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09";
const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// SET TO 0 TO CAPTURE EVERYTHING FOR TESTING
const WHALE_THRESHOLD = 0; 

const TOKENS = {
    "0x3dd1a7a99cfa2554da8b3483e6ed739120fc35cb": "USDT",
    "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d": "USDC",
    "0xf08a50178dfcde18524640ea6618a1f965821715": "USDZ",
    "0x73d219b3881e481394da6b5008a081d623992200": "USDS"
};

async function monitor() {
    console.log("🛰️ Initializing Stabilizer Sentinel...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        // --- STEP 1: Verify Webhook (One-time test) ---
        // Uncomment the line below to test if your Discord Webhook actually works
        // await axios.post(DISCORD_WEBHOOK, { content: "📡 Sentinel is scanning Sepolia..." });

        const latestBlock = await provider.getBlockNumber();
        const startBlock = latestBlock - 50; // Scan last ~10 mins

        const filter = {
            address: ROUTER_ADDRESS,
            fromBlock: startBlock,
            toBlock: latestBlock,
            // Topic for Swap(address,address,address,uint256,uint256)
            topics: ["0xcd3829a237b301712a32155b1115166060606060606060606060606060606060"] 
        };

        // Note: Using a hardcoded topic hash if the id() function is failing
        const swapTopic = ethers.utils.id("Swap(address,address,address,uint256,uint256)");
        filter.topics = [swapTopic];

        const logs = await provider.getLogs(filter);
        console.log(`🔎 Blocks ${startBlock} to ${latestBlock} | Found: ${logs.length} swaps.`);

        const iface = new ethers.utils.Interface([
            "event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)"
        ]);

        for (const log of logs) {
            const parsed = iface.parseLog(log);
            const amount = parseFloat(ethers.utils.formatUnits(parsed.args.amountIn, 18));

            if (amount >= WHALE_THRESHOLD) {
                const tokenIn = TOKENS[parsed.args.tokenIn.toLowerCase()] || "Unknown Token";
                const tokenOut = TOKENS[parsed.args.tokenOut.toLowerCase()] || "Unknown Token";

                await axios.post(DISCORD_WEBHOOK, {
                    embeds: [{
                        title: "🐋 STABILIZER ACTIVITY DETECTED",
                        color: 0x00ffcc,
                        description: `**${amount.toLocaleString()} ${tokenIn}** ➔ **${tokenOut}**`,
                        fields: [
                            { name: "Tx Link", value: `[Etherscan](https://sepolia.etherscan.io/tx/${log.transactionHash})` }
                        ],
                        footer: { text: `Block: ${log.blockNumber}` },
                        timestamp: new Date()
                    }]
                });
            }
        }
    } catch (error) {
        console.error("❌ Fatal Error:", error);
    }
}

monitor();
