/**
 * ScannerTicketView Component
 * 
 * Allows authorized scanners to validate tickets for events.
 * Scanners can enter a ticket ID and validate it for entry.
 */

import React, { useState, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';

const ScannerTicketView = () => {
    const { isConnected, chainId, account } = useWallet();
    const { contract } = useContract();

    const [tokenId, setTokenId] = useState('');
    const [ticketInfo, setTicketInfo] = useState(null);
    const [isScannerForEvent, setIsScannerForEvent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Look up ticket details
    const handleLookup = useCallback(async (e) => {
        e?.preventDefault();
        if (!contract || !tokenId) return;

        try {
            setIsLoading(true);
            setError(null);
            setTicketInfo(null);
            setIsScannerForEvent(false);

            // Get ticket details
            const details = await contract.getTicketDetails(parseInt(tokenId));
            const eventDetails = await contract.getEventDetails(details.eventId);

            // Check if current user is a scanner for this event
            const isScanner = await contract.scanners(details.eventId, account);
            setIsScannerForEvent(isScanner);

            // Get ticket owner
            const owner = await contract.ownerOf(parseInt(tokenId));

            setTicketInfo({
                tokenId: tokenId,
                eventId: details.eventId.toString(),
                isUsed: details.isUsed,
                owner: owner,
                eventDetails: {
                    eventName: eventDetails.eventName,
                    eventDate: eventDetails.eventDate,
                    entryOpenTime: eventDetails.entryOpenTime,
                    venue: eventDetails.venue,
                    organizer: eventDetails.organizer,
                    isActive: eventDetails.isActive
                }
            });
        } catch (err) {
            console.error('Error looking up ticket:', err);
            if (err.message.includes('Ticket does not exist')) {
                setError('Ticket not found. Please check the ID.');
            } else {
                setError(err.message || 'Failed to look up ticket');
            }
        } finally {
            setIsLoading(false);
        }
    }, [contract, tokenId, account]);

    // Validate ticket
    const handleValidate = async () => {
        if (!contract || !ticketInfo) return;

        try {
            setIsLoading(true);
            setError(null);

            const tx = await contract.useTicket(parseInt(ticketInfo.tokenId));
            await tx.wait();

            setSuccess('✅ Ticket validated! Entry granted.');

            // Refresh ticket info
            handleLookup();

            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            console.error('Error validating ticket:', err);
            if (err.message.includes('Entry not yet open')) {
                setError('Entry is not yet open for this event');
            } else if (err.message.includes('Ticket already used')) {
                setError('This ticket has already been used');
            } else if (err.message.includes('Not ticket owner or scanner')) {
                setError('You are not authorized to validate this ticket');
            } else {
                setError(err.message || 'Failed to validate ticket');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Format timestamp
    const formatDate = (timestamp) => {
        try {
            const ts = typeof timestamp === 'object' && timestamp.toNumber
                ? timestamp.toNumber()
                : parseInt(timestamp);
            return new Date(ts * 1000).toLocaleString();
        } catch {
            return 'Unknown';
        }
    };

    // Check if entry is open
    const isEntryOpen = () => {
        if (!ticketInfo?.eventDetails?.entryOpenTime) return false;
        try {
            const ts = ticketInfo.eventDetails.entryOpenTime.toNumber
                ? ticketInfo.eventDetails.entryOpenTime.toNumber()
                : parseInt(ticketInfo.eventDetails.entryOpenTime);
            return Date.now() >= ts * 1000;
        } catch {
            return false;
        }
    };

    if (!isConnected) {
        return (
            <div className="scanner-view">
                <div className="page-container">
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">🔍 Scanner Mode</h2>
                            <p className="card-description">Validate tickets at event entry</p>
                        </div>
                        <div className="empty-state">
                            <div className="empty-state-icon">🔌</div>
                            <h3 className="empty-state-title">Connect Your Wallet</h3>
                            <p className="empty-state-description">
                                Connect your scanner wallet to validate tickets
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (chainId !== 11155111 && chainId !== 1337) {
        return (
            <div className="scanner-view">
                <div className="page-container">
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">🔍 Scanner Mode</h2>
                        </div>
                        <div className="empty-state">
                            <div className="empty-state-icon">🌐</div>
                            <h3 className="empty-state-title">Wrong Network</h3>
                            <p className="empty-state-description">
                                Please switch to the Sepolia network
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="scanner-view">
            <div className="page-container">
                <div className="section-header">
                    <h2 className="section-title">🔍 Scanner Mode</h2>
                    <p className="section-subtitle">
                        Enter ticket ID to look up and validate
                    </p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {/* Lookup Form */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="card-header">
                        <h3 className="card-title">Look Up Ticket</h3>
                    </div>
                    <form onSubmit={handleLookup} style={{ padding: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Ticket Token ID</label>
                            <input
                                type="number"
                                value={tokenId}
                                onChange={(e) => setTokenId(e.target.value)}
                                className="form-input"
                                placeholder="Enter ticket ID"
                                min="0"
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-3)' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                                style={{ minWidth: '160px' }}
                            >
                                {isLoading ? <span className="spinner"></span> : 'Look Up'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Ticket Info */}
                {ticketInfo && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Ticket Details</h3>
                        </div>
                        <div style={{ padding: 'var(--space-4)' }}>
                            {/* Event info */}
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <h4 style={{ margin: '0 0 var(--space-2) 0' }}>
                                    {ticketInfo.eventDetails.eventName}
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                                    📍 {ticketInfo.eventDetails.venue}<br />
                                    📅 {formatDate(ticketInfo.eventDetails.eventDate)}
                                </p>
                            </div>

                            {/* Status */}
                            <div style={{
                                padding: 'var(--space-4)',
                                background: ticketInfo.isUsed
                                    ? 'var(--error-500/20)'
                                    : 'var(--success-500/20)',
                                borderRadius: '8px',
                                marginBottom: 'var(--space-4)',
                                textAlign: 'center'
                            }}>
                                <span style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    color: ticketInfo.isUsed ? 'var(--error-500)' : 'var(--success-500)'
                                }}>
                                    {ticketInfo.isUsed ? '❌ ALREADY USED' : '✅ VALID'}
                                </span>
                            </div>

                            {/* Details */}
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                <p>Owner: {ticketInfo.owner.slice(0, 10)}...{ticketInfo.owner.slice(-8)}</p>
                                <p>Entry opens: {formatDate(ticketInfo.eventDetails.entryOpenTime)}</p>
                                <p>
                                    Scanner authorized:
                                    <span style={{ color: isScannerForEvent ? 'var(--success-500)' : 'var(--error-500)' }}>
                                        {isScannerForEvent ? ' Yes ✓' : ' No ✗'}
                                    </span>
                                </p>
                            </div>

                            {/* Validate Button */}
                            {!ticketInfo.isUsed && (
                                <div style={{ marginTop: 'var(--space-4)' }}>
                                    {!isScannerForEvent ? (
                                        <div className="alert alert-warning">
                                            You are not authorized as a scanner for this event
                                        </div>
                                    ) : !isEntryOpen() ? (
                                        <div className="alert alert-warning">
                                            Entry is not yet open for this event
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleValidate}
                                            disabled={isLoading}
                                            className="btn btn-success"
                                            style={{ width: '100%', fontSize: '1.25rem', padding: 'var(--space-4)' }}
                                        >
                                            {isLoading ? <span className="spinner"></span> : '✓ VALIDATE TICKET'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScannerTicketView;
