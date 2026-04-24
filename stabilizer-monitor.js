const { ethers } = require("ethers");
const axios = require("axios");

// 1. Configuration
const ROUTER_ADDRESS = "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09";
const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// SET THIS TO 0 TO TEST. Change back to 5000 once you confirm it works!
const WHALE_THRESHOLD = 0; 

const TOKENS = {
    "0x3dd1a7a99cfa2554da8b3483e6ed739120fc35cb": "USDT",
    "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d": "USDC",
    "0xf08a50178dfcde18524640ea6618a1f965821715": "USDZ",
    "0x73d219b3881e481394da6b5008a081d623992200": "USDS"
};

async function monitor() {
    console.log("🛰️ Stabilizer Sentinel: Starting Scan...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        const startBlock = latestBlock - 40; // Scan last ~8 minutes to be safe

        const filter = {
            address: ROUTER_ADDRESS,
            fromBlock: startBlock,
            toBlock: latestBlock,
            // Topic for Swap event
            topics: [ethers.utils.id("Swap(address,address,address,uint256,uint256)")]
        };

        const logs = await provider.getLogs(filter);
        console.log(`🔎 Scanned ${startBlock} to ${latestBlock}. Found ${logs.length} swaps.`);

        if (logs.length === 0) {
            console.log("😴 No activity detected in this window.");
            return;
        }

        const iface = new ethers.utils.Interface([
            "event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)"
        ]);

        for (const log of logs) {
            const parsed = iface.parseLog(log);
            // Standardize decimal handling (adjust if some tokens use 6 decimals)
            const amount = parseFloat(ethers.utils.formatUnits(parsed.args.amountIn, 18));

            if (amount >= WHALE_THRESHOLD) {
                const tokenIn = TOKENS[parsed.args.tokenIn.toLowerCase()] || "Unknown";
                const tokenOut = TOKENS[parsed.args.tokenOut.toLowerCase()] || "Unknown";

                await axios.post(DISCORD_WEBHOOK, {
                    embeds: [{
                        title: "🐋 STABILIZER ACTIVITY ALERT",
                        color: 0x00ffcc,
                        description: `**${amount.toLocaleString()} ${tokenIn}** swapped for **${tokenOut}**`,
                        fields: [
                            { name: "Slippage", value: "0% (Stabilizer Engine)", inline: true },
                            { name: "Tx Link", value: `[View on Etherscan](https://sepolia.etherscan.io/tx/${log.transactionHash})`, inline: true }
                        ],
                        timestamp: new Date()
                    }]
                });
                console.log(`✅ Notification sent for TX: ${log.transactionHash.slice(0,10)}`);
            }
        }
    } catch (error) {
        console.error("❌ Error during scan:", error.message);
    }
}

monitor();
