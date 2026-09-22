<div align="center">

# ⚡ QuantumTicket ⚡
## *The Future of Event Ticketing*

*Blockchain-based NFT event ticketing on the Ethereum Sepolia testnet — on-chain ownership, wallet-based entry validation, and organizer escrow*

[![Network](https://img.shields.io/badge/Network-Sepolia-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)](https://sepolia.etherscan.io/address/0x5C844C7Aa8e49A7dA32C3B65f69bB545b5216d2f)
[![Contract](https://img.shields.io/badge/Contract-ERC--721-2b6cb0?style=for-the-badge&logo=solidity&logoColor=white)](https://sepolia.etherscan.io/address/0x5C844C7Aa8e49A7dA32C3B65f69bB545b5216d2f)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

**Deployed contract:** [`0x5C844C7Aa8e49A7dA32C3B65f69bB545b5216d2f`](https://sepolia.etherscan.io/address/0x5C844C7Aa8e49A7dA32C3B65f69bB545b5216d2f) (Sepolia)

</div>

## 🚀 **Project Overview**

QuantumTicket is a decentralized event ticketing platform built on Ethereum that transforms event tickets into unique NFT tokens. The platform empowers event organizers to create, manage, and monetize events while providing attendees with true ownership of their tickets through blockchain technology.

### **Key Highlights**
- 🎫 **NFT-Based Tickets** - Each ticket is a unique ERC-721 token
- 🔒 **Anti-Scalping Protection** - Transfer locks and purchase limits
- 💰 **Organizer Revenue** - Direct withdrawal of ticket sales
- 🔍 **Scanner System** - Authorized ticket validation at venues
- ⏰ **Time-Based Entry** - Configurable entry open times
- 💸 **Refund Mechanism** - Organizer-controlled ticket refunds
- 🌐 **Multi-Wallet Support** - MetaMask, WalletConnect, and more

## ⚡ **Quick Start**

### 📋 **Prerequisites**
- Node.js `v18+`
- npm or yarn
- MetaMask or compatible Web3 wallet
- Sepolia ETH for testing (get from [faucet](https://sepoliafaucet.com/))

### 🛠️ **Installation**

```bash
# Clone repository
git clone https://github.com/subhajitlucky/quantumTicket.git
cd quantumTicket

# Setup blockchain (Smart Contracts)
cd blockchain
npm install

# Create .env file with your configuration
cp .env.example .env
# Edit .env with your PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY

# Setup frontend
cd ../frontend
npm install

# Create .env file for frontend
# Add VITE_WALLETCONNECT_PROJECT_ID and VITE_CONTRACT_ADDRESS

# Start development server
npm run dev
```

### 🔧 **Environment Variables**

**Blockchain (.env)**
```env
PRIVATE_KEY=your-private-key-here
SEPOLIA_RPC_URL=https://your-sepolia-provider.example
ETHERSCAN_API_KEY=your-etherscan-api-key
```

**Frontend (.env)**
```env
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
VITE_SEPOLIA_RPC_URL=https://your-sepolia-provider.example
VITE_CONTRACT_ADDRESS=0xYourSepoliaQuantumTicketAddress
```

## 🏗️ **Architecture**

### **Smart Contract: QuantumTicket.sol**

Built on Solidity 0.8.20 with OpenZeppelin security standards:

- **ERC-721 NFT Standard** - Full NFT implementation with URI storage
- **Event Management** - Create, deactivate, and manage events
- **Ticket Purchase** - Buy tickets with platform fee (0.0001 ETH)
- **Anti-Scalping** - Max 5 tickets per wallet per event
- **Transfer Locks** - Tickets cannot be transferred before event date
- **Scanner Authorization** - Event organizers can authorize scanners
- **Entry Time Control** - Configurable entry open times (default: 2 hours before event)
- **Pull Payment Pattern** - Organizers withdraw accumulated funds
- **Refund System** - Organizers can refund tickets (deducted from balance)
- **Emergency Controls** - Pause functionality for contract owner

### **Frontend Architecture**

**Tech Stack:**
- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **Wagmi v2** - React hooks for Ethereum
- **RainbowKit** - Beautiful wallet connection UI
- **Ethers.js v5** - Ethereum library
- **React Router** - Client-side routing

**Key Components:**
- `HomePage` - Landing page with featured events
- `Events` - Browse and purchase tickets
- `MintTicket` - Create new events (organizers)
- `TicketList` - View and manage owned tickets
- `OrganizerDashboard` - Manage events, scanners, funds, refunds
- `ScannerTicketView` - Validate tickets at venue entry
- `ConnectButton` - Wallet connection UI

## 🎯 **Core Features**

### ✅ **Event Management**
- Create events with customizable details (name, date, venue, price, max tickets)
- Set entry open time (when scanning/validation begins)
- Deactivate events to stop ticket sales
- View event statistics (tickets sold, revenue)

### ✅ **Ticket System**
- **Purchase Tickets** - Buy tickets for active events
- **NFT Ownership** - Each ticket is a unique NFT token
- **Purchase Limits** - Maximum 5 tickets per wallet per event (anti-scalping)
- **Transfer Restrictions** - Tickets locked until after event date
- **Ticket Validation** - Mark tickets as used at venue entry
- **Entry Time Control** - Validation only allowed after entry open time

### ✅ **Organizer Features**
- **Fund Withdrawal** - Withdraw accumulated ticket sales
- **Scanner Management** - Add/remove authorized scanners per event
- **Refund System** - Refund tickets (burns NFT, returns payment)
- **Event Analytics** - View tickets sold and revenue per event
- **Balance Management** - Keep funds for refunds or withdraw

### ✅ **Scanner Features**
- **Ticket Lookup** - Enter token ID to view ticket details
- **Validation** - Mark tickets as used (only if authorized and entry time passed)
- **Status Check** - See if ticket is valid, used, or entry not yet open
- **Authorization Check** - Verify scanner status for event

### ✅ **Security Features**
- **OpenZeppelin Standards** - Battle-tested security patterns
- **Reentrancy Protection** - NonReentrant modifiers
- **Access Control** - Role-based permissions (owner, organizer, scanner)
- **Transfer Locks** - Prevent scalping before events
- **Purchase Limits** - Anti-scalping per-wallet limits
- **Emergency Pause** - Contract owner can pause operations

## 📁 **Project Structure**

```
quantumTicket/
├── blockchain/                    # Smart contracts & deployment
│   ├── contracts/
│   │   └── QuantumTicket.sol     # Main NFT contract (407 lines)
│   ├── scripts/
│   │   ├── deploy.js             # Deployment script
│   │   └── mintTestTicket.js     # Test ticket minting
│   ├── test/                     # Contract tests
│   ├── hardhat.config.js         # Hardhat configuration
│   └── package.json
│
└── frontend/                      # React application
    ├── src/
    │   ├── components/           # React components
    │   │   ├── HomePage.jsx
    │   │   ├── Events.jsx
    │   │   ├── MintTicket.jsx
    │   │   ├── TicketList.jsx
    │   │   ├── OrganizerDashboard.jsx
    │   │   ├── ScannerTicketView.jsx
    │   │   ├── ConnectButton.jsx
    │   │   └── WalletConnect.jsx
    │   ├── hooks/                # Custom React hooks
    │   │   ├── useWallet.js
    │   │   ├── useContract.js
    │   │   └── useEthersSigner.js
    │   ├── services/              # Business logic
    │   │   └── ticketIndexer.js   # Client-side ticket indexing
    │   ├── contracts/            # Contract ABIs
    │   ├── wallet/               # Wallet configuration
    │   └── styles/               # CSS styling
    ├── public/
    │   └── quantumticket-logo.svg # Favicon
    └── package.json
```

## 🧪 **Testing**

### **Smart Contract Tests**
```bash
cd blockchain
npm test
```

### **Frontend Linting**
```bash
cd frontend
npm run lint
```

### **Build Production**
```bash
cd frontend
npm run build
```

## 🚀 **Deployment**

### **Smart Contract Deployment**

1. **Deploy to Sepolia Testnet:**
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network sepolia
```

2. **Update Frontend:**
   - Add deployed contract address to `frontend/.env`
   - Set `VITE_CONTRACT_ADDRESS=0x...`

### **Frontend Deployment (GitHub Pages)**

The frontend deploys to GitHub Pages through `.github/workflows/deploy.yml`:

1. In the repository, enable **Settings → Pages → Source: GitHub Actions**.
2. Add repository **Variables** (Settings → Secrets and variables → Actions → Variables):
   - `VITE_CONTRACT_ADDRESS` — the deployed contract address
   - `VITE_SEPOLIA_RPC_URL` — a Sepolia RPC endpoint
3. Add the **Secret** `VITE_WALLETCONNECT_PROJECT_ID` (Actions → Secrets).
4. Push to `main`; the workflow runs contract tests, lints and builds the frontend, then publishes to
   `https://subhajitlucky.github.io/quantumTicket/`.

Deep links are supported through a generated `404.html` fallback, and the Vite base path switches to
`/quantumTicket/` automatically when `GITHUB_PAGES=true` is set by the workflow.

## 🔐 **Security Considerations**

- ✅ **Private Keys** - Never commit `.env` files (already in `.gitignore`)
- ✅ **Environment Variables** - All secrets use environment variables
- ✅ **Contract Addresses** - Public addresses are safe to commit
- ✅ **OpenZeppelin** - Using audited security patterns
- ✅ **Refund Escrow** - Ticket sales stay escrowed until the event date, so pre-event refunds are always funded
- ✅ **Fee Isolation** - Platform fees are tracked separately and can never touch organizer escrow
- ⚠️ **Scanner Authorization** - Only authorized scanners (or the ticket owner) can validate tickets

## 📊 **Smart Contract Details**

**Contract:** `QuantumTicket.sol`
- **Standard:** ERC-721 (NFT)
- **Network:** Ethereum Sepolia Testnet
- **Platform Fee:** 0.0001 ETH (fixed)
- **Max Tickets per Wallet:** 5 per event
- **Transfer Lock:** Until after event date

**Key Functions:**
- `createEvent()` - Create new events
- `buyTicket()` - Purchase tickets
- `useTicket()` - Validate/use tickets
- `setScanner()` - Authorize scanners
- `withdrawOrganizerFunds()` - Withdraw sales
- `refundTicket()` - Refund tickets
- `deactivateEvent()` - Stop ticket sales

## 🎨 **UI/UX Features**

- **Responsive Design** - Works on mobile, tablet, and desktop
- **Dark/Light Theme** - Theme support (ready for implementation)
- **Success/Error Messages** - Clear user feedback
- **Loading States** - Spinner indicators during transactions
- **Transaction Links** - View transactions on Etherscan
- **Ticket Display** - Beautiful ticket cards with all details
- **Event Grid** - Browse events in responsive grid layout
- **Hamburger Menu** - Mobile-friendly navigation

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Subhajit](https://github.com/subhajitlucky)**

*🚀 Building the future of event ticketing, one block at a time*

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/subhajitlucky)

</div>
