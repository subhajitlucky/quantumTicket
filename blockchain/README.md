# QuantumTicket contracts (Hardhat)

Solidity contract for the QuantumTicket NFT ticketing dApp on the Sepolia testnet.

## Quick start

```shell
npm install
npx hardhat test
```

## Deploy to Sepolia

1. Create `blockchain/.env` (copy `.env.example`) and set:
   - `SEPOLIA_RPC_URL` — any Sepolia RPC endpoint
   - `PRIVATE_KEY` — a dedicated deployer wallet with Sepolia ETH (this becomes the contract owner)
   - `ETHERSCAN_API_KEY` — optional, for verification

2. Deploy:

```shell
npx hardhat run scripts/deploy.js --network sepolia
```

3. Verify on Etherscan:

```shell
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

4. Seed three demo events with future dates:

```shell
CONTRACT_ADDRESS=<CONTRACT_ADDRESS> npx hardhat run scripts/seed-demo-events.js --network sepolia
```

5. Update `VITE_CONTRACT_ADDRESS` in the frontend (Vercel env + local `.env`).

## Security notes

- Organizer ticket sales are escrowed per event and unlock after the event date, so pre-event refunds stay funded.
- Platform fees are tracked separately and can never touch organizer escrow.
- Deploy with a dedicated key and transfer ownership if that key is a burner.
