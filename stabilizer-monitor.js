const { ethers } = require("ethers");
const axios = require("axios");

// 1. Setup
const ACTIVE_ADDRESSES = [
    "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09",
    "0xFa6419a3d3503a016dF3A59F690734862CA2A78D"
];

const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const WHALE_THRESHOLD = 0; 

const TOKENS = {
    "0xee0418bd560613fbcf924c36235ab1ec301d4933": { symbol: "USDT", decimals: 6 },
    "0x77ef087024f87976aada0aa7f73bb8eae6e9dda1": { symbol: "USDC", decimals: 6 },
    "0x55cc481d28db3f1ffc9347745aa6fbb940505bdd": { symbol: "USDZ", decimals: 18 },
    "0xf85938e2bfc178026f60c5ea50cc347d42c73b3d": { symbol: "USDS", decimals: 18 }
};

async function monitor() {
    console.log("🛰️ Initializing Alchemy-Safe Monitor...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        
        // --- CRITICAL FIX: Alchemy Free Tier limit is 10 blocks ---
        const startBlock = latestBlock - 9; 

        console.log(`🔎 Scanning blocks ${startBlock} to ${latestBlock} (10 block limit)...`);

        const swapTopic = ethers.utils.id("Swap(address,address,address,uint256,uint256)");
        const iface = new ethers.utils.Interface([
            "event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)"
        ]);

        for (const contractAddr of ACTIVE_ADDRESSES) {
            const filter = {
                address: contractAddr,
                fromBlock: ethers.utils.hexlify(startBlock), // Use hex for safer RPC calls
                toBlock: ethers.utils.hexlify(latestBlock),
                topics: [swapTopic]
            };

            const logs = await provider.getLogs(filter);
            console.log(`📡 Contract ${contractAddr.slice(0,6)}: Found ${logs.length} swaps.`);

            for (const log of logs) {
                const parsed = iface.parseLog(log);
                const addrIn = parsed.args.tokenIn.toLowerCase();
                const addrOut = parsed.args.tokenOut.toLowerCase();
                
                const tokenData = TOKENS[addrIn] || { symbol: `Token-${addrIn.slice(2,6)}`, decimals: 18 };
                const tokenOutName = TOKENS[addrOut]?.symbol || `Token-${addrOut.slice(2,6)}`;
                const amount = parseFloat(ethers.utils.formatUnits(parsed.args.amountIn, tokenData.decimals));

                if (amount >= WHALE_THRESHOLD) {
                    await axios.post(DISCORD_WEBHOOK, {
                        embeds: [{
                            title: "🐋 STABILIZER SWAP DETECTED",
                            color: 0x00ffcc,
                            description: `**${amount.toLocaleString()} ${tokenData.symbol}** ➔ **${tokenOutName}**`,
                            fields: [
                                { name: "Tx Link", value: `[Etherscan](https://sepolia.etherscan.io/tx/${log.transactionHash})` }
                            ],
                            timestamp: new Date()
                        }]
                    });
                }
            }
        }
        console.log("✅ Alchemy-safe scan complete.");
    } catch (error) {
        // Detailed logging to catch any other tier restrictions
        console.error("❌ RPC Error:", error.message);
        if (error.body) console.error("Error Body:", JSON.parse(error.body).error.message);
    }
}

monitor();
