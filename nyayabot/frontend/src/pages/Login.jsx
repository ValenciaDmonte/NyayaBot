/**
 * pages/Login.jsx — Login & Registration page
 *
 * Two tabs: Login and Register.
 * Uses the useAuth hook which handles API calls and navigation.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [activeTab, setActiveTab] = useState('login');
  const { login, register, isLoggingIn, isRegistering } = useAuth();

  const [loginData,    setLoginData]    = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });

  const handleLogin    = (e) => { e.preventDefault(); login(loginData); };
  const handleRegister = (e) => { e.preventDefault(); register(registerData); };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Scale className="w-8 h-8 text-gold-600 dark:text-gold-500" />
          <span className="text-2xl font-bold text-zinc-900 dark:text-white">NyayaBot</span>
        </div>

        {/* Card */}
        <div className="card p-8">

          {/* Tabs */}
          <div className="flex mb-6 bg-zinc-100 dark:bg-zinc-950 rounded-lg p-1">
            {['login', 'register'].map((tab) => (
              <button
                key={tab}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-gold-500 text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'login' ? 'Log In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData((d) => ({ ...d, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData((d) => ({ ...d, password: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full mt-2" disabled={isLoggingIn}>
                {isLoggingIn ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-300 mb-1">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Arjun Sharma"
                  value={registerData.name}
                  onChange={(e) => setRegisterData((d) => ({ ...d, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData((d) => ({ ...d, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Min. 8 characters"
                  value={registerData.password}
                  onChange={(e) => setRegisterData((d) => ({ ...d, password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <button type="submit" className="btn-primary w-full mt-2" disabled={isRegistering}>
                {isRegistering ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500 text-center">
            By continuing, you acknowledge that NyayaBot provides legal information, not professional legal advice.
          </p>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-zinc-500 dark:text-zinc-400 hover:text-gold-600 dark:hover:text-gold-400 text-sm transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
