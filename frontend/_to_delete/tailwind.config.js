module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        ichnos: {
          primary: '#ffb020',
          'primary-content': '#1a1200',
          secondary: '#4fd1ff',
          'secondary-content': '#04222c',
          accent: '#ff5470',
          'accent-content': '#2a0512',
          neutral: '#152140',
          'neutral-content': '#c7d3e8',
          'base-100': '#101a2e',
          'base-200': '#0c1526',
          'base-300': '#0a1120',
          'base-content': '#eef3fb',
          info: '#4fd1ff',
          success: '#34d399',
          warning: '#ffb020',
          error: '#ff5470',
          '--rounded-box': '0.75rem',
          '--rounded-btn': '0.5rem',
        },
      },
    ],
    darkTheme: 'ichnos',
    base: true,
    logs: false,
  },
};
