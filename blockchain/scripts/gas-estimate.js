const { ethers } = require("hardhat");

async function main() {
  console.log("⛽ Gas Cost Analysis for QuantumTicket\n");
  
  // Get the deployed contract
  const contractAddress = "0xAb7EEE8DDAAc0c4A3827a2A0db626f4FAd430B1D";
  const QuantumTicket = await ethers.getContractFactory("QuantumTicket");
  const quantumTicket = QuantumTicket.attach(contractAddress);
  
  const [signer] = await ethers.getSigners();
  
  // Get current gas price
  const gasPrice = await ethers.provider.getGasPrice();
  console.log("💰 Current Gas Price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
  
  // Estimate gas for different operations
  try {
    // 1. Event Creation
    const eventDate = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const createEventGas = await quantumTicket.createEvent.estimateGas(
      "Test Concert",
      eventDate,
      "Test Venue",
      ethers.parseEther("0.1"),
      1000,
      "ipfs://test"
    );
    
    console.log("\n📊 Gas Estimates:");
    console.log("1. Create Event:", createEventGas.toString(), "gas");
    console.log("   Cost:", ethers.formatEther(createEventGas * gasPrice), "ETH");
    
    // 2. Buy Ticket (if we had an event)
    // This is an estimate - actual might vary
    const buyTicketGasEstimate = 150000n; // Typical for minting + storage
    console.log("2. Buy Ticket (estimated):", buyTicketGasEstimate.toString(), "gas");
    console.log("   Cost:", ethers.formatEther(buyTicketGasEstimate * gasPrice), "ETH");
    
    // 3. Use Ticket
    const useTicketGasEstimate = 50000n; // State change
    console.log("3. Use Ticket (estimated):", useTicketGasEstimate.toString(), "gas");
    console.log("   Cost:", ethers.formatEther(useTicketGasEstimate * gasPrice), "ETH");
    
    // 4. Withdraw Funds
    const withdrawGasEstimate = 30000n;
    console.log("4. Withdraw Funds (estimated):", withdrawGasEstimate.toString(), "gas");
    console.log("   Cost:", ethers.formatEther(withdrawGasEstimate * gasPrice), "ETH");
    
    console.log("\n📈 Summary:");
    console.log("✅ Event Creation: ~$", (parseFloat(ethers.formatEther(createEventGas * gasPrice)) * 2500).toFixed(2), "USD");
    console.log("✅ Ticket Purchase: ~$", (parseFloat(ethers.formatEther(buyTicketGasEstimate * gasPrice)) * 2500).toFixed(2), "USD");
    console.log("✅ Ticket Usage: ~$", (parseFloat(ethers.formatEther(useTicketGasEstimate * gasPrice)) * 2500).toFixed(2), "USD");
    
    console.log("\n💡 Optimization Notes:");
    console.log("- Contract is feature-rich, hence higher deployment cost");
    console.log("- Individual operations are reasonably priced");
    console.log("- Consider Layer 2 (Polygon, Arbitrum) for lower costs");
    
  } catch (error) {
    console.log("Error estimating gas:", error.message);
    console.log("\n🔍 Manual Estimates (typical values):");
    console.log("- Create Event: ~120,000 gas ($", (120000 * parseFloat(ethers.formatUnits(gasPrice, "gwei")) * 2500 / 1e9).toFixed(2), "USD)");
    console.log("- Buy Ticket: ~150,000 gas ($", (150000 * parseFloat(ethers.formatUnits(gasPrice, "gwei")) * 2500 / 1e9).toFixed(2), "USD)");
    console.log("- Use Ticket: ~50,000 gas ($", (50000 * parseFloat(ethers.formatUnits(gasPrice, "gwei")) * 2500 / 1e9).toFixed(2), "USD)");
  }
  
  console.log("\n🏭 Deployment Cost Analysis:");
  console.log("- Contract Size: ~122KB (complex but feature-complete)");
  console.log("- Deployment Cost: 0.125 ETH (~$300 USD)");
  console.log("- This is expensive because of:");
  console.log("  • Multiple OpenZeppelin imports");
  console.log("  • Reentrancy protection");
  console.log("  • Complex data structures");
  console.log("  • Comprehensive validation logic");
  
  console.log("\n💰 Cost Reduction Options:");
  console.log("1. Deploy to Polygon/Arbitrum (90% cheaper)");
  console.log("2. Simplify contract (remove some features)");
  console.log("3. Use proxy pattern for upgrades");
  console.log("4. Wait for lower gas prices");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 