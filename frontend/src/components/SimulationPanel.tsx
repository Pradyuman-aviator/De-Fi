'use client';

import { motion } from 'framer-motion';
import { useArenaStore, SCENARIOS } from '@/store/useArenaStore';
import { useState } from 'react';

export default function SimulationPanel() {
    const {
        triggerPriceUpdate,
        runScenario,
        stopScenario,
        resetArena,
        isRunning,
        activeScenario,
        scenarioProgress,
        simulationSpeed,
        setSimulationSpeed,
        currentPrice,
    } = useArenaStore();

    const [manualPrice, setManualPrice] = useState(1500);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleManualUpdate = () => {
        triggerPriceUpdate(manualPrice);
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setManualPrice(Number(e.target.value));
    };

    return (
        <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-arena-text-primary flex items-center gap-2">
                    🎮 Simulation Control
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={resetArena}
                        disabled={isRunning}
                        className="px-3 py-1 text-xs rounded-lg bg-arena-border text-arena-text-secondary hover:bg-arena-border/80 transition-colors disabled:opacity-50"
                    >
                        🔄 Reset
                    </button>
                    {isRunning && (
                        <button
                            onClick={stopScenario}
                            className="px-3 py-1 text-xs rounded-lg bg-arena-danger text-white hover:bg-red-600 transition-colors"
                        >
                            ⏹ Stop
                        </button>
                    )}
                </div>
            </div>

            {/* Preset Scenarios */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                {SCENARIOS.map((scenario) => {
                    const isActive = activeScenario === scenario.id;
                    return (
                        <motion.button
                            key={scenario.id}
                            onClick={() => !isRunning && runScenario(scenario.id)}
                            disabled={isRunning}
                            whileHover={{ scale: isRunning ? 1 : 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={`scenario-btn rounded-xl p-3 text-left transition-all duration-300 ${isActive
                                    ? 'ring-2 ring-arena-accent shadow-lg'
                                    : 'bg-arena-card border border-arena-border hover:border-arena-accent/50'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            style={isActive ? { borderColor: scenario.color, boxShadow: `0 0 20px ${scenario.color}30` } : {}}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">{scenario.emoji}</span>
                                <span className="font-semibold text-sm text-arena-text-primary">{scenario.name}</span>
                            </div>
                            <p className="text-xs text-arena-text-muted leading-tight">{scenario.description}</p>

                            {/* Progress bar for active scenario */}
                            {isActive && (
                                <div className="mt-2 h-1 rounded-full bg-arena-border overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: scenario.color }}
                                        initial={{ width: '0%' }}
                                        animate={{ width: `${scenarioProgress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Manual Price Control */}
            <div className="border-t border-arena-border pt-4">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-arena-text-muted hover:text-arena-text-secondary transition-colors mb-3 flex items-center gap-1"
                >
                    {showAdvanced ? '▼' : '▶'} Manual Controls
                </button>

                {showAdvanced && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                    >
                        {/* Price Slider */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-arena-text-secondary">Price</label>
                                <span className="text-sm font-bold font-mono text-arena-accent">
                                    ${manualPrice.toFixed(0)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="800"
                                max="2200"
                                step="10"
                                value={manualPrice}
                                onChange={handleSliderChange}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #ef4444 0%, #22c55e 100%)`,
                                }}
                            />
                            <div className="flex justify-between text-xs text-arena-text-muted mt-1">
                                <span>$800</span>
                                <span>$1,500</span>
                                <span>$2,200</span>
                            </div>
                        </div>

                        {/* Quick Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => triggerPriceUpdate(currentPrice * 0.95)}
                                className="flex-1 py-2 text-xs rounded-lg bg-arena-danger/20 text-arena-danger hover:bg-arena-danger/30 transition-colors font-medium"
                            >
                                -5%
                            </button>
                            <button
                                onClick={() => triggerPriceUpdate(currentPrice * 0.98)}
                                className="flex-1 py-2 text-xs rounded-lg bg-arena-danger/10 text-arena-danger/80 hover:bg-arena-danger/20 transition-colors font-medium"
                            >
                                -2%
                            </button>
                            <button
                                onClick={handleManualUpdate}
                                className="flex-1 py-2 text-xs rounded-lg bg-arena-accent text-white hover:bg-arena-accent-bright transition-colors font-semibold"
                            >
                                Set ${manualPrice}
                            </button>
                            <button
                                onClick={() => triggerPriceUpdate(currentPrice * 1.02)}
                                className="flex-1 py-2 text-xs rounded-lg bg-arena-success/10 text-arena-success/80 hover:bg-arena-success/20 transition-colors font-medium"
                            >
                                +2%
                            </button>
                            <button
                                onClick={() => triggerPriceUpdate(currentPrice * 1.05)}
                                className="flex-1 py-2 text-xs rounded-lg bg-arena-success/20 text-arena-success hover:bg-arena-success/30 transition-colors font-medium"
                            >
                                +5%
                            </button>
                        </div>

                        {/* Speed Control */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-arena-text-secondary">Speed</label>
                                <span className="text-xs font-mono text-arena-text-muted">
                                    {simulationSpeed}ms / update
                                </span>
                            </div>
                            <input
                                type="range"
                                min="200"
                                max="2000"
                                step="100"
                                value={simulationSpeed}
                                onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #6366f1, #818cf8)`,
                                }}
                            />
                            <div className="flex justify-between text-xs text-arena-text-muted mt-1">
                                <span>Fast</span>
                                <span>Slow</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
