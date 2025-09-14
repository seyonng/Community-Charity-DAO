# 🌟 Community Charity DAO

Welcome to the Community Charity DAO – a decentralized platform that empowers donors to collectively prioritize and fund charitable causes! Built on the Stacks blockchain using Clarity smart contracts, this project solves the real-world problem of opaque charity funding by enabling transparent, community-driven decision-making. Donors receive governance tokens for their contributions, which they use to vote on charity proposals, ensuring funds go where the community deems most impactful.

## ✨ Features

🗳️ Create and vote on charity proposals with donation-based tokens  
💰 Transparent treasury for holding and distributing donated funds  
📜 Register verified charities to prevent fraud  
🔒 Staked voting to align long-term incentives  
🏆 Reward system for active participants  
📊 On-chain analytics for donation impact tracking  
🚫 Anti-collusion mechanisms for fair voting  
🔄 Token burning for deflationary economics  

## 🛠 How It Works

This DAO leverages 8 interconnected Clarity smart contracts to create a robust, secure system for community-led charity prioritization. Here's a high-level overview:

### Smart Contracts Overview

1. **Governance Token Contract**: Manages the ERC-20-like donation tokens (e.g., CHARITY-TOKEN). Tokens are minted when users donate STX or other assets, proportional to contribution value. Includes functions for minting, burning, and transferring tokens.

2. **Donation Contract**: Handles incoming donations in STX or supported tokens. Converts donations to governance tokens and routes funds to the treasury. Ensures only verified donors receive tokens.

3. **Charity Registry Contract**: Allows admins or community votes to register and verify charities. Stores charity details like name, description, wallet address, and verification status to prevent scams.

4. **Proposal Contract**: Enables users to submit charity funding proposals, including amount requested, target charity, and rationale. Proposals must meet a minimum token threshold to be active.

5. **Voting Contract**: Core logic for voting on proposals using staked governance tokens. Implements quadratic voting to reduce whale influence and ensure broader community input.

6. **Staking Contract**: Users stake their governance tokens for voting power. Staked tokens earn rewards but are locked during active votes to prevent short-term manipulation.

7. **Treasury Contract**: Securely holds donated funds and executes payouts to winning charities based on vote outcomes. Includes multi-sig-like approvals for large disbursements.

8. **Rewards Contract**: Distributes incentives (e.g., bonus tokens or NFTs) to active voters and proposal creators whose ideas succeed, encouraging participation.

### For Donors and Participants

- **Donate and Earn Tokens**: Call the Donation Contract with STX to receive governance tokens. For example: `donate-stx(amount: u1000000)` mints tokens based on current exchange rates.
- **Stake for Power**: Use the Staking Contract to lock tokens: `stake-tokens(amount: u500, duration: u30)` (in blocks) to gain voting weight.
- **Propose a Cause**: Submit via Proposal Contract: `create-proposal(charity-id: u42, amount: u500000, description: "Fund clean water in region X")`.
- **Vote on Priorities**: In the Voting Contract, cast votes: `vote-on-proposal(proposal-id: u10, votes: u100)` using staked tokens.
- **Claim Rewards**: After votes, use Rewards Contract: `claim-rewards()` to get bonuses for participation.

### For Charities

- **Register**: Submit details to Charity Registry: `register-charity(name: "Clean Water Org", address: 'SP...')`. Community votes on verification.
- **Receive Funds**: Once a proposal wins, Treasury Contract automatically transfers: `execute-payout(proposal-id: u10)`.

### For Verifiers and Auditors

- Query on-chain data: Use `get-proposal-details(id: u10)` or `get-vote-tally(id: u10)` for transparency.
- Check impacts: Analytics via `get-donation-history()` to see fund flows.

Boom! Your donations now drive real change through democratic, blockchain-secured decisions. This setup minimizes central control, reduces overhead, and maximizes impact for global causes like education, health, and environment.