// lib/theme.js
export const TOKENS = {
  bg: {
    app: 'bg-[#0B1020]', // deep navy
    card: 'bg-white/6',  // glass on dark
    panel: 'bg-white/10',
  },
  border: 'border-white/15',
  ring: 'focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60',
  text: {
    primary: 'text-slate-100',
    secondary: 'text-slate-300',
    muted: 'text-slate-400',
    danger: 'text-rose-300',
  },
  glow: 'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_30px_rgba(80,56,237,.25)]',
  // fun neon gradient
  neonGradient: 'bg-[linear-gradient(135deg,#5B8CFF_0%,#9B5BFF_50%,#FF5BE1_100%)]',
};
