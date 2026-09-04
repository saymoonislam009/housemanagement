/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        matte:'#F6F1E6', obsidian:'#FFFFFF', obsidian2:'#EDE5D2', obsidian3:'#E0D5B8',
        gold:{ DEFAULT:'#8C6A2F', soft:'#A9854A', pale:'#C9A968', dim:'#5F4820' },
        wine:{ DEFAULT:'#6B2A2E', soft:'#8A4347', pale:'#B57478', dim:'#4A1B1E' },
        amber:{ DEFAULT:'#C17A3C', deep:'#9C5A26', pale:'#E8C39A', glow:'#D98F4A' },
        electric:{ DEFAULT:'#3D4A6B', soft:'#5A6B94', dim:'#2A3350' },
        bone:'#221C15', ash:'#665C4D', ember:'#A8402F',
      },
      fontFamily: { display:['var(--font-playfair)'], body:['var(--font-manrope)'], mono:['var(--font-jetbrains)'] },
      fontSize: { '2xs':['0.65rem',{lineHeight:'1rem'}] },
      backgroundImage: { 'radial-gold':'radial-gradient(ellipse at 50% 0%, rgba(107,42,46,0.10), transparent 60%)' },
      boxShadow: { glass:'0 4px 32px rgba(80,60,30,0.10), inset 0 1px 0 rgba(255,255,255,0.6)', gold:'0 0 24px rgba(107,42,46,0.18)' },
    },
  },
  plugins: [],
};
