const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventTicket", function () {
  let EventTicket;
  let eventTicket;
  let owner;
  let addr1;
  let addr2;
  let eventDate;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    EventTicket = await ethers.getContractFactory("EventTicket");
    eventTicket = await EventTicket.deploy();
    
    // Set event date to 24 hours from now
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    eventDate = block.timestamp + 86400; // 24 hours from now
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await eventTicket.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await eventTicket.name()).to.equal("EventTicket");
      expect(await eventTicket.symbol()).to.equal("ETKT");
    });
  });

  describe("Minting", function () {
    const eventName = "Concert";
    const venue = "Stadium";
    const price = ethers.parseEther("0.1");
    const uri = "ipfs://QmTicketURI";

    it("Should allow owner to mint tickets", async function () {
      await expect(eventTicket.mintTicket(addr1.address, eventName, eventDate, venue, price, uri))
        .to.emit(eventTicket, "TicketMinted")
        .withArgs(addr1.address, 0, eventName);

      const ticket = await eventTicket.tickets(0);
      expect(ticket.eventName).to.equal(eventName);
      expect(ticket.venue).to.equal(venue);
      expect(ticket.price).to.equal(price);
      expect(ticket.isUsed).to.equal(false);
    });

    it("Should not allow non-owner to mint tickets", async function () {
      await expect(
        eventTicket.connect(addr1).mintTicket(addr2.address, eventName, eventDate, venue, price, uri)
      ).to.be.revertedWithCustomError(eventTicket, "OwnableUnauthorizedAccount");
    });

    it("Should not allow minting tickets for past dates", async function () {
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const pastDate = block.timestamp - 86400; // 24 hours ago
      
      await expect(
        eventTicket.mintTicket(addr1.address, "Past Event", pastDate, venue, price, uri)
      ).to.be.revertedWith("Event date must be in the future");
    });
  });

  describe("Using Tickets", function () {
    const eventName = "Concert";
    const venue = "Stadium";
    const price = ethers.parseEther("0.1");
    const uri = "ipfs://QmTicketURI";

    beforeEach(async function () {
      await eventTicket.mintTicket(addr1.address, eventName, eventDate, venue, price, uri);
    });

    it("Should not allow using ticket before event date", async function () {
      await expect(
        eventTicket.connect(addr1).useTicket(0)
      ).to.be.revertedWith("Event has not started yet");
    });

    it("Should not allow non-owner to use ticket", async function () {
      await expect(
        eventTicket.connect(addr2).useTicket(0)
      ).to.be.revertedWith("Not ticket owner or approved");
    });

    it("Should allow ticket owner to use ticket after event date", async function () {
      // Increase time to after event date
      await ethers.provider.send("evm_increaseTime", [86401]); // 24 hours + 1 second
      await ethers.provider.send("evm_mine");

      await expect(eventTicket.connect(addr1).useTicket(0))
        .to.emit(eventTicket, "TicketUsed")
        .withArgs(0);

      const ticket = await eventTicket.tickets(0);
      expect(ticket.isUsed).to.equal(true);
    });

    it("Should not allow using ticket twice", async function () {
      // Increase time to after event date
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      await eventTicket.connect(addr1).useTicket(0);
      await expect(
        eventTicket.connect(addr1).useTicket(0)
      ).to.be.revertedWith("Ticket already used");
    });
  });
}); 