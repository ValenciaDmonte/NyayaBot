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

  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  // Register form state
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    login(loginData);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    register(registerData);
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Scale className="w-8 h-8 text-saffron-600" />
          <span className="text-2xl font-bold text-white">NyayaBot</span>
        </div>

        {/* Card */}
        <div className="card p-8">
          {/* Tabs */}
          <div className="flex mb-6 bg-navy-900 rounded-lg p-1">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'login'
                  ? 'bg-saffron-600 text-white'
                  : 'text-navy-200 hover:text-white'
              }`}
              onClick={() => setActiveTab('login')}
            >
              Log In
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'register'
                  ? 'bg-saffron-600 text-white'
                  : 'text-navy-200 hover:text-white'
              }`}
              onClick={() => setActiveTab('register')}
            >
              Register
            </button>
          </div>

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-navy-200 mb-1">Email</label>
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
                <label className="block text-sm text-navy-200 mb-1">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData((d) => ({ ...d, password: e.target.value }))}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full mt-2"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm text-navy-200 mb-1">Full Name</label>
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
                <label className="block text-sm text-navy-200 mb-1">Email</label>
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
                <label className="block text-sm text-navy-200 mb-1">Password</label>
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
              <button
                type="submit"
                className="btn-primary w-full mt-2"
                disabled={isRegistering}
              >
                {isRegistering ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Disclaimer */}
          <p className="mt-6 text-xs text-navy-300 text-center">
            By continuing, you acknowledge that NyayaBot provides legal information, not professional legal advice.
          </p>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-navy-300 hover:text-saffron-500 text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
