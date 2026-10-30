import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, UserPlus, LogIn, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'ADMIN_SETUP'>('LOGIN');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register, registerAdmin, isBackendConnected } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const loggedUser = await login(email.trim(), password);

      // Route based on actual verified role returned by the backend
      if (loggedUser.role === 'ADMIN') {
        navigate('/admin');
      } else if (loggedUser.role === 'FACULTY') {
        navigate('/faculty/requests');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (regName.trim().length < 2) {
      setError('Full name must be at least 2 characters long.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setError('Please provide a valid institutional email address.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setLoading(true);

    try {
      await register(regName.trim(), regEmail.trim(), regPassword);
      setSuccess('Account created successfully! Redirecting to student dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (regName.trim().length < 2) return setError('Full name must be at least 2 characters long.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) return setError('Please provide a valid email address.');
    if (regPassword.length < 12) return setError('Admin password must be at least 12 characters long.');
    if (regPassword !== regConfirmPassword) return setError('Password confirmation does not match.');
    if (!bootstrapToken.trim()) return setError('Enter the admin setup token configured on the backend.');

    setLoading(true);
    try {
      await registerAdmin(regName.trim(), regEmail.trim(), regPassword, bootstrapToken.trim());
      setSuccess('Administrator created. Redirecting to the admin dashboard...');
      setTimeout(() => navigate('/admin'), 1000);
    } catch (err: any) {
      setError(err.message || 'Admin setup failed. Check the setup token and whether an admin already exists.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F3F7FC]">
      {/* Left Panel - Campus Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#102448] overflow-hidden flex-col justify-between p-12 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#102448] via-[#102448]/60 to-[#102448]/80" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2166F3] flex items-center justify-center font-bold text-xl text-white shadow-md">
            S
          </div>
          <span className="text-2xl font-bold tracking-tight">Smartly</span>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Access Flow Control Management System
          </h1>
          <p className="text-slate-200 text-base leading-relaxed mb-6 font-normal">
            Manage classrooms, laboratories, auditoriums, and campus facilities with real-time conflict avoidance.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-[#20A875]" />
            <span>Campus Real-Time Scheduling Engine</span>
          </div>
        </div>

        {/* Bottom Caption */}
        <div className="relative z-10 pt-8 border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-slate-300 font-medium">
            Smart Campus. Better Access. Brighter Learning.
          </p>
          <span className="text-[11px] text-slate-400">v2.0 Enterprise</span>
        </div>
      </div>

      {/* Right Panel - Sign In & Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Smartly Brand */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-[#2166F3] flex items-center justify-center font-bold text-lg text-white">
              S
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#102448]">Smartly</h2>
              <p className="text-[11px] text-[#718096]">Access Flow Control Management System</p>
            </div>
          </div>

          {/* Desktop Logo Header */}
          <div className="hidden lg:flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#2166F3] flex items-center justify-center font-bold text-base text-white">
              S
            </div>
            <div>
              <span className="text-lg font-bold text-[#102448]">Smartly</span>
              <p className="text-[10px] text-[#718096] -mt-0.5">Access Flow Control Management System</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-[#17243B] tracking-tight">
              {mode === 'LOGIN' ? 'Welcome Back' : mode === 'ADMIN_SETUP' ? 'Set Up Administrator' : 'Create Student Account'}
            </h2>
            <p className="text-[13px] text-[#718096] mt-0.5">
              {mode === 'LOGIN'
                ? 'Sign in to access campus facilities and schedules.'
                : mode === 'ADMIN_SETUP'
                  ? 'Create the first administrator using the one-time backend setup token.'
                  : 'Register with your institutional credentials to request resources.'}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-3 bg-[#F3F7FC] p-1 rounded-lg border border-[#E1E8F0] mb-4 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setError(null);
                setSuccess(null);
              }}
              className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                mode === 'LOGIN' ? 'bg-white text-[#2166F3] shadow-xs' : 'text-[#718096] hover:text-[#17243B]'
              }`}
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
                setSuccess(null);
              }}
              className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                mode === 'REGISTER' ? 'bg-white text-[#2166F3] shadow-xs' : 'text-[#718096] hover:text-[#17243B]'
              }`}
            >
              <UserPlus size={13} />
              <span>Register Student</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('ADMIN_SETUP'); setError(null); setSuccess(null); }}
              className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                mode === 'ADMIN_SETUP' ? 'bg-white text-[#2166F3] shadow-xs' : 'text-[#718096] hover:text-[#17243B]'
              }`}
            >
              <Shield size={13} />
              <span>First Admin</span>
            </button>
          </div>

          {/* Backend Connectivity Notice */}
          <div className="mb-4">
            {isBackendConnected ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#EAF7F0] border border-[#B7E7D1] text-[11px] text-[#20A875]">
                <CheckCircle2 size={14} className="flex-shrink-0" />
                <span>Backend reachable at <strong>http://localhost:5000/api</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#FEF7EC] border border-[#FCE1B6] text-[11px] text-[#E09214]">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>Backend server offline or starting on port 5000</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#FDEEF0] border border-[#F9C9CF] text-[#E65363] text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-[#EAF7F0] border border-[#B7E7D1] text-[#20A875] text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@smartly.local"
                    required
                    className="w-full bg-white border border-[#E1E8F0] rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-[#17243B] placeholder-[#718096] focus:outline-none focus:border-[#2166F3] focus:ring-1 focus:ring-[#2166F3] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-white border border-[#E1E8F0] rounded-lg pl-10 pr-10 py-2.5 text-xs text-[#17243B] placeholder-[#718096] focus:outline-none focus:border-[#2166F3] focus:ring-1 focus:ring-[#2166F3] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#17243B]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-[#718096]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#E1E8F0] text-[#2166F3] focus:ring-[#2166F3] h-3.5 w-3.5"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('For password resets, contact your campus systems administrator.');
                  }}
                  className="text-[#2166F3] hover:underline font-medium"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2166F3] hover:bg-[#1a54cc] text-white py-2.5 px-4 rounded-lg font-semibold text-xs tracking-wide transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          ) : mode === 'REGISTER' ? (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Grace Hopper"
                    required
                    className="w-full bg-white border border-[#E1E8F0] rounded-lg pl-10 pr-3.5 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="student@smartly.local"
                    required
                    className="w-full bg-white border border-[#E1E8F0] rounded-lg pl-10 pr-3.5 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full bg-white border border-[#E1E8F0] rounded-lg pl-10 pr-10 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#17243B]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full bg-white border border-[#E1E8F0] rounded-lg pl-10 pr-3.5 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2166F3] hover:bg-[#1a54cc] text-white py-2.5 px-4 rounded-lg font-semibold text-xs tracking-wide transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <span>Creating Account...</span> : <span>Register Student Account</span>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSetupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1">Administrator Name</label>
                <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} required minLength={2}
                  className="w-full bg-white border border-[#E1E8F0] rounded-lg px-3.5 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1">Administrator Email</label>
                <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required
                  className="w-full bg-white border border-[#E1E8F0] rounded-lg px-3.5 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1">Admin Setup Token</label>
                <input type="password" value={bootstrapToken} onChange={(e) => setBootstrapToken(e.target.value)} required autoComplete="off"
                  className="w-full bg-white border border-[#E1E8F0] rounded-lg px-3.5 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]" />
                <p className="mt-1 text-[10px] text-[#718096]">Ask the system operator for the one-time token configured in the backend environment.</p>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1">Password (12+ characters)</label>
                <input type={showPassword ? 'text' : 'password'} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={12}
                  className="w-full bg-white border border-[#E1E8F0] rounded-lg px-3.5 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#17243B] mb-1">Confirm Password</label>
                <input type={showPassword ? 'text' : 'password'} value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} required minLength={12}
                  className="w-full bg-white border border-[#E1E8F0] rounded-lg px-3.5 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#2166F3] hover:bg-[#1a54cc] text-white py-2.5 px-4 rounded-lg font-semibold text-xs tracking-wide transition-colors shadow-sm disabled:opacity-70">
                {loading ? 'Setting up administrator...' : 'Create First Admin'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
