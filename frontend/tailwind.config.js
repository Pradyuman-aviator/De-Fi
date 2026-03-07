/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                arena: {
                    bg: '#0a0a0f',
                    card: '#12121a',
                    border: '#1e1e2e',
                    accent: '#6366f1',
                    'accent-bright': '#818cf8',
                    success: '#22c55e',
                    danger: '#ef4444',
                    warning: '#f59e0b',
                    neutral: '#64748b',
                    'text-primary': '#f1f5f9',
                    'text-secondary': '#94a3b8',
                    'text-muted': '#475569',
                },
                agent: {
                    momentum: '#3b82f6',
                    meanrev: '#a855f7',
                    arb: '#eab308',
                    riskparity: '#22c55e',
                    rl: '#ef4444',
                },
            },
            fontFamily: {
                sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'slide-up': 'slideUp 0.5s ease-out',
                'fade-in': 'fadeIn 0.5s ease-out',
                'counter': 'counter 1s ease-out',
                'thinking': 'thinking 1.5s ease-in-out infinite',
            },
            keyframes: {
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.3)' },
                    '50%': { boxShadow: '0 0 25px rgba(99, 102, 241, 0.6)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                thinking: {
                    '0%, 100%': { opacity: '0.4', transform: 'scale(0.98)' },
                    '50%': { opacity: '1', transform: 'scale(1.02)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
};
