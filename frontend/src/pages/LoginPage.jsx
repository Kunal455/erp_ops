import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  FileText,
  BarChart3,
  ShieldCheck,
  Star,
  UserPlus,
  LogIn,
} from 'lucide-react';

export const LoginPage = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@fundsroom.com');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState('OPERATIONS');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        await signup({ name, email, password, role });
      } else {
        await login(email, password);
      }
      navigate('/inventory');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isSignup ? 'Registration failed. Please verify credentials.' : 'Invalid email or password')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userEmail, userPassword) => {
    setIsSignup(false);
    setEmail(userEmail);
    setPassword(userPassword);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* LEFT COLUMN: Clean Form Panel */}
      <div className="w-full lg:w-[48%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 bg-white">
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {/* Main Title */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif tracking-tight">
              {isSignup ? 'Create your account' : 'Sign in to your account'}
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              {isSignup
                ? 'Join FundsERP Operations CRM to manage inventory and workflows.'
                : 'Welcome back! Enter your credentials to access your ERP portal.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-2 animate-shake">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Users className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Email address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role selection for signup */}
            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Assigned ERP Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                >
                  <option value="ADMIN">ADMIN (Full Access)</option>
                  <option value="OPERATIONS">OPERATIONS (Inventory, Transfers & Work Orders)</option>
                  <option value="SALES">SALES (Inventory & Customer Orders)</option>
                </select>
              </div>
            )}

            {/* Remember Me */}
            {!isSignup && (
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Remember me</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold py-3.5 px-6 rounded-xl transition duration-150 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <span>Please wait...</span>
              ) : isSignup ? (
                <>
                  <span>Create Account</span>
                  <UserPlus className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Role Logins */}
          {!isSignup && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
                1-Click Demo Accounts
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@fundsroom.com', 'admin123')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ops@fundsroom.com', 'ops123')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                >
                  Operations
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('sales@fundsroom.com', 'sales123')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                >
                  Sales
                </button>
              </div>
            </div>
          )}

          {/* Footer Terms & Toggle */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-xs text-slate-400">
              By signing in you agree to our{' '}
              <a href="#terms" className="text-indigo-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-indigo-600 hover:underline">
                Privacy Policy
              </a>
              .
            </p>

            <p className="text-sm text-slate-600">
              {isSignup ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(false);
                      setError(null);
                    }}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Sign in here
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(true);
                      setError(null);
                    }}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Create one free
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Rich Deep Purple Hero Banner matching the screenshot */}
      <div className="w-full lg:w-[52%] bg-[#27144d] text-white p-8 sm:p-12 lg:p-16 xl:p-20 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-xl mx-auto my-auto space-y-8">
          {/* Top Pill Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-md border border-white/10">
              <Zap className="w-3.5 h-3.5 text-indigo-300" />
              <span>FundsERP</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20 font-bold">AI</span>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-md border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI-Native Operations CRM</span>
            </div>
          </div>

          {/* Headline */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif leading-tight tracking-tight text-white">
              Welcome back to your operations command center
            </h2>
            <p className="text-purple-200/90 text-sm sm:text-base mt-4 font-normal">
              Your customers, inventory, and challans are waiting for you.
            </p>
          </div>

          {/* Feature List with Colored Circular Icons */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-[#3d2475] flex items-center justify-center shrink-0 border border-purple-400/20 text-purple-300">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-purple-100">
                Centralized customer management
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-[#5a3045] flex items-center justify-center shrink-0 border border-amber-400/20 text-amber-300">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-purple-100">
                Streamlined challan generation
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-[#1b4352] flex items-center justify-center shrink-0 border border-teal-400/20 text-teal-300">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-purple-100">
                Real-time inventory & insights
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-[#4e1f3a] flex items-center justify-center shrink-0 border border-rose-400/20 text-rose-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-purple-100">
                Role-based access control
              </span>
            </div>
          </div>

          {/* Social Proof Rating */}
          <div className="flex items-center space-x-2 pt-2">
            <div className="flex text-amber-400 space-x-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <span className="text-xs font-semibold text-purple-200">
              Trusted by 50+ businesses
            </span>
          </div>

          {/* 3 Metric Cards matching screenshot */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition hover:bg-white/10">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">12K+</div>
              <div className="text-[11px] sm:text-xs text-purple-200/80 mt-1">Customers managed</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition hover:bg-white/10">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">1.5L+</div>
              <div className="text-[11px] sm:text-xs text-purple-200/80 mt-1">Challans generated</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition hover:bg-white/10">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">3.4x</div>
              <div className="text-[11px] sm:text-xs text-purple-200/80 mt-1">Faster operations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
