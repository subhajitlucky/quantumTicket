const { ethers } = require("hardhat");

const DAY = 24 * 60 * 60;

const DEMO_EVENTS = [
  {
    name: "Quantum Music Festival",
    inDays: 7,
    venue: "Cyber Stadium, Bhubaneswar",
    ticketPrice: ethers.parseEther("0.001"),
    maxTickets: 100,
    metadataURI: "ipfs://quantumticket/demo/music-festival.json"
  },
  {
    name: "Blockchain Developers Meetup",
    inDays: 14,
    venue: "T-Hub, Hyderabad",
    ticketPrice: ethers.parseEther("0.0005"),
    maxTickets: 60,
    metadataURI: "ipfs://quantumticket/demo/dev-meetup.json"
  },
  {
    name: "Web3 Art Exhibition",
    inDays: 21,
    venue: "India Habitat Centre, New Delhi",
    ticketPrice: ethers.parseEther("0.0001"),
    maxTickets: 150,
    metadataURI: "ipfs://quantumticket/demo/art-exhibition.json"
  }
];

async function main() {
  const [organizer] = await ethers.getSigners();
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Set CONTRACT_ADDRESS in blockchain/.env to the freshly deployed address");
  }

  const quantumTicket = await ethers.getContractAt("QuantumTicket", contractAddress, organizer);
  const now = Math.floor(Date.now() / 1000);

  console.log(`Seeding ${DEMO_EVENTS.length} demo events on ${contractAddress}`);
  console.log(`Organizer: ${organizer.address}\n`);

  for (const demo of DEMO_EVENTS) {
    const eventDate = now + demo.inDays * DAY;
    const tx = await quantumTicket.createEvent(
      demo.name,
      eventDate,
      0, // default entry time: 2 hours before the event
      demo.venue,
      demo.ticketPrice,
      demo.maxTickets,
      demo.metadataURI
    );
    const receipt = await tx.wait();

    const created = receipt.logs
      .map((log) => {
        try {
          return quantumTicket.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "EventCreated");

    const eventId = created ? created.args.eventId.toString() : "?";
    console.log(`✅ #${eventId} ${demo.name} — ${new Date(eventDate * 1000).toISOString().slice(0, 10)} — ${demo.venue}`);
  }

  console.log("\nDone. Refresh the frontend to see the new events.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
