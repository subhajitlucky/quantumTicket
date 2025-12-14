/**
 * Ticket Indexer Service
 * 
 * TEMPORARY FRONTEND-ONLY SOLUTION
 * 
 * This module builds a ticket index by querying blockchain events (TicketMinted, Transfer).
 * It's designed to be easily replaced by The Graph or another indexer later.
 * 
 * How it works:
 * 1. Query TicketMinted events where buyer matches connected wallet
 * 2. Query Transfer events where wallet received tokens
 * 3. Verify current ownership via ownerOf() calls
 * 4. Cache results in localStorage for faster subsequent loads
 * 
 * To migrate to The Graph later:
 * - Replace buildTicketIndex() with a GraphQL query
 * - Keep the same return signature
 * - Components won't need changes
 */

// Cache configuration
const CACHE_KEY_PREFIX = 'qt_tickets_';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cache key for a wallet/chain combination
 */
function getCacheKey(walletAddress, chainId) {
    return `${CACHE_KEY_PREFIX}${chainId}_${walletAddress.toLowerCase()}`;
}

/**
 * Read cached ticket data from localStorage
 * @returns {object|null} Cached data or null if expired/missing
 */
function readCache(walletAddress, chainId) {
    try {
        const key = getCacheKey(walletAddress, chainId);
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const data = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still fresh
        if (now - data.timestamp > CACHE_DURATION_MS) {
            localStorage.removeItem(key);
            return null;
        }

        return data.tokenIds;
    } catch (err) {
        console.warn('Error reading ticket cache:', err);
        return null;
    }
}

/**
 * Write ticket data to localStorage cache
 */
function writeCache(walletAddress, chainId, tokenIds) {
    try {
        const key = getCacheKey(walletAddress, chainId);
        const data = {
            timestamp: Date.now(),
            tokenIds: tokenIds.map(id => id.toString())
        };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
        console.warn('Error writing ticket cache:', err);
    }
}

/**
 * Invalidate cache for a wallet (call after purchase/transfer)
 */
export function invalidateTicketCache(walletAddress, chainId) {
    try {
        const key = getCacheKey(walletAddress, chainId);
        localStorage.removeItem(key);
    } catch (err) {
        console.warn('Error invalidating ticket cache:', err);
    }
}

/**
 * Build list of ticket token IDs owned by a wallet
 * 
 * This queries blockchain events instead of calling getUserTickets()
 * 
 * @param {object} contract - Ethers.js contract instance
 * @param {string} walletAddress - Connected wallet address
 * @param {number} chainId - Current chain ID
 * @param {boolean} skipCache - Force fresh fetch
 * @returns {Promise<string[]>} Array of owned token IDs as strings
 */
export async function buildTicketIndex(contract, walletAddress, chainId, skipCache = false) {
    if (!contract || !walletAddress) {
        return [];
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check cache first
    if (!skipCache) {
        const cached = readCache(walletAddress, chainId);
        if (cached) {
            console.log('[TicketIndexer] Using cached ticket list:', cached);
            return cached;
        }
    }

    console.log('[TicketIndexer] Building ticket index from events for:', walletAddress);

    try {
        // Set of candidate token IDs (might have been transferred away)
        const candidateTokenIds = new Set();

        // 1. Query TicketMinted events where buyer is this wallet
        // Note: TicketMinted(address indexed to, uint256 indexed tokenId, uint256 indexed eventId)
        try {
            const mintFilter = contract.filters.TicketMinted(walletAddress, null, null);
            const mintEvents = await contract.queryFilter(mintFilter);
            console.log(`[TicketIndexer] Found ${mintEvents.length} TicketMinted events`);

            for (const event of mintEvents) {
                candidateTokenIds.add(event.args.tokenId.toString());
            }
        } catch (err) {
            console.warn('[TicketIndexer] Error querying TicketMinted events:', err);
        }

        // 2. Query Transfer events where wallet received tokens
        // Note: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
        try {
            const transferInFilter = contract.filters.Transfer(null, walletAddress, null);
            const transferInEvents = await contract.queryFilter(transferInFilter);
            console.log(`[TicketIndexer] Found ${transferInEvents.length} Transfer-in events`);

            for (const event of transferInEvents) {
                candidateTokenIds.add(event.args.tokenId.toString());
            }
        } catch (err) {
            console.warn('[TicketIndexer] Error querying Transfer events:', err);
        }

        console.log(`[TicketIndexer] Found ${candidateTokenIds.size} candidate tokens`);

        // 3. Verify current ownership for each candidate
        const ownedTokenIds = [];
        const verifyPromises = Array.from(candidateTokenIds).map(async (tokenId) => {
            try {
                const owner = await contract.ownerOf(tokenId);
                if (owner.toLowerCase() === normalizedAddress) {
                    return tokenId;
                }
            } catch (err) {
                // Token might be burned or not exist
                console.warn(`[TicketIndexer] Error checking ownership of token ${tokenId}:`, err.message);
            }
            return null;
        });

        const results = await Promise.all(verifyPromises);
        for (const tokenId of results) {
            if (tokenId !== null) {
                ownedTokenIds.push(tokenId);
            }
        }

        console.log(`[TicketIndexer] Verified ${ownedTokenIds.length} owned tokens`);

        // Sort by token ID for consistent ordering
        ownedTokenIds.sort((a, b) => parseInt(a) - parseInt(b));

        // Cache the results
        writeCache(walletAddress, chainId, ownedTokenIds);

        return ownedTokenIds;

    } catch (err) {
        console.error('[TicketIndexer] Error building ticket index:', err);
        throw err;
    }
}

/**
 * Fetch full ticket details for a token ID
 * 
 * @param {object} contract - Ethers.js contract instance
 * @param {string|number} tokenId - Token ID to fetch
 * @returns {Promise<object>} Enriched ticket object
 */
export async function getTicketWithDetails(contract, tokenId) {
    try {
        // Get basic ticket details
        const details = await contract.getTicketDetails(tokenId);

        // Get full event details
        const eventDetails = await contract.getEventDetails(details.eventId);

        return {
            tokenId: tokenId.toString(),
            eventId: details.eventId.toString(),
            isUsed: details.isUsed,
            eventDetails: {
                eventId: eventDetails.eventId?.toString(),
                eventName: eventDetails.eventName,
                eventDate: eventDetails.eventDate,
                entryOpenTime: eventDetails.entryOpenTime,
                venue: eventDetails.venue,
                ticketPrice: eventDetails.ticketPrice,
                organizer: eventDetails.organizer,
                maxTickets: eventDetails.maxTickets,
                ticketsSold: eventDetails.ticketsSold,
                isActive: eventDetails.isActive,
                metadataURI: eventDetails.metadataURI
            }
        };
    } catch (err) {
        console.error(`[TicketIndexer] Error fetching details for token ${tokenId}:`, err);
        throw err;
    }
}

/**
 * Fetch all ticket details for a list of token IDs
 * 
 * @param {object} contract - Ethers.js contract instance
 * @param {string[]} tokenIds - Array of token IDs
 * @returns {Promise<object[]>} Array of enriched ticket objects
 */
export async function getTicketsWithDetails(contract, tokenIds) {
    const results = await Promise.all(
        tokenIds.map(async (tokenId) => {
            try {
                return await getTicketWithDetails(contract, tokenId);
            } catch (err) {
                console.warn(`[TicketIndexer] Skipping token ${tokenId}:`, err.message);
                return null;
            }
        })
    );

    // Filter out failed fetches
    return results.filter(ticket => ticket !== null);
}

/**
 * Check if a wallet is a scanner for an event
 * 
 * @param {object} contract - Ethers.js contract instance
 * @param {number} eventId - Event ID
 * @param {string} walletAddress - Wallet to check
 * @returns {Promise<boolean>}
 */
export async function isScanner(contract, eventId, walletAddress) {
    try {
        return await contract.scanners(eventId, walletAddress);
    } catch (err) {
        console.warn('[TicketIndexer] Error checking scanner status:', err);
        return false;
    }
}

/**
 * Get organizer balance for a wallet
 * 
 * @param {object} contract - Ethers.js contract instance
 * @param {string} walletAddress - Wallet to check
 * @returns {Promise<BigNumber>}
 */
export async function getOrganizerBalance(contract, walletAddress) {
    try {
        return await contract.organizerBalances(walletAddress);
    } catch (err) {
        console.warn('[TicketIndexer] Error getting organizer balance:', err);
        return null;
    }
}
