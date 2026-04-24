const { ethers } = require("ethers");
const axios = require("axios");

// Configuration
const ROUTER_ADDRESS = "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09";
const WHALE_THRESHOLD = 5000; // Notifications for 5k+ tokens
const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// Token Lookup (Labels for Sepolia Testnet)
const TOKENS = {
    "0x3dd1A7A99CFa2554Da8b3483e6eD739120Fc35cB": "USDT",
    "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d": "USDC",
    "0xf08a50178dfcde18524640ea6618a1f965821715": "USDZ",
    "0x73d219b3881e481394da6b5008a081d623992200": "USDS"
};

async function monitor() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    // Define the Swap event signature
    const filter = {
        address: ROUTER_ADDRESS,
        fromBlock: "latest", // We will adjust this to check the last few blocks
        topics: [ethers.utils.id("Swap(address,address,address,uint256,uint256)")]
    };

    // Check roughly the last 5 minutes of blocks (Sepolia block time is ~12s)
    const latestBlock = await provider.getBlockNumber();
    const startBlock = latestBlock - 25; 

    console.log(`🔎 Scanning blocks ${startBlock} to ${latestBlock}...`);
    const logs = await provider.getLogs({ ...filter, fromBlock: startBlock });

    for (const log of logs) {
        const interface = new ethers.utils.Interface([
            "event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)"
        ]);
        const parsed = interface.parseLog(log);
        const amount = parseFloat(ethers.utils.formatUnits(parsed.args.amountIn, 18));

        if (amount >= WHALE_THRESHOLD) {
            const tokenIn = TOKENS[parsed.args.tokenIn.toLowerCase()] || "Unknown";
            const tokenOut = TOKENS[parsed.args.tokenOut.toLowerCase()] || "Unknown";

            await axios.post(DISCORD_WEBHOOK, {
                embeds: [{
                    title: "🐋 STABILIZER WHALE ALERT",
                    color: 0x00ffcc,
                    fields: [
                        { name: "Swap", value: `${amount.toLocaleString()} ${tokenIn} ➔ ${tokenOut}`, inline: false },
                        { name: "Tx", value: `[Etherscan](https://sepolia.etherscan.io/tx/${log.transactionHash})`, inline: true }
                    ],
                    footer: { text: "Stabilizer Fi Testnet Monitor" },
                    timestamp: new Date()
                }]
            });
        }
    }
    console.log("✅ Scan complete.");
}

monitor().catch(console.error);
