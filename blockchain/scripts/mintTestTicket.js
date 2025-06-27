const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🎫 Minting a test ticket...");
  
  // Get the contract address from .env
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  if (!CONTRACT_ADDRESS) {
    console.error("❌ CONTRACT_ADDRESS not found in .env file");
    return;
  }
  
  if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not found in .env file");
    return;
  }
  
  console.log("📄 Contract Address:", CONTRACT_ADDRESS);
  
  // Set up provider and signer using hardhat network
  const [deployer] = await ethers.getSigners();
  const signer = deployer;
  
  console.log("👤 Wallet Address:", signer.address);
  console.log("💰 Checking balance...");
  
  const balance = await signer.getBalance();
  console.log("💰 Wallet Balance:", ethers.utils.formatEther(balance), "ETH");
  
  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.error("❌ Insufficient balance. Need at least 0.01 ETH for gas fees.");
    return;
  }
  
  // Get the contract
  const EventTicket = await ethers.getContractFactory("EventTicket");
  const contract = EventTicket.attach(CONTRACT_ADDRESS);
  
  console.log("📋 Contract connected successfully");
  
  try {
    // First, let's check if we have any existing tickets
    console.log("\n🔍 Checking existing tickets...");
    try {
      const existingTickets = await contract.getUserTickets(signer.address);
      console.log("🎫 Existing tickets:", existingTickets.length);
      
      if (existingTickets.length > 0) {
        console.log("📝 Existing ticket IDs:", existingTickets.map(id => id.toString()).join(", "));
        
        // Test fetching details of existing tickets
        for (let tokenId of existingTickets) {
          try {
            const details = await contract.getTicketDetails(tokenId);
            console.log(`\n🎫 Ticket #${tokenId.toString()} Details:`);
            console.log("   Event ID:", details.eventId.toString());
            console.log("   Is Used:", details.isUsed);
            console.log("   Event Name:", details.eventDetails.eventName);
            console.log("   Event Date:", new Date(details.eventDetails.eventDate.toNumber() * 1000).toLocaleString());
            console.log("   Venue:", details.eventDetails.venue);
            console.log("   Ticket Price:", ethers.utils.formatEther(details.eventDetails.ticketPrice), "ETH");
          } catch (err) {
            console.error(`❌ Error fetching details for ticket ${tokenId}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.log("⚠️ getUserTickets function might not be available, trying alternative...");
      
      // Alternative: check balance
      const ticketBalance = await contract.balanceOf(signer.address);
      console.log("🎫 Ticket balance:", ticketBalance.toString());
    }
    
    console.log("\n🆕 Creating a new event...");
    
    // Create a test event
    const eventName = "Test Concert 2024";
    const eventDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now
    const venue = "Test Venue Arena";
    const ticketPrice = ethers.utils.parseEther("0.001"); // 0.001 ETH
    const maxTickets = 100;
    
    console.log("📝 Event Details:");
    console.log("   Name:", eventName);
    console.log("   Date:", new Date(eventDate * 1000).toLocaleString());
    console.log("   Venue:", venue);
    console.log("   Price:", ethers.utils.formatEther(ticketPrice), "ETH");
    console.log("   Max Tickets:", maxTickets);
    
    console.log("\n🚀 Creating event transaction...");
    const createEventTx = await contract.createEvent(
      eventName,
      eventDate,
      venue,
      ticketPrice,
      maxTickets,
      { gasLimit: 500000 }
    );
    
    console.log("⏳ Waiting for event creation confirmation...");
    console.log("🔗 Transaction hash:", createEventTx.hash);
    
    const createEventReceipt = await createEventTx.wait();
    console.log("✅ Event created successfully!");
    
    // Get the event ID from the transaction logs
    const eventCreatedEvent = createEventReceipt.events?.find(event => event.event === 'EventCreated');
    const eventId = eventCreatedEvent?.args?.eventId;
    
    console.log("🆔 Event ID:", eventId?.toString());
    
    if (!eventId) {
      console.error("❌ Could not get event ID from transaction");
      return;
    }
    
    console.log("\n🎫 Purchasing ticket...");
    
    // Calculate total cost (ticket price + platform fee)
    const platformFee = ethers.utils.parseEther("0.0001"); // 0.0001 ETH fixed fee
    const totalCost = ticketPrice.add(platformFee);
    
    console.log("💰 Ticket Price:", ethers.utils.formatEther(ticketPrice), "ETH");
    console.log("💰 Platform Fee:", ethers.utils.formatEther(platformFee), "ETH");
    console.log("💰 Total Cost:", ethers.utils.formatEther(totalCost), "ETH");
    
    const purchaseTicketTx = await contract.purchaseTicket(eventId, {
      value: totalCost,
      gasLimit: 500000
    });
    
    console.log("⏳ Waiting for ticket purchase confirmation...");
    console.log("🔗 Transaction hash:", purchaseTicketTx.hash);
    
    const purchaseTicketReceipt = await purchaseTicketTx.wait();
    console.log("✅ Ticket purchased successfully!");
    
    // Get the token ID from the transaction logs
    const transferEvent = purchaseTicketReceipt.events?.find(event => event.event === 'Transfer');
    const tokenId = transferEvent?.args?.tokenId;
    
    console.log("🎫 Token ID:", tokenId?.toString());
    
    if (tokenId) {
      console.log("\n🔍 Fetching ticket details...");
      
      try {
        const ticketDetails = await contract.getTicketDetails(tokenId);
        console.log("\n🎫 Ticket Details:");
        console.log("   Token ID:", tokenId.toString());
        console.log("   Event ID:", ticketDetails.eventId.toString());
        console.log("   Is Used:", ticketDetails.isUsed);
        console.log("   Event Name:", ticketDetails.eventDetails.eventName);
        console.log("   Event Date:", new Date(ticketDetails.eventDetails.eventDate.toNumber() * 1000).toLocaleString());
        console.log("   Venue:", ticketDetails.eventDetails.venue);
        console.log("   Ticket Price:", ethers.utils.formatEther(ticketDetails.eventDetails.ticketPrice), "ETH");
        console.log("   Max Tickets:", ticketDetails.eventDetails.maxTickets.toString());
        
        // Test the getUserTickets function
        console.log("\n🔍 Testing getUserTickets function...");
        try {
          const userTickets = await contract.getUserTickets(signer.address);
          console.log("✅ getUserTickets successful!");
          console.log("🎫 Total tickets owned:", userTickets.length);
          console.log("🎫 Token IDs:", userTickets.map(id => id.toString()).join(", "));
        } catch (err) {
          console.error("❌ getUserTickets failed:", err.message);
          
          // Try alternative method
          console.log("🔄 Trying alternative method (balanceOf)...");
          const ticketBalance = await contract.balanceOf(signer.address);
          console.log("🎫 Balance:", ticketBalance.toString());
          
          if (ticketBalance.gt(0)) {
            console.log("🔄 Trying tokenOfOwnerByIndex...");
            for (let i = 0; i < ticketBalance.toNumber(); i++) {
              try {
                const tokenId = await contract.tokenOfOwnerByIndex(signer.address, i);
                console.log(`🎫 Token ${i}:`, tokenId.toString());
              } catch (err) {
                console.error(`❌ tokenOfOwnerByIndex(${i}) failed:`, err.message);
              }
            }
          }
        }
        
      } catch (err) {
        console.error("❌ Error fetching ticket details:", err.message);
      }
    }
    
    console.log("\n✅ Test completed! Now try refreshing your frontend to see the ticket.");
    console.log("🌐 Make sure you're connected to the same wallet address:", signer.address);
    
  } catch (error) {
    console.error("❌ Error during ticket minting:", error.message);
    if (error.data) {
      console.error("📋 Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 