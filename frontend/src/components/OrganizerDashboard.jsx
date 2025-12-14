/**
 * OrganizerDashboard Component
 * 
 * Dashboard for event organizers to:
 * - View and withdraw accumulated ticket sales
 * - Manage scanner addresses for their events
 * - Refund tickets
 * - Deactivate events
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';
import { getOrganizerBalance } from '../services/ticketIndexer';

const OrganizerDashboard = () => {
    const { isConnected, chainId, account } = useWallet();
    const { contract } = useContract();

    const [organizerBalance, setOrganizerBalance] = useState(null);
    const [myEvents, setMyEvents] = useState([]);
    const [showAllEvents, setShowAllEvents] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null); // legacy/general
    const [scannerSuccess, setScannerSuccess] = useState(null);
    const [withdrawSuccess, setWithdrawSuccess] = useState(null);
    const [refundSuccess, setRefundSuccess] = useState(null);
    const scannerTimeoutRef = useRef(null);
    const withdrawTimeoutRef = useRef(null);
    const refundTimeoutRef = useRef(null);

    // Scanner management state
    const [scannerForm, setScannerForm] = useState({
        eventId: '',
        scannerAddress: '',
        allow: true
    });

    // Refund state
    const [refundTokenId, setRefundTokenId] = useState('');

    // Fetch organizer's balance and events
    const fetchOrganizerData = useCallback(async () => {
        if (!contract || !account) return;

        try {
            setIsLoading(true);
            setError(null);

            // Get balance
            const balance = await getOrganizerBalance(contract, account);
            setOrganizerBalance(balance);

            // Get events organized by this wallet
            const totalEvents = await contract.getTotalEvents();
            const events = [];

            for (let i = 0; i < totalEvents; i++) {
                const eventDetails = await contract.getEventDetails(i);
                if (eventDetails.organizer.toLowerCase() === account.toLowerCase()) {
                    events.push({
                        id: i,
                        name: eventDetails.eventName,
                        date: new Date(eventDetails.eventDate.toNumber() * 1000),
                        entryOpenTime: eventDetails.entryOpenTime?.toNumber()
                            ? new Date(eventDetails.entryOpenTime.toNumber() * 1000)
                            : null,
                        venue: eventDetails.venue,
                        price: ethers.utils.formatEther(eventDetails.ticketPrice),
                        soldTickets: eventDetails.ticketsSold.toNumber(),
                        maxTickets: eventDetails.maxTickets.toNumber(),
                        isActive: eventDetails.isActive
                    });
                }
            }

            setMyEvents(events);
        } catch (err) {
            console.error('Error fetching organizer data:', err);
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    }, [contract, account]);

    useEffect(() => {
        if (isConnected && contract && account) {
            fetchOrganizerData();
        }
    }, [isConnected, contract, account, fetchOrganizerData]);

    // Withdraw funds
    const handleWithdraw = async () => {
        if (!contract) {
            setError('Contract not initialized');
            return;
        }

        try {
            setIsWithdrawing(true);
            setError(null);

            const tx = await contract.withdrawOrganizerFunds();
            await tx.wait();

            if (withdrawTimeoutRef.current) clearTimeout(withdrawTimeoutRef.current);
            setWithdrawSuccess('Funds withdrawn successfully!');
            withdrawTimeoutRef.current = setTimeout(() => setWithdrawSuccess(null), 5000);

            // Refresh balance
            fetchOrganizerData();
        } catch (err) {
            console.error('Error withdrawing funds:', err);
            if (err.message.includes('Nothing to withdraw')) {
                setError('No funds available to withdraw');
            } else {
                setError(err.message || 'Failed to withdraw funds');
            }
        } finally {
            setIsWithdrawing(false);
        }
    };

    // Set scanner
    const handleSetScanner = async (e) => {
        e.preventDefault();
        if (!contract) {
            setError('Contract not initialized');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            if (!ethers.utils.isAddress(scannerForm.scannerAddress)) {
                setError('Invalid scanner address');
                setIsLoading(false);
                return;
            }

            const tx = await contract.setScanner(
                parseInt(scannerForm.eventId),
                scannerForm.scannerAddress,
                scannerForm.allow
            );
            await tx.wait();

            if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
            setScannerSuccess(`Scanner ${scannerForm.allow ? 'added' : 'removed'} successfully!`);
            scannerTimeoutRef.current = setTimeout(() => setScannerSuccess(null), 5000);
            setScannerForm({ eventId: '', scannerAddress: '', allow: true });
        } catch (err) {
            console.error('Error setting scanner:', err);
            setError(err.message || 'Failed to update scanner');
        } finally {
            setIsLoading(false);
        }
    };

    // Refund ticket
    const handleRefund = async (e) => {
        e.preventDefault();
        if (!contract) {
            setError('Contract not initialized');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const tx = await contract.refundTicket(parseInt(refundTokenId));
            await tx.wait();

            if (refundTimeoutRef.current) clearTimeout(refundTimeoutRef.current);
            setRefundSuccess('Ticket refunded successfully!');
            refundTimeoutRef.current = setTimeout(() => setRefundSuccess(null), 5000);
            setRefundTokenId('');

            // Refresh data
            fetchOrganizerData();
        } catch (err) {
            console.error('Error refunding ticket:', err);
            if (err.message.includes('Not event organizer')) {
                setError('You can only refund tickets for your own events');
            } else if (err.message.includes('Ticket already used')) {
                setError('Cannot refund a used ticket');
            } else if (err.message.includes('Insufficient balance')) {
                setError('Insufficient balance for refund. Withdraw is blocked until refund balance is available.');
            } else {
                setError(err.message || 'Failed to refund ticket');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Cleanup timers
    useEffect(() => {
        return () => {
            if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
            if (withdrawTimeoutRef.current) clearTimeout(withdrawTimeoutRef.current);
            if (refundTimeoutRef.current) clearTimeout(refundTimeoutRef.current);
        };
    }, []);

    // Deactivate event
    const handleDeactivate = async (eventId) => {
        if (!contract) {
            setError('Contract not initialized');
            return;
        }

        if (!window.confirm('Are you sure you want to deactivate this event? Ticket sales will stop.')) {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const tx = await contract.deactivateEvent(eventId);
            await tx.wait();

            setSuccess('Event deactivated successfully!');
            setTimeout(() => setSuccess(null), 5000);

            // Refresh data
            fetchOrganizerData();
        } catch (err) {
            console.error('Error deactivating event:', err);
            setError(err.message || 'Failed to deactivate event');
        } finally {
            setIsLoading(false);
        }
    };

    // Not connected
    if (!isConnected) {
        return (
            <div className="organizer-dashboard">
                <div className="page-container">
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Organizer Dashboard</h2>
                            <p className="card-description">Manage your events, scanners, and funds</p>
                        </div>
                        <div className="empty-state">
                            <div className="empty-state-icon">🔌</div>
                            <h3 className="empty-state-title">Connect Your Wallet</h3>
                            <p className="empty-state-description">
                                Please connect your wallet to access the organizer dashboard
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Wrong network
    if (chainId !== 11155111 && chainId !== 1337) {
        return (
            <div className="organizer-dashboard">
                <div className="page-container">
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Organizer Dashboard</h2>
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
        <div className="organizer-dashboard">
            <div className="page-container">
                <div className="section-header">
                    <h2 className="section-title">Organizer Dashboard</h2>
                    <p className="section-subtitle">Manage your events, scanners, and withdraw funds</p>
                </div>

                {/* Alerts */}
                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {/* Balance Card */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="card-header">
                        <h3 className="card-title">💰 Available Balance</h3>
                    </div>
                    <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-500)' }}>
                            {organizerBalance
                                ? ethers.utils.formatEther(organizerBalance)
                                : '0'} ETH
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                            Accumulated from ticket sales
                        </p>
                        <p style={{ color: 'var(--warning-500)', marginTop: 'var(--space-2)', fontSize: '0.9rem' }}>
                            Keep enough ETH here to cover refunds; withdrawing everything will block refunds.
                        </p>
                        <button
                            onClick={handleWithdraw}
                            disabled={isWithdrawing || !organizerBalance || organizerBalance.isZero()}
                            className="btn btn-primary"
                            style={{ marginTop: 'var(--space-4)' }}
                        >
                            {isWithdrawing ? <span className="spinner"></span> : 'Withdraw Funds'}
                        </button>
                        {withdrawSuccess && (
                            <div className="alert alert-success" style={{ marginTop: 'var(--space-3)' }}>
                                {withdrawSuccess}
                            </div>
                        )}
                    </div>
                </div>

                {/* Scanner Management */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="card-header">
                        <h3 className="card-title">🔍 Scanner Management</h3>
                        <p className="card-description">Add or remove scanners who can validate tickets at your events</p>
                    </div>
                    <form onSubmit={handleSetScanner} style={{ padding: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Event</label>
                            <select
                                value={scannerForm.eventId}
                                onChange={(e) => setScannerForm(prev => ({ ...prev, eventId: e.target.value }))}
                                className="form-input"
                                required
                            >
                                <option value="">Select event...</option>
                                {myEvents.filter(e => e.isActive).map(event => (
                                    <option key={event.id} value={event.id}>
                                        {event.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Scanner Wallet Address</label>
                            <input
                                type="text"
                                value={scannerForm.scannerAddress}
                                onChange={(e) => setScannerForm(prev => ({ ...prev, scannerAddress: e.target.value }))}
                                className="form-input"
                                placeholder="0x..."
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Action</label>
                            <select
                                value={scannerForm.allow ? 'add' : 'remove'}
                                onChange={(e) => setScannerForm(prev => ({ ...prev, allow: e.target.value === 'add' }))}
                                className="form-input"
                            >
                                <option value="add">Add Scanner</option>
                                <option value="remove">Remove Scanner</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-3)' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                                style={{ minWidth: '180px' }}
                            >
                                {isLoading ? <span className="spinner"></span> : 'Update Scanner'}
                            </button>
                        </div>
                        {scannerSuccess && (
                            <div className="alert alert-success" style={{ marginTop: 'var(--space-3)' }}>
                                {scannerSuccess}
                            </div>
                        )}
                    </form>
                </div>

                {/* Refund Ticket */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="card-header">
                        <h3 className="card-title">↩️ Refund Ticket</h3>
                        <p className="card-description">Refund a ticket by its token ID (for cancelled events)</p>
                    </div>
                    <form onSubmit={handleRefund} style={{ padding: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Token ID to Refund</label>
                            <input
                                type="number"
                                value={refundTokenId}
                                onChange={(e) => setRefundTokenId(e.target.value)}
                                className="form-input"
                                placeholder="Enter token ID"
                                min="0"
                                required
                            />
                            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                                The ticket will be burned and the buyer will receive a refund from your balance
                            </small>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-3)' }}>
                            <button
                                type="submit"
                                className="btn btn-warning"
                                disabled={isLoading}
                                style={{ minWidth: '180px' }}
                            >
                                {isLoading ? <span className="spinner"></span> : 'Refund Ticket'}
                            </button>
                        </div>
                        {refundSuccess && (
                            <div className="alert alert-success" style={{ marginTop: 'var(--space-3)' }}>
                                {refundSuccess}
                            </div>
                        )}
                    </form>
                </div>

                {/* My Events (collapsible) */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">🎫 My Events ({myEvents.length})</h3>
                    </div>

                    {isLoading ? (
                        <div className="empty-state" style={{ padding: 'var(--space-4)' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : myEvents.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-4)' }}>
                            <p>You haven't created any events yet.</p>
                        </div>
                    ) : (
                        <div style={{ padding: 'var(--space-4)' }}>
                            {(showAllEvents ? myEvents : myEvents.slice(0, 5)).map(event => (
                                <div key={event.id} style={{
                                    padding: 'var(--space-4)',
                                    background: 'var(--surface-secondary)',
                                    borderRadius: '8px',
                                    marginBottom: 'var(--space-3)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div>
                                            <h4 style={{ margin: 0 }}>{event.name}</h4>
                                            <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-1) 0', fontSize: '0.875rem' }}>
                                                {event.venue} • {event.date.toLocaleDateString()}
                                            </p>
                                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                                                Sold: {event.soldTickets} / {event.maxTickets} • Revenue: {(event.soldTickets * parseFloat(event.price)).toFixed(4)} ETH
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                            {event.isActive ? (
                                                <>
                                                    <span className="status-badge status-active">Active</span>
                                                    <button
                                                        onClick={() => handleDeactivate(event.id)}
                                                        className="btn btn-secondary btn-sm"
                                                        disabled={isLoading}
                                                    >
                                                        Deactivate
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="status-badge status-used">Deactivated</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {myEvents.length > 5 && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setShowAllEvents(!showAllEvents)}
                                    >
                                        {showAllEvents ? 'Show less' : `Show more (${myEvents.length - 5})`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizerDashboard;
