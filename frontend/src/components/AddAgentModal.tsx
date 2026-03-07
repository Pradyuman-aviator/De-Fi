'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/store/useWalletStore';
import { CONTRACTS, ABIS } from '@/lib/contracts';
import { BrowserProvider, Contract } from 'ethers';

declare global {
    interface Window {
        ethereum?: any;
    }
}

interface AddAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddAgentModal({ isOpen, onClose }: AddAgentModalProps) {
    const [tab, setTab] = useState<'ai' | 'nocode' | 'solidity'>('ai');
    const { isConnected, isOnChainMode } = useWalletStore();

    // AI Builder State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [parsedConfig, setParsedConfig] = useState<any>(null);

    // No-Code Forms
    const [name, setName] = useState('');
    const [strategyType, setStrategyType] = useState('momentum');
    const [param, setParam] = useState('200');

    // Solidity Forms
    const [contractAddress, setContractAddress] = useState('');

    const [isDeploying, setIsDeploying] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleParseAI = async () => {
        if (!aiPrompt) return;
        setIsParsing(true);
        setError('');
        try {
            const res = await fetch('/api/parse-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userInput: aiPrompt })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to parse strategy');
            setParsedConfig(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsParsing(false);
        }
    };

    const handleDeployCustom = async (configOverride?: any) => {
        if (!isOpen) return;
        if (!isOnChainMode) {
            setError('Must be in On-Chain Mode to deploy.');
            return;
        }
        if (!isConnected) {
            setError('Please connect your wallet first.');
            return;
        }

        try {
            setIsDeploying(true);
            setError('');
            setSuccess('');

            if (!window.ethereum) throw new Error("No crypto wallet found");
            const provider = new BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();
            const factory = new Contract(CONTRACTS.StrategyFactory, ABIS.StrategyFactory, signer);

            let sType = 0; // MOMENTUM
            let threshold = parseInt(param);
            let risk = 1; // MEDIUM
            let size = 500;
            let lookback = 10;
            let label = name;

            if (configOverride) {
                const types: any = { "MOMENTUM": 0, "MEAN_REVERT": 1, "SPREAD": 2, "RISK_PARITY": 3 };
                const risks: any = { "LOW": 0, "MEDIUM": 1, "HIGH": 2 };
                sType = types[configOverride.strategyType] ?? 0;
                risk = risks[configOverride.riskLevel] ?? 1;
                threshold = configOverride.threshold;
                size = configOverride.positionSize;
                lookback = configOverride.lookbackWindow;
                label = configOverride.label;
            } else {
                if (!name) throw new Error("Please enter a name");
                sType = strategyType === 'momentum' ? 0 : 1;
            }

            const tx = await factory.deployAgent(sType, threshold, risk, size, lookback, label);
            await tx.wait();

            setSuccess('Agent successfully deployed & registered!');
            setTimeout(() => {
                onClose();
                setSuccess('');
                setName('');
                setParsedConfig(null);
                setAiPrompt('');
            }, 2000);
        } catch (e: any) {
            console.error(e);
            setError(e?.reason || e?.message || 'Transaction failed.');
        } finally {
            setIsDeploying(false);
        }
    };

    const handleRegisterSolidity = async () => {
        if (!isOpen) return;
        if (!isOnChainMode) {
            setError('Must be in On-Chain Mode to register.');
            return;
        }
        if (!isConnected) {
            setError('Please connect your wallet first.');
            return;
        }
        if (!contractAddress || contractAddress.length !== 42) {
            setError('Invalid contract address format.');
            return;
        }

        try {
            setIsDeploying(true);
            setError('');
            setSuccess('');

            if (!window.ethereum) throw new Error("No crypto wallet found");
            const provider = new BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();
            const pm = new Contract(CONTRACTS.PortfolioManager, ABIS.PortfolioManager, signer);

            const tx = await pm.registerStrategy(contractAddress);
            await tx.wait();

            setSuccess('Agent registered with PortfolioManager!');
            setTimeout(() => {
                onClose();
                setSuccess('');
                setContractAddress('');
            }, 2000);
        } catch (e: any) {
            console.error(e);
            setError(e?.reason || e?.message || 'Transaction failed. Check console for details.');
        } finally {
            setIsDeploying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative glass-card w-full max-w-xl rounded-sm overflow-hidden shadow-2xl border border-arena-border"
                >
                    {isDeploying && (
                        <div className="absolute inset-0 z-50 bg-[#12121a]/90 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-2 border-arena-border border-t-arena-accent rounded-full animate-spin mb-4" />
                            <p className="text-arena-accent font-mono font-bold uppercase tracking-widest">[PROCESSING ON-CHAIN]</p>
                            <p className="text-xs text-arena-text-muted mt-2 font-mono">Waiting for network block confirmation...</p>
                        </div>
                    )}
                    {/* Header */}
                    <div className="bg-arena-card border-b border-arena-border p-5 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold font-mono text-arena-text-primary tracking-wide uppercase">Deploy Custom Agent</h2>
                            <p className="text-xs text-arena-text-muted font-mono mt-1">Integrate your own trading logic into the Arena.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-arena-text-muted hover:text-white transition-colors text-lg font-mono font-bold px-3"
                        >
                            [X]
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-arena-border font-mono text-sm">
                        <button
                            onClick={() => { setTab('ai'); setError(''); setSuccess(''); }}
                            className={`flex-1 py-3 font-semibold transition-colors ${tab === 'ai' ? 'text-arena-accent border-b-2 border-arena-accent bg-arena-accent/5' : 'text-arena-text-muted hover:text-arena-text-secondary'}`}
                        >
                            AI BUILDER
                        </button>
                        <button
                            onClick={() => { setTab('nocode'); setError(''); setSuccess(''); }}
                            className={`flex-1 py-3 font-semibold transition-colors ${tab === 'nocode' ? 'text-arena-accent border-b-2 border-arena-accent bg-arena-accent/5' : 'text-arena-text-muted hover:text-arena-text-secondary'}`}
                        >
                            NO-CODE
                        </button>
                        <button
                            onClick={() => { setTab('solidity'); setError(''); setSuccess(''); }}
                            className={`flex-1 py-3 font-semibold transition-colors ${tab === 'solidity' ? 'text-arena-accent border-b-2 border-arena-accent bg-arena-accent/5' : 'text-arena-text-muted hover:text-arena-text-secondary'}`}
                        >
                            SOLIDITY
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {error && (
                            <div className="mb-4 px-4 py-3 bg-arena-danger/10 border border-arena-danger/30 text-arena-danger text-xs font-mono rounded-sm">
                                [ERROR] {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 px-4 py-3 bg-arena-success/10 border border-arena-success/30 text-arena-success text-xs font-mono rounded-sm">
                                [SUCCESS] {success}
                            </div>
                        )}

                        {tab === 'ai' && !parsedConfig ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-arena-text-secondary mb-1">DESCRIBE YOUR STRATEGY</label>
                                    <textarea
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        placeholder="e.g. Buy aggressively when the price drops fast and take huge position sizes..."
                                        rows={4}
                                        className="w-full bg-arena-bg border border-arena-border text-arena-text-primary px-4 py-2 text-sm font-mono rounded-sm focus:outline-none focus:border-arena-accent transition-colors resize-none"
                                    />
                                </div>
                                <button
                                    onClick={handleParseAI}
                                    disabled={isParsing || !aiPrompt}
                                    className="w-full py-3 bg-arena-card border border-arena-border text-arena-text-primary font-mono text-sm hover:border-arena-accent/50 transition-colors disabled:opacity-50"
                                >
                                    {isParsing ? 'ANALYZING STRATEGY...' : 'ANALYZE STRATEGY'}
                                </button>
                            </div>
                        ) : tab === 'ai' && parsedConfig ? (
                            <div className="space-y-4">
                                <div className="bg-arena-bg border border-arena-border p-4 rounded-sm font-mono">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-arena-text-primary font-bold">{parsedConfig.label}</h3>
                                        <span className="text-xs px-2 py-1 bg-arena-accent/10 text-arena-accent rounded-sm">
                                            {parsedConfig.strategyType}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm text-arena-text-secondary">
                                        <p>Risk Profile: <span className="text-arena-text-primary">{parsedConfig.riskLevel}</span></p>
                                        <p>Position Size: <span className="text-arena-text-primary">${parsedConfig.positionSize}</span></p>
                                        <p>Threshold: <span className="text-arena-text-primary">{parsedConfig.threshold} bps</span></p>
                                        <p>Lookback: <span className="text-arena-text-primary">{parsedConfig.lookbackWindow} updates</span></p>
                                    </div>
                                    <p className="mt-4 text-xs text-arena-accent leading-relaxed">
                                        Your agent will dynamically execute {parsedConfig.strategyType.replace('_', ' ')} logic targeting {parsedConfig.threshold} bps moves with {parsedConfig.riskLevel} exposure.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setParsedConfig(null)}
                                        className="flex-1 py-2 text-xs font-mono text-arena-text-muted hover:text-white border border-arena-border rounded-sm"
                                    >
                                        EDIT PROMPT
                                    </button>
                                </div>
                            </div>
                        ) : tab === 'nocode' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-arena-text-secondary mb-1">AGENT NAME</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. My Trend Follower"
                                        className="w-full bg-arena-bg border border-arena-border text-arena-text-primary px-4 py-2 text-sm font-mono rounded-sm focus:outline-none focus:border-arena-accent transition-colors"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-mono text-arena-text-secondary mb-1">STRATEGY BASE</label>
                                        <select
                                            value={strategyType}
                                            onChange={(e) => setStrategyType(e.target.value)}
                                            className="w-full bg-arena-bg border border-arena-border text-arena-text-primary px-4 py-2 text-sm font-mono rounded-sm focus:outline-none focus:border-arena-accent transition-colors appearance-none"
                                        >
                                            <option value="momentum">Momentum Hunter</option>
                                            <option value="meanrev">Mean Reverter</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono text-arena-text-secondary mb-1">
                                            {strategyType === 'momentum' ? 'THRESHOLD (BPS)' : 'DEVIATION (BPS)'}
                                        </label>
                                        <input
                                            type="number"
                                            value={param}
                                            onChange={(e) => setParam(e.target.value)}
                                            className="w-full bg-arena-bg border border-arena-border text-arena-text-primary px-4 py-2 text-sm font-mono rounded-sm focus:outline-none focus:border-arena-accent transition-colors"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-arena-text-muted font-mono pt-2">
                                    Clone the core strategy template, configure your thresholds, and register your resulting Agent onto the Arena via the StrategyFactory.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-arena-text-secondary mb-1">CONTRACT ADDRESS</label>
                                    <input
                                        type="text"
                                        value={contractAddress}
                                        onChange={(e) => setContractAddress(e.target.value)}
                                        placeholder="0x..."
                                        className="w-full bg-arena-bg border border-arena-border text-arena-text-primary px-4 py-2 text-sm font-mono rounded-sm focus:outline-none focus:border-arena-accent transition-colors"
                                    />
                                </div>
                                <p className="text-xs text-arena-text-muted font-mono pt-2">
                                    Your contract must implement IStrategyStats and inherit from StrategyBase. It will instantly begin reacting to PriceUpdated events upon registration.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-arena-card p-4 flex justify-end gap-3 border-t border-arena-border font-mono text-sm">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-arena-text-muted hover:text-white transition-colors border border-transparent"
                            disabled={isDeploying || isParsing}
                        >
                            CANCEL
                        </button>
                        <button
                            onClick={() => {
                                if (tab === 'ai' && parsedConfig) handleDeployCustom(parsedConfig);
                                else if (tab === 'nocode') handleDeployCustom();
                                else if (tab === 'solidity') handleRegisterSolidity();
                            }}
                            disabled={isDeploying || !isOnChainMode || (tab === 'ai' && !parsedConfig)}
                            className="px-8 py-2 bg-arena-accent/10 border border-arena-accent text-arena-accent font-bold hover:bg-arena-accent/20 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDeploying ? 'DEPLOYING...' : (tab === 'solidity' ? 'REGISTER' : 'DEPLOY')}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
