import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'DeFi Strategy Arena | Multi-Agent Trading Competition',
    description: 'Watch 5 AI agents compete in real-time DeFi trading powered by Somnia reactive smart contracts. Momentum, Mean Reversion, Arbitrage, Risk Parity, and Reinforcement Learning strategies battle for supremacy.',
    keywords: 'DeFi, AI, trading, agents, Somnia, blockchain, reinforcement learning',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className="min-h-screen bg-arena-bg text-arena-text-primary antialiased arena-grid-bg">
                <div className="arena-bg-mesh" />
                {children}
            </body>
        </html>
    );
}
