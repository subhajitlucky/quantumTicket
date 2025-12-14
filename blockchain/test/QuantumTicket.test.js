const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumTicket", function () {
  let QuantumTicket;
  let quantumTicket;
  let owner;
  let organizer;
  let buyer1;
  let buyer2;
  let scanner;
  let eventDate;
  let entryOpenTime;
  let platformFee;

  beforeEach(async function () {
    [owner, organizer, buyer1, buyer2, scanner] = await ethers.getSigners();
    QuantumTicket = await ethers.getContractFactory("QuantumTicket");
    quantumTicket = await QuantumTicket.deploy();

    // Set event date to 24 hours from now
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    eventDate = block.timestamp + 86400; // 24 hours from now
    entryOpenTime = eventDate - 7200; // 2 hours before event (default)

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
      expect(await quantumTicket.PLATFORM_FEE()).to.equal(ethers.parseEther("0.0001"));
    });

    it("Should have MAX_PER_WALLET constant", async function () {
      expect(await quantumTicket.MAX_PER_WALLET()).to.equal(5);
    });
  });

  describe("Event Creation", function () {
    it("Should allow anyone to create an event with entryOpenTime", async function () {
      const eventName = "Quantum Concert";
      const venue = "Cyber Stadium";
      const ticketPrice = ethers.parseEther("0.1");
      const maxTickets = 100;
      const metadataURI = "ipfs://QmEventURI";

      await expect(quantumTicket.connect(organizer).createEvent(
        eventName, eventDate, 0, venue, ticketPrice, maxTickets, metadataURI
      )).to.emit(quantumTicket, "EventCreated")
        .withArgs(0, eventName, organizer.address, ticketPrice);

      const eventDetails = await quantumTicket.getEventDetails(0);
      expect(eventDetails.eventName).to.equal(eventName);
      expect(eventDetails.organizer).to.equal(organizer.address);
      expect(eventDetails.maxTickets).to.equal(maxTickets);
      expect(eventDetails.isActive).to.equal(true);
      // entryOpenTime should be 2 hours before event (default)
      expect(eventDetails.entryOpenTime).to.equal(eventDate - 7200);
    });

    it("Should allow custom entryOpenTime", async function () {
      const customEntryTime = eventDate - 3600; // 1 hour before

      await quantumTicket.connect(organizer).createEvent(
        "Custom Entry Event", eventDate, customEntryTime, "Venue",
        ethers.parseEther("0.1"), 100, "uri"
      );

      const eventDetails = await quantumTicket.getEventDetails(0);
      expect(eventDetails.entryOpenTime).to.equal(customEntryTime);
    });

    it("Should not allow creating events with past dates", async function () {
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const pastDate = block.timestamp - 86400;

      await expect(
        quantumTicket.createEvent("Past Event", pastDate, 0, "Venue", ethers.parseEther("0.1"), 100, "uri")
      ).to.be.revertedWith("Event date must be in the future");
    });

    it("Should not allow zero ticket price", async function () {
      await expect(
        quantumTicket.createEvent("Free Event", eventDate, 0, "Venue", 0, 100, "uri")
      ).to.be.revertedWith("Ticket price must be greater than 0");
    });

    it("Should not allow more than 100,000 tickets", async function () {
      await expect(
        quantumTicket.createEvent("Mega Stadium Event", eventDate, 0, "Stadium", ethers.parseEther("0.1"), 100001, "uri")
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
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, 0, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      eventId = 0;
    });

    it("Should allow buying tickets with exact payment", async function () {
      await expect(quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired }))
        .to.emit(quantumTicket, "TicketMinted")
        .withArgs(buyer1.address, 0, eventId);

      const ticketDetails = await quantumTicket.getTicketDetails(0);
      expect(ticketDetails.eventId).to.equal(eventId);
      expect(ticketDetails.isUsed).to.equal(false);
    });

    it("Should accumulate balance for organizer (pull payment)", async function () {
      await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired });

      // Balance should be accumulated, not transferred directly
      const organizerBalance = await quantumTicket.organizerBalances(organizer.address);
      expect(organizerBalance).to.equal(ticketPrice);
    });

    it("Should refund excess payment", async function () {
      const overpayment = ethers.parseEther("0.2");
      const balanceBefore = await ethers.provider.getBalance(buyer1.address);

      const tx = await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: overpayment });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(buyer1.address);

      expect(balanceAfter).to.be.closeTo(
        balanceBefore - totalRequired - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("Should not allow insufficient payment", async function () {
      const insufficientPayment = ethers.parseEther("0.05");

      await expect(
        quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment for ticket and platform fee");
    });

    it("Should prevent buying tickets for sold out events", async function () {
      // Create event with only 1 ticket
      await quantumTicket.connect(organizer).createEvent(
        "Small Event", eventDate, 0, "Small Venue", ticketPrice, 1, "ipfs://small"
      );
      const smallEventId = 1;

      await quantumTicket.connect(buyer1).buyTicket(smallEventId, "ipfs://ticket1", { value: totalRequired });

      await expect(
        quantumTicket.connect(buyer2).buyTicket(smallEventId, "ipfs://ticket2", { value: totalRequired })
      ).to.be.revertedWith("Event is sold out");
    });

    it("Should enforce per-wallet purchase limit (anti-scalping)", async function () {
      // Buy MAX_PER_WALLET tickets
      for (let i = 0; i < 5; i++) {
        await quantumTicket.connect(buyer1).buyTicket(eventId, `ipfs://ticket${i}`, { value: totalRequired });
      }

      // 6th purchase should fail
      await expect(
        quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket6", { value: totalRequired })
      ).to.be.revertedWith("Purchase limit reached");
    });

    it("Should track tickets bought per wallet per event", async function () {
      await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired });

      const ticketsBought = await quantumTicket.ticketsBought(eventId, buyer1.address);
      expect(ticketsBought).to.equal(1);
    });
  });

  describe("Scanner Role Management", function () {
    let eventId;
    let ticketPrice;
    let totalRequired;

    beforeEach(async function () {
      ticketPrice = ethers.parseEther("0.1");
      totalRequired = ticketPrice + platformFee;
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, 0, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      eventId = 0;
    });

    it("Should allow organizer to set scanner", async function () {
      await expect(quantumTicket.connect(organizer).setScanner(eventId, scanner.address, true))
        .to.emit(quantumTicket, "ScannerUpdated")
        .withArgs(eventId, scanner.address, true);

      expect(await quantumTicket.scanners(eventId, scanner.address)).to.equal(true);
    });

    it("Should not allow non-organizer to set scanner", async function () {
      await expect(
        quantumTicket.connect(buyer1).setScanner(eventId, scanner.address, true)
      ).to.be.revertedWith("Not event organizer");
    });

    it("Should allow organizer to revoke scanner", async function () {
      await quantumTicket.connect(organizer).setScanner(eventId, scanner.address, true);
      await quantumTicket.connect(organizer).setScanner(eventId, scanner.address, false);

      expect(await quantumTicket.scanners(eventId, scanner.address)).to.equal(false);
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
        "Test Event", eventDate, 0, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      eventId = 0;

      await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired });
      tokenId = 0;
    });

    it("Should not allow using ticket before entry time", async function () {
      await expect(
        quantumTicket.connect(buyer1).useTicket(tokenId)
      ).to.be.revertedWith("Entry not yet open");
    });

    it("Should allow ticket owner to use ticket after entry opens", async function () {
      // Fast forward to entry time (2 hours before event)
      await ethers.provider.send("evm_increaseTime", [86400 - 7200 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(quantumTicket.connect(buyer1).useTicket(tokenId))
        .to.emit(quantumTicket, "TicketUsed")
        .withArgs(tokenId, eventId);

      const ticketDetails = await quantumTicket.getTicketDetails(tokenId);
      expect(ticketDetails.isUsed).to.equal(true);
    });

    it("Should allow scanner to use ticket", async function () {
      // Set scanner
      await quantumTicket.connect(organizer).setScanner(eventId, scanner.address, true);

      // Fast forward to entry time
      await ethers.provider.send("evm_increaseTime", [86400 - 7200 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(quantumTicket.connect(scanner).useTicket(tokenId))
        .to.emit(quantumTicket, "TicketUsed")
        .withArgs(tokenId, eventId);
    });

    it("Should not allow unauthorized user to use ticket", async function () {
      // Fast forward to entry time
      await ethers.provider.send("evm_increaseTime", [86400 - 7200 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        quantumTicket.connect(buyer2).useTicket(tokenId)
      ).to.be.revertedWith("Not ticket owner or scanner");
    });

    it("Should not allow using ticket twice", async function () {
      await ethers.provider.send("evm_increaseTime", [86400 - 7200 + 1]);
      await ethers.provider.send("evm_mine");

      await quantumTicket.connect(buyer1).useTicket(tokenId);

      await expect(
        quantumTicket.connect(buyer1).useTicket(tokenId)
      ).to.be.revertedWith("Ticket already used");
    });
  });

  describe("Transfer Lock", function () {
    let eventId;
    let tokenId;
    let ticketPrice;
    let totalRequired;

    beforeEach(async function () {
      ticketPrice = ethers.parseEther("0.1");
      totalRequired = ticketPrice + platformFee;
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, 0, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      eventId = 0;

      await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired });
      tokenId = 0;
    });

    it("Should block transfers before event date", async function () {
      await expect(
        quantumTicket.connect(buyer1).transferFrom(buyer1.address, buyer2.address, tokenId)
      ).to.be.revertedWith("Transfers disabled before event");
    });

    it("Should allow transfers after event date", async function () {
      // Fast forward past event date
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      await quantumTicket.connect(buyer1).transferFrom(buyer1.address, buyer2.address, tokenId);

      expect(await quantumTicket.ownerOf(tokenId)).to.equal(buyer2.address);
    });
  });

  describe("Organizer Withdrawal", function () {
    let eventId;
    let ticketPrice;
    let totalRequired;

    beforeEach(async function () {
      ticketPrice = ethers.parseEther("0.1");
      totalRequired = ticketPrice + platformFee;
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, 0, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      eventId = 0;
    });

    it("Should allow organizer to withdraw accumulated funds", async function () {
      // Buy multiple tickets
      await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired });
      await quantumTicket.connect(buyer2).buyTicket(eventId, "ipfs://ticket2", { value: totalRequired });

      const expectedBalance = ticketPrice * 2n;
      expect(await quantumTicket.organizerBalances(organizer.address)).to.equal(expectedBalance);

      const organizerBalanceBefore = await ethers.provider.getBalance(organizer.address);

      const tx = await quantumTicket.connect(organizer).withdrawOrganizerFunds();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const organizerBalanceAfter = await ethers.provider.getBalance(organizer.address);

      expect(organizerBalanceAfter).to.be.closeTo(
        organizerBalanceBefore + expectedBalance - gasUsed,
        ethers.parseEther("0.001")
      );

      // Balance should be zero after withdrawal
      expect(await quantumTicket.organizerBalances(organizer.address)).to.equal(0);
    });

    it("Should emit OrganizerWithdrawal event", async function () {
      await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired });

      await expect(quantumTicket.connect(organizer).withdrawOrganizerFunds())
        .to.emit(quantumTicket, "OrganizerWithdrawal")
        .withArgs(organizer.address, ticketPrice);
    });

    it("Should revert if nothing to withdraw", async function () {
      await expect(
        quantumTicket.connect(organizer).withdrawOrganizerFunds()
      ).to.be.revertedWith("Nothing to withdraw");
    });
  });

  describe("Refund Mechanism", function () {
    let eventId;
    let tokenId;
    let ticketPrice;
    let totalRequired;

    beforeEach(async function () {
      ticketPrice = ethers.parseEther("0.1");
      totalRequired = ticketPrice + platformFee;
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, 0, "Test Venue", ticketPrice, 100, "ipfs://test"
      );
      eventId = 0;

      await quantumTicket.connect(buyer1).buyTicket(eventId, "ipfs://ticket1", { value: totalRequired });
      tokenId = 0;
    });

    it("Should allow organizer to refund ticket", async function () {
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer1.address);

      await expect(quantumTicket.connect(organizer).refundTicket(tokenId))
        .to.emit(quantumTicket, "RefundIssued")
        .withArgs(buyer1.address, ticketPrice);

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer1.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(ticketPrice);

      // Ticket should be burned
      await expect(quantumTicket.ownerOf(tokenId)).to.be.reverted;
    });

    it("Should not allow non-organizer to refund", async function () {
      await expect(
        quantumTicket.connect(buyer1).refundTicket(tokenId)
      ).to.be.revertedWith("Not event organizer");
    });

    it("Should not allow refund of used ticket", async function () {
      // Fast forward to entry time
      await ethers.provider.send("evm_increaseTime", [86400 - 7200 + 1]);
      await ethers.provider.send("evm_mine");

      await quantumTicket.connect(buyer1).useTicket(tokenId);

      await expect(
        quantumTicket.connect(organizer).refundTicket(tokenId)
      ).to.be.revertedWith("Ticket already used");
    });

    it("Should decrease ticketsSold on refund", async function () {
      const eventBefore = await quantumTicket.getEventDetails(eventId);
      expect(eventBefore.ticketsSold).to.equal(1);

      await quantumTicket.connect(organizer).refundTicket(tokenId);

      const eventAfter = await quantumTicket.getEventDetails(eventId);
      expect(eventAfter.ticketsSold).to.equal(0);
    });
  });

  describe("Pause Functionality", function () {
    let eventId;
    let ticketPrice;
    let totalRequired;

    beforeEach(async function () {
      ticketPrice = ethers.parseEther("0.1");
      totalRequired = ticketPrice + platformFee;
    });

    it("Should allow owner to pause", async function () {
      await quantumTicket.connect(owner).pause();
      expect(await quantumTicket.paused()).to.equal(true);
    });

    it("Should allow owner to unpause", async function () {
      await quantumTicket.connect(owner).pause();
      await quantumTicket.connect(owner).unpause();
      expect(await quantumTicket.paused()).to.equal(false);
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        quantumTicket.connect(organizer).pause()
      ).to.be.revertedWithCustomError(quantumTicket, "OwnableUnauthorizedAccount");
    });

    it("Should block createEvent when paused", async function () {
      await quantumTicket.connect(owner).pause();

      await expect(
        quantumTicket.connect(organizer).createEvent(
          "Paused Event", eventDate, 0, "Venue", ticketPrice, 100, "uri"
        )
      ).to.be.revertedWithCustomError(quantumTicket, "EnforcedPause");
    });

    it("Should block buyTicket when paused", async function () {
      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, 0, "Venue", ticketPrice, 100, "uri"
      );

      await quantumTicket.connect(owner).pause();

      await expect(
        quantumTicket.connect(buyer1).buyTicket(0, "ipfs://ticket1", { value: totalRequired })
      ).to.be.revertedWithCustomError(quantumTicket, "EnforcedPause");
    });
  });

  describe("Platform Management", function () {
    it("Should allow owner to withdraw platform fees", async function () {
      const ticketPrice = ethers.parseEther("0.1");
      const totalRequired = ticketPrice + platformFee;

      await quantumTicket.connect(organizer).createEvent(
        "Test Event", eventDate, 0, "Test Venue", ticketPrice, 100, "ipfs://test"
      );

      await quantumTicket.connect(buyer1).buyTicket(0, "ipfs://ticket1", { value: totalRequired });

      // Organizer withdraws their funds first
      await quantumTicket.connect(organizer).withdrawOrganizerFunds();

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
        "Test Event", eventDate, 0, "Test Venue", ticketPrice, 100, "ipfs://test"
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
        "Test Event", eventDate, 0, "Test Venue", ticketPrice, 100, "ipfs://test"
      );

      await quantumTicket.connect(buyer1).buyTicket(0, "ipfs://ticket1", { value: totalRequired });
      await quantumTicket.connect(buyer1).buyTicket(0, "ipfs://ticket2", { value: totalRequired });
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

    it("Should return correct total counts", async function () {
      expect(await quantumTicket.getTotalEvents()).to.equal(1);
      expect(await quantumTicket.getTotalTickets()).to.equal(2);
    });
  });
});