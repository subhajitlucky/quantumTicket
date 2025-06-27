const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumTicket", function () {
  let QuantumTicket;
  let quantumTicket;
  let owner;
  let organizer;
  let buyer1;
  let buyer2;
  let eventDate;
  let platformFee;

  beforeEach(async function () {
    [owner, organizer, buyer1, buyer2] = await ethers.getSigners();
    QuantumTicket = await ethers.getContractFactory("QuantumTicket");
    quantumTicket = await QuantumTicket.deploy();
    
    // Set event date to 24 hours from now
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    eventDate = block.timestamp + 86400; // 24 hours from now
    
    // Get platform fee
    platformFee = await quantumTicket.PLATFORM_FEE();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await quantumTicket.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await quantumTicket.name()).to.equal("QuantumTicket");
      expect(await quantumTicket.symbol()).to.equal("QTKT");
    });

    it("Should start with zero events and tickets", async function () {
      expect(await quantumTicket.getTotalEvents()).to.equal(0);
      expect(await quantumTicket.getTotalTickets()).to.equal(0);
    });

    it("Should have fixed platform fee", async function () {
      expect(await quantumTicket.PLATFORM_FEE()).to.equal(ethers.parseEther("0.0001")); // 0.0001 ETH
    });
  });

  describe("Event Creation", function () {
    it("Should allow anyone to create an event", async function () {
      const eventName = "Quantum Concert";
      const venue = "Cyber Stadium";
      const ticketPrice = ethers.parseEther("0.1");
      const maxTickets = 100;
      const metadataURI = "ipfs://QmEventURI";

      await expect(quantumTicket.connect(organizer).createEvent(
        eventName, eventDate, venue, ticketPrice, maxTickets, metadataURI
      )).to.emit(quantumTicket, "EventCreated")
        .withArgs(0, eventName, organizer.address, ticketPrice);

      const eventDetails = await quantumTicket.getEventDetails(0);
      expect(eventDetails.eventName).to.equal(eventName);
      expect(eventDetails.organizer).to.equal(organizer.address);
      expect(eventDetails.maxTickets).to.equal(maxTickets);
      expect(eventDetails.isActive).to.equal(true);
    });

    it("Should not allow creating events with past dates", async function () {
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const pastDate = block.timestamp - 86400;
      
      await expect(
        quantumTicket.createEvent("Past Event", pastDate, "Venue", ethers.parseEther("0.1"), 100, "uri")
      ).to.be.revertedWith("Event date must be in the future");
    });

    it("Should not allow zero ticket price", async function () {
      await expect(
        quantumTicket.createEvent("Free Event", eventDate, "Venue", 0, 100, "uri")
      ).to.be.revertedWith("Ticket price must be greater than 0");
    });

    it("Should not allow more than 100,000 tickets", async function () {
      await expect(
        quantumTicket.createEvent("Mega Stadium Event", eventDate, "Stadium", ethers.parseEther("0.1"), 100001, "uri")
      ).to.be.revertedWith("Max tickets cannot exceed 100,000");
    });
  });

  describe("Ticket Purchasing", function () {
    let eventId;
    let ticketPrice;
    let totalRequired;

    beforeEach(async function () {
      ticketPrice = ethers.parseEther("0.1");
      totalRequired = ticketPrice + platformFee;
      const tx = await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      const receipt = await tx.wait();
      eventId = 0; // First event
    });

    it("Should allow buying tickets with exact payment", async function () {
      await expect(quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired }))
        .to.emit(quantumTicket, "TicketMinted")
        .withArgs(buyer1.address, 0, eventId);

      const ticketDetails = await quantumTicket.getTicketDetails(0);
      expect(ticketDetails.eventId).to.equal(eventId);
      expect(ticketDetails.isUsed).to.equal(false);
    });

    it("Should refund excess payment", async function () {
      const overpayment = ethers.parseEther("0.2"); // Pay more than needed
      const balanceBefore = await ethers.provider.getBalance(buyer1.address);
      
      const tx = await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: overpayment });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(buyer1.address);
      
      // Should only charge ticket price + platform fee + gas
      expect(balanceAfter).to.be.closeTo(
        balanceBefore - totalRequired - gasUsed,
        ethers.parseEther("0.001") // Small variance for gas estimation
      );
    });

    it("Should transfer payment directly to organizer", async function () {
      const organizerBalanceBefore = await ethers.provider.getBalance(organizer.address);
      
      await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired });
      
      const organizerBalanceAfter = await ethers.provider.getBalance(organizer.address);
      
      expect(organizerBalanceAfter - organizerBalanceBefore).to.equal(ticketPrice);
    });

    it("Should not allow insufficient payment", async function () {
      const insufficientPayment = ethers.parseEther("0.05");
      
      await expect(
        quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment for ticket and platform fee");
    });

    it("Should prevent buying tickets for sold out events", async function () {
      // Create event with only 1 ticket
      const tx = await quantumTicket.connect(organizer).createEvent(
        "Small Event", eventDate, "Small Venue", ticketPrice, 1, "ipfs://small"
      );
      const smallEventId = 1;
      
      // Buy the only ticket
      await quantumTicket.connect(buyer1).buyTicket(smallEventId, "ipfs://ticket1", { value: totalRequired });
      
      // Try to buy another ticket
      await expect(
        quantumTicket.connect(buyer2).buyTicket(smallEventId, "ipfs://ticket2", { value: totalRequired })
      ).to.be.revertedWith("Event is sold out");
    });
  });

  describe("Ticket Usage", function () {
    let eventId;
    let tokenId;
    let ticketPrice;
    let totalRequired;

    beforeEach(async function () {
      ticketPrice = ethers.parseEther("0.1");
      totalRequired = ticketPrice + platformFee;
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      eventId = 0;
      
      await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired });
      tokenId = 0;
    });

    it("Should not allow using ticket before event date", async function () {
      await expect(
        quantumTicket.connect(buyer1).useTicket(tokenId)
      ).to.be.revertedWith("Event has not started yet");
    });

    it("Should allow using ticket after event starts", async function () {
      // Fast forward to event time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      await expect(quantumTicket.connect(buyer1).useTicket(tokenId))
        .to.emit(quantumTicket, "TicketUsed")
        .withArgs(tokenId, eventId);

      const ticketDetails = await quantumTicket.getTicketDetails(tokenId);
      expect(ticketDetails.isUsed).to.equal(true);
    });

    it("Should not allow using ticket twice", async function () {
      // Fast forward to event time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      await quantumTicket.connect(buyer1).useTicket(tokenId);
      
      await expect(
        quantumTicket.connect(buyer1).useTicket(tokenId)
      ).to.be.revertedWith("Ticket already used");
    });
  });

  describe("Platform Management", function () {
    it("Should allow owner to withdraw platform fees", async function () {
      const ticketPrice = ethers.parseEther("0.1");
      const totalRequired = ticketPrice + platformFee;
      
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      
      await quantumTicket.connect(buyer1).buyTicket(0, "ipfs://ticket1", { value: totalRequired });
      
      const contractBalance = await ethers.provider.getBalance(quantumTicket.target);
      expect(contractBalance).to.equal(platformFee);
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await quantumTicket.connect(owner).withdrawPlatformFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + platformFee - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("Should allow event organizer to deactivate events", async function () {
      const ticketPrice = ethers.parseEther("0.1");
      
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      
      await expect(quantumTicket.connect(organizer).deactivateEvent(0))
        .to.emit(quantumTicket, "EventDeactivated")
        .withArgs(0);
      
      const eventDetails = await quantumTicket.getEventDetails(0);
      expect(eventDetails.isActive).to.equal(false);
    });
  });

  describe("View Functions", function () {
    let ticketPrice;
    let totalRequired;

    beforeEach(async function () {
      ticketPrice = ethers.parseEther("0.1");
      totalRequired = ticketPrice + platformFee;
      
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      
      await quantumTicket.connect(buyer1).buyTicket(0, "ipfs://ticket1", { value: totalRequired });
      await quantumTicket.connect(buyer1).buyTicket(0, "ipfs://ticket2", { value: totalRequired });
    });

    it("Should return user tickets correctly", async function () {
      const userTickets = await quantumTicket.getUserTickets(buyer1.address);
      expect(userTickets.length).to.equal(2);
      expect(userTickets[0]).to.equal(0);
      expect(userTickets[1]).to.equal(1);
    });

    it("Should return correct event details", async function () {
      const eventDetails = await quantumTicket.getEventDetails(0);
      expect(eventDetails.eventName).to.equal("Test Event");
      expect(eventDetails.organizer).to.equal(organizer.address);
      expect(eventDetails.ticketsSold).to.equal(2);
    });

    it("Should return correct ticket details", async function () {
      const ticketDetails = await quantumTicket.getTicketDetails(0);
      expect(ticketDetails.eventId).to.equal(0);
      expect(ticketDetails.isUsed).to.equal(false);
    });
  });
}); 