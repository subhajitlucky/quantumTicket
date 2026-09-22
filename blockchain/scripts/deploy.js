const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying QuantumTicket contract...");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer has no ETH. Fund the account with Sepolia ETH first.");
  }

  const QuantumTicket = await ethers.getContractFactory("QuantumTicket");
  const quantumTicket = await QuantumTicket.deploy();
  await quantumTicket.waitForDeployment();

  const contractAddress = await quantumTicket.getAddress();
  const finalBalance = await ethers.provider.getBalance(deployer.address);

  console.log("\n✅ QuantumTicket deployed to:", contractAddress);
  console.log("💰 Remaining balance:", ethers.formatEther(finalBalance), "ETH");
  console.log("📝 Contract name:", await quantumTicket.name());
  console.log("📝 Contract symbol:", await quantumTicket.symbol());
  console.log("📝 Contract owner:", await quantumTicket.owner());

  console.log("\nNext steps:");
  console.log(`1. Update VITE_CONTRACT_ADDRESS in Vercel and locally: ${contractAddress}`);
  console.log(`2. Verify on Etherscan: npx hardhat verify --network sepolia ${contractAddress}`);
  console.log("3. Seed demo events: npx hardhat run scripts/seed-demo-events.js --network sepolia");
  console.log(`4. View: https://sepolia.etherscan.io/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
