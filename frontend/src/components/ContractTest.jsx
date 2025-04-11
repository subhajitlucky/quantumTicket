import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';

const ContractTest = () => {
  const { contract, isLoading: contractLoading, testContractDeployment, isOwner } = useContract();
  const { isConnected, account, chainId } = useWallet();
  const [testResult, setTestResult] = useState(null);
  const [isTestingContract, setIsTestingContract] = useState(false);
  const [error, setError] = useState(null);

  const handleTestContract = async () => {
    setIsTestingContract(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await testContractDeployment();
      setTestResult(result);
    } catch (err) {
      console.error('Testing error:', err);
      setError(err.message || 'Failed to test contract');
    } finally {
      setIsTestingContract(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="contract-test">
        <h3>Contract Testing</h3>
        <p>Please connect your wallet to test the contract.</p>
      </div>
    );
  }

  return (
    <div className="contract-test">
      <h3>Contract Testing</h3>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {testResult && (
        <div className="success-message">
          <p>Contract test successful!</p>
          <p>Contract owner: {testResult.owner}</p>
          <p>Your account: {account}</p>
          <p>Are you the owner? {isOwner ? 'Yes' : 'No'}</p>
        </div>
      )}
      
      <p>Current network: Chain ID {chainId}</p>
      
      <button 
        onClick={handleTestContract}
        disabled={isTestingContract || contractLoading || !contract}
      >
        {isTestingContract ? 'Testing...' : 'Test Contract Connection'}
      </button>
    </div>
  );
};

export default ContractTest; 