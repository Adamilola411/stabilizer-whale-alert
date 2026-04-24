const { ethers } = require("ethers");
const axios = require("axios");

const ROUTER_ADDRESS = "0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09";
const RPC_URL = process.env.RPC_URL;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

const TOKENS = {
    "0xee0418bd560613fbcf924c36235ab1ec301d4933": { symbol: "USDT", decimals: 6 },
    "0x77ef087024f87976aada0aa7f73bb8eae6e9dda1": { symbol: "USDC", decimals: 6 },
    "0x55cc481d28db3f1ffc9347745aa6fbb940505bdd": { symbol: "USDZ", decimals: 18 },
    "0xf85938e2bfc178026f60c5ea50cc347d42c73b3d": { symbol: "USDS", decimals: 18 }
};

async function monitor() {
    console.log("🛰️ Initializing Deep-Scan Monitor...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        const startBlock = latestBlock - 9; // Alchemy Safe Range

        const filter = {
            address: ROUTER_ADDRESS,
            fromBlock: ethers.utils.hexlify(startBlock),
            toBlock: ethers.utils.hexlify(latestBlock)
        };

        const logs = await provider.getLogs(filter);
        console.log(`🔎 Blocks ${startBlock}-${latestBlock} | Events Found: ${logs.length}`);

        // We check for two types of signatures:
        // 1. Standard Swap
        // 2. Uniswap V3 style ExactInput
        const swapTopic = ethers.utils.id("Swap(address,address,address,uint256,uint256)");
        const inputTopic = ethers.utils.id("ExactInputSingle(address,address,address,uint24,address,uint256,uint256,uint160)");

        for (const log of logs) {
            // Log every transaction hash found for manual debugging in GitHub
            console.log(`✨ Transaction Detected: ${log.transactionHash}`);

            // If we find a match to our expected signatures
            if (log.topics[0] === swapTopic || log.topics[0] === inputTopic) {
                // Decode the data manually to avoid ABI errors
                const data = ethers.utils.defaultAbiCoder.decode(
                    ["uint256", "uint256"], 
                    log.data
                );

                const amountRaw = data[0]; // Usually amountIn
                const amount = parseFloat(ethers.utils.formatUnits(amountRaw, 18));

                await axios.post(DISCORD_WEBHOOK, {
                    embeds: [{
                        title: "🐋 STABILIZER SWAP DETECTED",
                        color: 0x00ffcc,
                        description: `**Activity found on Main Router**`,
                        fields: [
                            { name: "Tx Link", value: `[Etherscan](https://sepolia.etherscan.io/tx/${log.transactionHash})` }
                        ],
                        timestamp: new Date()
                    }]
                });
            }
        }
        console.log("✅ Scan complete.");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

monitor();
