import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useBranding } from '../context/BrandingContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BrandLogo } from '../components/common/BrandLogo';
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { branding } = useBranding();
  const { isDark, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError('');
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      const msg = 'Please enter both username and password.';
      setInlineError(msg);
      error(msg);
      return;
    }

    setLoading(true);
    try {
      await login(cleanUsername, cleanPassword, rememberMe);
      success('Logged in successfully! Redirecting...');
      navigate('/app/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      const msg =
        err.response?.data?.detail ||
        (err.message === 'Network Error'
          ? 'Network error. Please check your internet connection or server status.'
          : 'Invalid username or password. Default is admin / admin123456');
      setInlineError(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 relative overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Background ambient glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between py-1.5 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Website</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 uppercase tracking-wider">
            Staff Portal
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-center"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Main Login Experience */}
      <div className="max-w-md w-full mx-auto relative z-10 my-auto py-2 sm:py-4">
        {/* Branding Area */}
        <div className="text-center mb-5 sm:mb-6 flex flex-col items-center">
          <div className="mb-2.5 sm:mb-3">
            <BrandLogo variant="login" imageOnly={true} />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {branding.foundation_name || 'Foundation Management Portal'}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs sm:max-w-sm">
            {branding.tagline || 'Empowering Communities through Islamic Microfinance & Sadaqah'}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/60 transition-colors duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Inline Error Alert */}
            {inlineError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{inlineError}</span>
              </div>
            )}

            {/* Username Input */}
            <Input
              label="Username"
              required
              type="text"
              placeholder="Enter username (e.g. admin)"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (inlineError) setInlineError('');
              }}
              autoFocus
              autoComplete="username"
              className="bg-slate-50/80 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-950 transition-colors"
            />

            {/* Password Input with Visibility Toggle */}
            <div className="relative">
              <Input
                label="Password"
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="•••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (inlineError) setInlineError('');
                }}
                autoComplete="current-password"
                className="bg-slate-50/80 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-950 pr-10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 bottom-2.5 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none rounded-md"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500/30 focus:ring-offset-0 cursor-pointer"
                />
                <span className="font-medium">Remember Me (30 Days)</span>
              </label>

              <button
                type="button"
                onClick={() => alert("To reset your password, please contact your Foundation Super Admin at admin@foundation.org.")}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In Primary Action Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full py-2.5 sm:py-3 text-sm font-bold tracking-tight shadow-md shadow-indigo-500/20 mt-1"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Management System
            </Button>
          </form>
        </div>
      </div>

      {/* Footer Meta Text */}
      <div className="w-full text-center py-2 relative z-10">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Secure Administrative Portal • Foundation Management System
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
