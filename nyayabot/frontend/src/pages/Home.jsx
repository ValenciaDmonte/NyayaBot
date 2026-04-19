/**
 * pages/Home.jsx — Landing page
 *
 * LAYOUT:
 * 1. Fixed header (logo + theme toggle + CTA)
 * 2. Hero: full-viewport Three.js courthouse scene with text overlay
 * 3. Gradient fade into the content below
 * 4. How It Works (3 steps, scroll-reveal via Framer Motion whileInView)
 * 5. Features (3 cards)
 * 6. Laws in the Database (5 rows)
 * 7. Footer
 */

import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, Shield, Globe, ChevronDown, BookOpen, Sun, Moon } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

// Lazy-load the heavy Three.js scene so the rest of the page is not blocked
const CourtScene = lazy(() => import('../components/home/CourtScene'));

// ── Data ─────────────────────────────────────────────────────────────────────

const SUPPORTED_LAWS = [
  { code: 'BNS',   name: 'Bharatiya Nyaya Sanhita 2023',          note: 'Replaced IPC' },
  { code: 'BNSS',  name: 'Bharatiya Nagarik Suraksha Sanhita 2023', note: 'Replaced CrPC' },
  { code: 'CONST', name: 'Constitution of India',                   note: 'Fundamental Rights (Art. 14–22)' },
  { code: 'RTI',   name: 'Right to Information Act 2005',           note: 'Public records access' },
  { code: 'CPA',   name: 'Consumer Protection Act 2019',            note: 'Consumer rights' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Ask in your language',     desc: 'Type or speak in Hindi, Tamil, Telugu, Bengali, or English.' },
  { step: '02', title: 'AI searches verified law', desc: 'NyayaBot searches only official Indian law — never general internet.' },
  { step: '03', title: 'Get cited answers',        desc: 'Exact act name, section number, and amendment date included.' },
];

// Framer Motion: fade + slide-up, staggered for step cards
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
  }),
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const isAuthenticated        = useAuthStore((s) => s.isAuthenticated);
  const { theme, toggleTheme } = useThemeStore();
  const isDark                 = theme === 'dark';

  // Gradient that fades the Three.js canvas into the page background
  const heroFadeColor = isDark ? '#0C0C0C' : '#FAFAFA';

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                         px-6 py-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md
                         border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Scale className="w-6 h-6 text-gold-600 dark:text-gold-500" />
          <span className="text-lg font-bold tracking-tight">NyayaBot</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Dark/light toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400
                       hover:bg-zinc-100 dark:hover:bg-zinc-800
                       hover:text-zinc-900 dark:hover:text-zinc-100
                       transition-colors duration-200"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <Link
            to={isAuthenticated ? '/chat' : '/login'}
            className="btn-primary text-sm"
          >
            {isAuthenticated ? 'Open Chat' : 'Get Started'}
          </Link>
        </div>
      </header>

      {/* ── Hero: Three.js canvas + overlay text ─────────────────────────── */}
      <section className="relative h-screen w-full overflow-hidden">

        {/* Three.js scene (lazy-loaded, full background) */}
        <Suspense fallback={<div className="absolute inset-0 bg-zinc-950 dark:bg-zinc-950 bg-zinc-100" />}>
          <CourtScene />
        </Suspense>

        {/* Overlay: centered hero text */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center
                        text-center px-6 pt-16">
          {/* "Powered by…" badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-8
                       bg-zinc-900/70 dark:bg-zinc-900/70 bg-white/70
                       border border-zinc-700/60 dark:border-zinc-700/60 border-zinc-300/80
                       rounded-full px-4 py-2 text-sm
                       text-zinc-300 dark:text-zinc-300 text-zinc-700
                       backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
            Powered by verified Indian law
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6
                       text-white dark:text-white drop-shadow-lg"
          >
            Legal Help in<br />
            <span className="text-gold-400 dark:text-gold-400">Your Language</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-lg sm:text-xl max-w-2xl mb-10
                       text-zinc-300 dark:text-zinc-300 drop-shadow"
          >
            Ask any legal question in Hindi, Tamil, Telugu, Bengali, or English.
            Get accurate, cited answers grounded in official Indian law — not AI guesses.
          </motion.p>

          {/* CTA button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.65, duration: 0.5 }}
          >
            <Link
              to={isAuthenticated ? '/chat' : '/login'}
              className="inline-flex items-center gap-2
                         bg-gold-500 hover:bg-gold-400 text-white
                         font-semibold text-lg px-8 py-3.5 rounded-xl
                         shadow-lg shadow-gold-900/40
                         transition-all duration-200 hover:shadow-gold-800/50 hover:-translate-y-0.5"
            >
              Start Free Consultation
              <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-4 text-sm text-zinc-400 drop-shadow"
          >
            Free · No phone number required · 7 Indian languages supported
          </motion.p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5">
          <span className="text-xs text-zinc-400 tracking-widest uppercase">Scroll</span>
          <ChevronDown className="w-5 h-5 text-zinc-400 animate-bounce-slow" />
        </div>

        {/* Gradient fade: canvas → page background */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, transparent, ${heroFadeColor})` }}
        />
      </section>

      {/* ── Disclaimer banner ─────────────────────────────────────────────── */}
      <div className="bg-amber-950/40 dark:bg-amber-950/40 bg-amber-50
                      border-y border-amber-700/40 dark:border-amber-700/40 border-amber-200
                      px-6 py-3 text-center">
        <p className="text-amber-400 dark:text-amber-400 text-amber-700 text-sm">
          ⚠️ NyayaBot provides legal information, not legal advice. Always consult a qualified lawyer for your specific situation.
        </p>
      </div>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-2xl font-bold text-center mb-14
                     text-zinc-900 dark:text-zinc-100"
        >
          How It Works
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-10">
          {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
            <motion.div
              key={step}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 1}
              className="text-center"
            >
              <div className="w-12 h-12 bg-gold-500/15 dark:bg-gold-500/15 bg-gold-100
                              border border-gold-500/40 dark:border-gold-500/40 border-gold-300
                              rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gold-600 dark:text-gold-400 font-bold text-sm">{step}</span>
              </div>
              <h3 className="font-semibold mb-2 text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-4 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { Icon: Globe,    title: 'Multiple Indian Languages',     desc: 'English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada — ask in any, get answers in the same.' },
            { Icon: Shield,   title: 'Grounded in Verified Law', desc: 'Every answer cites the exact section, act, and amendment date. No hallucinations.' },
            { Icon: BookOpen, title: 'Repealed Law Detection',  desc: 'Asks about IPC? NyayaBot will tell you it\'s been replaced by BNS 2023 and cite the new law.' },
            { Icon: Sun, title: 'Find Lawyer',  desc: 'Based on the chat the system recommends the nearest best lawyer on Google Maps' },
            { Icon: BookOpen, title: 'Explain Legal Notices',  desc: 'Securely upload legal notices for instant clarification in your native language. We prioritize your confidentiality—documents are processed in real-time and never stored in our database.' },
            { Icon: Shield, title: 'Instant Fraud Detection',  desc: "Don't let threatening legal notices intimidate you. Upload any suspicious document and let NyayaBot’s AI perform a deep-scan for inconsistencies. We flag fraudulent notices in seconds, so you never pay for a scam you don’t owe." }
          ].map(({ Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="card p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-gold-500/12 dark:bg-gold-500/12 bg-gold-100
                              flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-gold-600 dark:text-gold-500" />
              </div>
              <h3 className="font-semibold mb-2 text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Laws in the Database ──────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-4 pb-20">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-2xl font-bold text-center mb-8
                     text-zinc-900 dark:text-zinc-100"
        >
          Laws in the Database
        </motion.h2>
        <div className="space-y-3">
          {SUPPORTED_LAWS.map(({ code, name, note }, i) => (
            <motion.div
              key={code}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="card flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <span className="bg-gold-500/15 dark:bg-gold-500/15 bg-gold-100
                                 text-gold-600 dark:text-gold-400
                                 text-xs font-bold px-2 py-1 rounded font-mono">
                  {code}
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
              </div>
              <span className="text-zinc-500 dark:text-zinc-500 text-sm hidden sm:block">{note}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800
                         px-6 py-8 text-center
                         text-zinc-500 dark:text-zinc-500 text-sm">
        <p>NyayaBot is not a law firm and does not provide legal advice.</p>
        <p className="mt-1">
          Law data sourced from{' '}
          <a
            href="https://legislative.gov.in"
            className="text-gold-600 dark:text-gold-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            legislative.gov.in
          </a>{' '}
          (public domain).
        </p>
      </footer>
    </div>
  );
}
