import { ethers } from 'ethers';
import QuantumTicketABI from '../contracts/QuantumTicket.json';

// Env-driven configuration (no public fallbacks)
const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL;
const SEPOLIA_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

// Simple in-memory cache for provider/contract/events
let cachedProvider = null;
let cachedContract = null;
let cachedEvents = null;
let lastEventsFetchMs = 0;

// Tune how long we trust cached event data (ms)
const EVENTS_CACHE_TTL_MS = 120_000; // 2 minutes

export const getReadOnlyProvider = () => {
  if (!SEPOLIA_RPC_URL) {
    throw new Error('VITE_SEPOLIA_RPC_URL is not set');
  }
  if (!cachedProvider) {
    cachedProvider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
  }
  return cachedProvider;
};

export const getReadOnlyContract = () => {
  if (!SEPOLIA_CONTRACT_ADDRESS) {
    throw new Error('VITE_CONTRACT_ADDRESS (Sepolia) is not set');
  }
  if (!cachedContract) {
    cachedContract = new ethers.Contract(
      SEPOLIA_CONTRACT_ADDRESS,
      QuantumTicketABI.abi,
      getReadOnlyProvider()
    );
  }
  return { contract: cachedContract, provider: getReadOnlyProvider() };
};

export const invalidateEventsCache = () => {
  cachedEvents = null;
  lastEventsFetchMs = 0;
};

export const fetchActiveEvents = async () => {
  const now = Date.now();
  if (cachedEvents && now - lastEventsFetchMs < EVENTS_CACHE_TTL_MS) {
    return { events: cachedEvents, fromCache: true };
  }

  const { contract } = getReadOnlyContract();
  const totalEvents = await contract.getTotalEvents();

  const eventPromises = [];
  for (let i = 0; i < totalEvents; i++) {
    eventPromises.push(contract.getEventDetails(i));
  }

  const allEventDetails = await Promise.all(eventPromises);

  const activeEvents = allEventDetails
    .map((eventDetails, i) => ({
      id: i,
      name: eventDetails.eventName,
      date: new Date(eventDetails.eventDate.toNumber() * 1000),
      entryOpenTime: eventDetails.entryOpenTime?.toNumber()
        ? new Date(eventDetails.entryOpenTime.toNumber() * 1000)
        : null,
      venue: eventDetails.venue,
      price: ethers.utils.formatEther(eventDetails.ticketPrice),
      priceWei: eventDetails.ticketPrice,
      soldTickets: eventDetails.ticketsSold.toNumber(),
      maxTickets: eventDetails.maxTickets.toNumber(),
      organizer: eventDetails.organizer,
      isActive: eventDetails.isActive,
    }))
    .filter(event => event.isActive);

  cachedEvents = activeEvents;
  lastEventsFetchMs = now;

  return { events: activeEvents, fromCache: false };
};

