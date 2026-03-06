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
    ReferenceArea,
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

function formatTs(unix: number): string {
    if (!unix) return '';
    const d = new Date(unix * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface PriceChartProps {
    showAgents?: boolean;
    height?: number;
}

export default function PriceChart({ showAgents = true, height = 300 }: PriceChartProps) {
    const mockPriceHistory = useArenaStore((s) => s.priceHistory);
    const mockAgents = useArenaStore((s) => s.agents);
    const { isOnChainMode, onChainPriceHistory, onChainEventHistory } = useWalletStore();

    // In on-chain mode, we only have current PnL, not full PnL history per agent.
    const showAgentLines = isOnChainMode ? false : showAgents;

    const onChainChartData = onChainEventHistory.length > 0
        ? onChainEventHistory.map((e) => ({
            update: e.updateId,
            price: e.price,
            priceChange: e.priceChange,
            volatility: e.volatility,
            label: e.timestamp ? formatTs(e.timestamp) : `#${e.updateId}`,
        }))
        : onChainPriceHistory.map((price, i) => ({
            update: i + 1,
            price,
            priceChange: 0,
            volatility: 0,
            label: `#${i + 1}`,
        }));

    // Oracle volatility is basis points (e.g. 500 = 5%).
    const onChainPrices = onChainChartData.map((d) => d.price);
    const avgVolBps = onChainEventHistory.length > 0
        ? onChainEventHistory.reduce((s, e) => s + e.volatility, 0) / onChainEventHistory.length
        : 0;
    const avgVolPct = avgVolBps / 100;
    const volRatio = avgVolBps / 10000;
    const latestPrice = onChainPrices[onChainPrices.length - 1] ?? 0;
    const bandHigh = latestPrice * (1 + volRatio);
    const bandLow = Math.max(0, latestPrice * (1 - volRatio));

    const mockChartData = mockPriceHistory.map((ph, i) => {
        const point: Record<string, number> = {
            update: ph.updateId,
            price: ph.price,
        };

        if (showAgentLines) {
            mockAgents.forEach((agent) => {
                point[agent.id] = agent.pnlHistory[i] ?? 0;
            });
        }

        return point;
    });

    const chartData = isOnChainMode ? onChainChartData : mockChartData;
    const isEmpty = chartData.length === 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const d = payload[0]?.payload;

        return (
            <div className="glass-card rounded-lg p-3 text-xs shadow-xl min-w-[140px]">
                <p className="text-arena-text-muted mb-1">
                    {isOnChainMode && d?.label ? d.label : `Update #${label}`}
                </p>

                {payload.map((entry: any) => (
                    <p key={entry.name} style={{ color: entry.color }} className="font-mono">
                        {entry.name === 'price'
                            ? `Price: $${entry.value.toFixed(0)}`
                            : <span>{agentNameMap[entry.name] || entry.name}: {entry.value >= 0 ? '+' : ''}${entry.value.toFixed(2)}</span>}
                    </p>
                ))}

                {isOnChainMode && d?.priceChange !== 0 && (
                    <p className={`font-mono mt-0.5 ${d.priceChange >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>
                        Delta {d.priceChange >= 0 ? '+' : ''}${d.priceChange?.toFixed(2)}
                    </p>
                )}

                {isOnChainMode && d?.volatility > 0 && (
                    <p className="font-mono text-arena-text-muted mt-0.5">
                        Vol: {d.volatility?.toFixed(0)} bps ({(d.volatility / 100).toFixed(2)}%)
                    </p>
                )}
            </div>
        );
    };

    const dataCount = isOnChainMode ? onChainChartData.length : mockPriceHistory.length;

    return (
        <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-arena-text-primary flex items-center gap-2">
                    {showAgents ? 'Performance Chart' : 'Price History'}
                    {isOnChainMode && onChainEventHistory.length > 0 && (
                        <span className="text-xs text-green-400 font-normal">On-chain Event Log</span>
                    )}
                </h2>
                <span className="text-xs text-arena-text-muted font-mono">{dataCount} updates</span>
            </div>

            {isEmpty ? (
                <div className="flex flex-col items-center justify-center text-arena-text-muted" style={{ height }}>
                    <p className="text-sm text-center">
                        {isOnChainMode
                            ? 'No on-chain price updates yet. Trigger a price update to begin.'
                            : 'Run a scenario to see chart data.'}
                    </p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={height}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(30, 30, 46, 0.8)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey={isOnChainMode ? 'label' : 'update'}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#475569', fontSize: 11 }}
                            interval="preserveStartEnd"
                            minTickGap={40}
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
                        {showAgentLines && (
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
                        {showAgentLines && (
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconSize={8} />
                        )}

                        {isOnChainMode && avgVolBps > 0 && onChainChartData.length > 1 && (
                            <ReferenceArea
                                yAxisId="price"
                                y1={bandLow}
                                y2={bandHigh}
                                fill="#6366f1"
                                fillOpacity={0.06}
                                label={{
                                    value: `Vol +/- ${avgVolPct.toFixed(2)}%`,
                                    fill: '#475569',
                                    fontSize: 10,
                                    position: 'insideTopLeft',
                                }}
                            />
                        )}

                        <Line
                            yAxisId="price"
                            type="monotone"
                            dataKey="price"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={false}
                            name="price"
                            isAnimationActive={false}
                        />

                        {showAgentLines && (
                            <ReferenceLine yAxisId="pnl" y={0} stroke="#334155" strokeDasharray="3 3" />
                        )}

                        {showAgentLines && mockAgents.map((agent: any) => (
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
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

