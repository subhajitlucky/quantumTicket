# EventNFT - Decentralized Event Ticketing System

EventNFT is a decentralized application (dApp) that allows event organizers to mint and sell NFT tickets for their events. Built on Ethereum, it provides a secure, transparent, and efficient way to manage event tickets.

## Features

- **NFT Tickets**: Each ticket is a unique NFT stored on the blockchain
- **Secure**: Immutable and fraud-proof ticketing system
- **Tradeable**: Buy, sell, or transfer your tickets easily
- **Accessible**: Access your tickets from any device
- **Transparent**: All transactions are visible on the blockchain

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **Blockchain**: Solidity, Ethereum
- **Wallet Integration**: RainbowKit, Wagmi
- **Smart Contract**: OpenZeppelin ERC721

## Project Structure

```
eventNftTicket/
├── blockchain/           # Smart contracts
│   ├── contracts/        # Solidity contracts
│   ├── scripts/          # Deployment scripts
│   └── test/             # Contract tests
└── frontend/             # React application
    ├── public/           # Static assets
    ├── src/              # Source code
    │   ├── components/   # React components
    │   ├── hooks/        # Custom React hooks
    │   ├── contracts/    # Contract ABIs
    │   └── ...
    └── ...
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask or another Web3 wallet

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/eventNftTicket.git
   cd eventNftTicket
   ```

2. Install dependencies
   ```
   # Install blockchain dependencies
   cd blockchain
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Configure environment variables
   - Copy `.env.example` to `.env` in the frontend directory
   - Update the contract address in `.env`

4. Start the development server
   ```
   cd frontend
   npm run dev
   ```

## Smart Contract

The main smart contract is `EventTicket.sol`, which extends the ERC721 standard to create NFT tickets. It includes functionality for:

- Minting new tickets
- Using tickets for events
- Retrieving ticket details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenZeppelin for the ERC721 implementation
- RainbowKit for the wallet connection UI
- Wagmi for the Ethereum hooks 