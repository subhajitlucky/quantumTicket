const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying QuantumTicket contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the contract
  const QuantumTicket = await ethers.getContractFactory("QuantumTicket");
  const quantumTicket = await QuantumTicket.deploy();

  await quantumTicket.waitForDeployment();

  const contractAddress = await quantumTicket.getAddress();
  console.log("✅ QuantumTicket deployed to:", contractAddress);
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Final balance:", ethers.formatEther(finalBalance));
  
  // Verify the deployment
  console.log("📝 Contract verification info:");
  console.log("Contract Name:", await quantumTicket.name());
  console.log("Contract Symbol:", await quantumTicket.symbol());
  console.log("Contract Owner:", await quantumTicket.owner());
  
  console.log("\n🔧 Update your frontend .env file with:");
  console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
  console.error(error);
    process.exit(1);
}); 