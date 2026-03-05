'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
} from 'recharts';
import { useArenaStore } from '@/store/useArenaStore';
import { useWalletStore } from '@/store/useWalletStore';

const agentColorMap: Record<string, string> = {
    momentum: '#3b82f6',
    meanrev: '#a855f7',
    arb: '#eab308',
    riskparity: '#22c55e',
    rl: '#ef4444',
};

const agentNameMap: Record<string, string> = {
    momentum: 'Momentum',
    meanrev: 'Mean Rev',
    arb: 'Arb',
    riskparity: 'Risk Parity',
    rl: 'RL Agent',
};

interface PriceChartProps {
    showAgents?: boolean;
    height?: number;
}

export default function PriceChart({ showAgents = true, height = 300 }: PriceChartProps) {
    const mockPriceHistory = useArenaStore(s => s.priceHistory);
    const mockAgents = useArenaStore(s => s.agents);
    const { isOnChainMode, onChainPriceHistory } = useWalletStore();

    // In on-chain mode, we only have current P&L, not historical P&L for charts.
    // So we only plot the price history line.
    const _showAgents = isOnChainMode ? false : showAgents;

    // Build chart data
    const chartData = isOnChainMode
        ? onChainPriceHistory.map((price, i) => ({
            update: i + 1,
            price: price,
        }))
        : mockPriceHistory.map((ph, i) => {
            const point: Record<string, number> = {
                update: ph.updateId,
                price: ph.price,
            };

            if (_showAgents) {
                mockAgents.forEach(agent => {
                    point[agent.id] = agent.pnlHistory[i] ?? 0;
                });
            }

            return point;
        });

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload) return null;
        return (
            <div className="glass-card rounded-lg p-3 text-xs shadow-xl">
                <p className="text-arena-text-muted mb-1">Update #{label}</p>
                {payload.map((entry: any) => (
                    <p key={entry.name} style={{ color: entry.color }} className="font-mono">
                        {entry.name === 'price' ? `Price: $${entry.value.toFixed(0)}` : (
                            <span>
                                {agentNameMap[entry.name] || entry.name}: {entry.value >= 0 ? '+' : ''}${entry.value.toFixed(2)}
                            </span>
                        )}
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-arena-text-primary flex items-center gap-2">
                    📊 {showAgents ? 'Performance Chart' : 'Price History'}
                </h2>
                <span className="text-xs text-arena-text-muted font-mono">
                    {(isOnChainMode ? onChainPriceHistory : mockPriceHistory).length} updates
                </span>
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(30, 30, 46, 0.8)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="update"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#475569', fontSize: 11 }}
                    />
                    <YAxis
                        yAxisId="price"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#475569', fontSize: 11 }}
                        tickFormatter={(val) => `$${val}`}
                        domain={['auto', 'auto']}
                    />
                    {_showAgents && (
                        <YAxis
                            yAxisId="pnl"
                            orientation="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#475569', fontSize: 11 }}
                            tickFormatter={(val) => `$${val}`}
                        />
                    )}
                    <Tooltip content={<CustomTooltip />} />
                    {_showAgents && (
                        <Legend
                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                            iconSize={8}
                        />
                    )}

                    {/* Price line */}
                    <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="price"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                        name="price"
                    />

                    {/* Zero reference line for P&L */}
                    {_showAgents && (
                        <ReferenceLine yAxisId="pnl" y={0} stroke="#334155" strokeDasharray="3 3" />
                    )}

                    {/* Agent P&L lines */}
                    {_showAgents && mockAgents.map((agent: any) => (
                        <Line
                            key={agent.id}
                            yAxisId="pnl"
                            type="monotone"
                            dataKey={agent.id}
                            stroke={agentColorMap[agent.id]}
                            strokeWidth={1.5}
                            dot={false}
                            name={agent.id}
                            strokeOpacity={0.8}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
