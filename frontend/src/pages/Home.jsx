/**
 * pages/Home.jsx — Landing page
 *
 * Communicates NyayaBot's value prop clearly:
 * - What it does (legal help in your language)
 * - How it works (3 steps)
 * - Which laws it covers
 * - CTA to start
 */

import { Link } from 'react-router-dom';
import { Scale, Shield, Globe, ChevronRight, BookOpen } from 'lucide-react';
import useAuthStore from '../store/authStore';

const SUPPORTED_LAWS = [
  { code: 'BNS', name: 'Bharatiya Nyaya Sanhita 2023', note: 'Replaced IPC' },
  { code: 'BNSS', name: 'Bharatiya Nagarik Suraksha Sanhita 2023', note: 'Replaced CrPC' },
  { code: 'CONST', name: 'Constitution of India', note: 'Fundamental Rights (Art. 14–22)' },
  { code: 'RTI', name: 'Right to Information Act 2005', note: 'Public records access' },
  { code: 'CPA', name: 'Consumer Protection Act 2019', note: 'Consumer rights' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Ask in your language', desc: 'Type or speak your legal question in Hindi, Tamil, Telugu, Bengali, or English.' },
  { step: '02', title: 'AI searches verified law', desc: 'NyayaBot searches only official Indian law documents — never general internet.' },
  { step: '03', title: 'Get cited answers', desc: 'Receive a clear answer with exact law citations: act name, section, amendment date.' },
];

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <div className="flex items-center gap-2">
          <Scale className="w-7 h-7 text-saffron-600" />
          <span className="text-xl font-bold">NyayaBot</span>
        </div>
        <Link
          to={isAuthenticated ? '/chat' : '/login'}
          className="btn-primary text-sm"
        >
          {isAuthenticated ? 'Open Chat' : 'Get Started'}
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-navy-800 border border-saffron-600/30 rounded-full px-4 py-2 mb-8 text-sm text-saffron-400">
          <span className="w-2 h-2 rounded-full bg-saffron-600 animate-pulse" />
          Powered by verified Indian law
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Legal Help in<br />
          <span className="text-saffron-600">Your Language</span>
        </h1>
        <p className="text-xl text-navy-200 mb-10 max-w-2xl mx-auto">
          Ask any legal question in Hindi, Tamil, Telugu, Bengali, or English.
          Get accurate, cited answers grounded in official Indian law — not AI guesses.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={isAuthenticated ? '/chat' : '/login'}
            className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-3"
          >
            Start Free Consultation
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
        <p className="mt-4 text-sm text-navy-300">
          Free • No phone number required • 7 Indian languages supported
        </p>
      </section>

      {/* Disclaimer banner */}
      <div className="bg-amber-900/30 border-y border-amber-700/50 px-6 py-3 text-center">
        <p className="text-amber-300 text-sm">
          ⚠️ NyayaBot provides legal information, not legal advice. Always consult a qualified lawyer for your specific situation.
        </p>
      </div>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-12 h-12 bg-saffron-600/20 border border-saffron-600/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-saffron-400 font-bold text-sm">{step}</span>
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-navy-200 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-6">
            <Globe className="w-8 h-8 text-saffron-600 mb-3" />
            <h3 className="font-semibold mb-2">7 Indian Languages</h3>
            <p className="text-navy-200 text-sm">English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada — ask in any, get answers in the same.</p>
          </div>
          <div className="card p-6">
            <Shield className="w-8 h-8 text-saffron-600 mb-3" />
            <h3 className="font-semibold mb-2">Grounded in Verified Law</h3>
            <p className="text-navy-200 text-sm">Every answer cites the exact section, act, and amendment date. No hallucinations.</p>
          </div>
          <div className="card p-6">
            <BookOpen className="w-8 h-8 text-saffron-600 mb-3" />
            <h3 className="font-semibold mb-2">Repealed Law Detection</h3>
            <p className="text-navy-200 text-sm">Asks about IPC? NyayaBot will tell you it's been replaced by BNS 2023 and cite the new law.</p>
          </div>
        </div>
      </section>

      {/* Supported Laws */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Laws in the Database</h2>
        <div className="space-y-3">
          {SUPPORTED_LAWS.map(({ code, name, note }) => (
            <div key={code} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="bg-saffron-600/20 text-saffron-400 text-xs font-bold px-2 py-1 rounded">{code}</span>
                <span className="font-medium">{name}</span>
              </div>
              <span className="text-navy-300 text-sm hidden sm:block">{note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-700 px-6 py-8 text-center text-navy-300 text-sm">
        <p>NyayaBot is not a law firm and does not provide legal advice.</p>
        <p className="mt-1">Law data sourced from <a href="https://legislative.gov.in" className="text-saffron-500 hover:underline" target="_blank" rel="noopener noreferrer">legislative.gov.in</a> (public domain).</p>
      </footer>
    </div>
  );
}
