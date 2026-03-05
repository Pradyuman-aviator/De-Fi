import { motion, AnimatePresence } from 'framer-motion';

interface AddAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddAgentModal({ isOpen, onClose }: AddAgentModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="glass-card w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-arena-accent/30"
                >
                    {/* Header */}
                    <div className="bg-arena-accent/10 border-b border-arena-border p-5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🤖</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">Deploy Custom Agent</h2>
                                <p className="text-xs text-arena-text-muted">Integrate your own trading logic into the Arena on Somnia</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-arena-text-muted transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        <div className="bg-arena-bg rounded-xl border border-arena-border p-4">
                            <h3 className="text-sm font-semibold text-arena-text-primary mb-2 flex items-center gap-2">
                                <span className="text-arena-accent font-mono text-xs px-2 py-0.5 rounded bg-arena-accent/20">Step 1</span>
                                Inherit the StrategyBase Contract
                            </h3>
                            <div className="bg-[#1e1e24] p-4 rounded-lg overflow-x-auto text-xs font-mono text-green-400 mt-2 border border-[#333]">
                                <pre>{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StrategyBase.sol";

contract MyCustomAgent is StrategyBase {
    constructor(address _oracle) 
        StrategyBase("My Alpha Agent", StrategyType.MOMENTUM, _oracle, 1000 ether, 500) {}

    function _executeStrategy(uint256 _currentPrice, uint256 _updateId) 
        internal override returns (Position signal, uint256 size, string memory reason) 
    {
        // 🧠 Your proprietary logic goes here...
        // Return LONG, SHORT, or NEUTRAL
    }
}`}</pre>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass-card p-4 rounded-xl border-dashed border-arena-border relative overflow-hidden group hover:border-arena-accent/50 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-br from-arena-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="text-xl mb-2 block">📄</span>
                                <h4 className="font-semibold text-sm text-white">Upload Compiled .bin</h4>
                                <p className="text-xs text-arena-text-muted mt-1">Upload the bytecode of your implemented contract.</p>
                                <button className="mt-3 w-full py-2 bg-arena-border hover:bg-arena-border/80 text-xs rounded-lg transition-colors cursor-not-allowed opacity-50">Select File</button>
                            </div>

                            <div className="glass-card p-4 rounded-xl border-dashed border-arena-border relative overflow-hidden group hover:border-arena-accent/50 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-br from-arena-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="text-xl mb-2 block">📋</span>
                                <h4 className="font-semibold text-sm text-white">Upload .abi</h4>
                                <p className="text-xs text-arena-text-muted mt-1">Upload the Application Binary Interface.</p>
                                <button className="mt-3 w-full py-2 bg-arena-border hover:bg-arena-border/80 text-xs rounded-lg transition-colors cursor-not-allowed opacity-50">Select File</button>
                            </div>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                            <span className="text-yellow-500 text-lg">🚧</span>
                            <div>
                                <h4 className="text-sm font-semibold text-yellow-500">Coming Soon: V2 Roadmap</h4>
                                <p className="text-xs text-yellow-500/80 mt-1 leading-relaxed">
                                    The fully decentralized deployment factory is coming to the Somnia Testnet. Soon, anyone will be able to upload their compiled agents directly through this interface, pay a 10 STT entry fee, and instantly battle the top quantitative models live on-chain!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-[#12121a] p-4 flex justify-end gap-3 border-t border-arena-border">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-arena-text-muted hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            disabled
                            className="px-6 py-2 text-sm bg-arena-accent/50 text-white/50 rounded-lg cursor-not-allowed border border-arena-accent/20"
                        >
                            Deploy Engine Offline
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
