import React from 'react'
import './App.css'
import ConnectButton from './components/ConnectButton'
import MintTicket from './components/MintTicket'
import TicketList from './components/TicketList'
import OwnerInfo from './components/OwnerInfo'
import ContractTest from './components/ContractTest'

function App() {
  return (
    <div className="app-container">
      <header>
        <h1>NFT Event Ticketing</h1>
        <ConnectButton />
      </header>
      
      <div className="info-banner">
        <p>
          <strong>Contract Address (Sepolia):</strong> {import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'}
        </p>
        <p>
          <strong>Note:</strong> Only the contract owner can mint tickets. Connect with the owner wallet to create tickets.
        </p>
        <OwnerInfo />
      </div>
      
      <ContractTest />
      
      <main>
        <div className="mint-section">
          <MintTicket />
        </div>
        
        <div className="ticket-section">
          <TicketList />
        </div>
      </main>
      
      <footer>
        <p>© 2023 NFT Event Ticketing</p>
      </footer>
    </div>
  )
}

export default App
