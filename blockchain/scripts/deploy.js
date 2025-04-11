const hre = require("hardhat");

async function main() {
  console.log("Deploying EventTicket contract...");

  const EventTicket = await hre.ethers.getContractFactory("EventTicket");
  const eventTicket = await EventTicket.deploy();

  await eventTicket.waitForDeployment();

  const address = await eventTicket.getAddress();
  console.log(`EventTicket deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 