# 🛡️ Stabilizer Fi Sentinel (Sepolia Monitor)

An automated, cloud-based monitoring suite for the **Stabilizer Fi** protocol on the Sepolia Testnet. This tool is designed for the community to verify the protocol's ability to handle high-volume, zero-slippage swaps in real-time.

## 🚀 Purpose
As a **Stabilizer Fi Ambassador**, my goal is to ensure community transparency and protocol reliability. This tool provides:
* **Whale Swap Alerts:** Real-time tracking of swaps over 5,000 tokens to prove zero-slippage performance.
* **24/7 Uptime:** Hosted on GitHub Actions with a 5-minute heartbeat interval.
* **Infrastructure Logging:** Visibility into protocol activity without needing to log into the testnet dApp.

## 🛠️ Features
- **Smart Contract Monitoring:** Directly watches the Stabilizer Router: `0xb476a6a53Ba32c4B74BbdACaD567EBe1B3D50f09`.
- **Token Identification:** Automated labeling for `USDT`, `USDZ`, `USDS`, and `USDC`.
- **Discord Integration:** Instant notifications with direct links to Sepolia Etherscan for verification.
- **Gas-Efficient:** Snapshot-based sweep logic prevents excessive RPC calls.

## 📊 Live Metrics Monitored
| Metric | Threshold | Target |
| :--- | :--- | :--- |
| **Whale Swap** | > 5,000 Tokens | Router Contract |
| **Swap Interval** | Every 5 Minutes | Sepolia Blocks |
| **Protocol Health** | Active/Inactive | Event Logs |

## ⚙️ Configuration
This tool runs via GitHub Actions. If you wish to fork this for your own community:
1. Fork the repository.
2. Add `RPC_URL` (Sepolia) to your GitHub Secrets.
3. Add `DISCORD_WEBHOOK` to your GitHub Secrets.
4. Enable Actions in the "Actions" tab.

---
Built by [Your Name] • Stabilizer Fi Community Ambassador Candidate
