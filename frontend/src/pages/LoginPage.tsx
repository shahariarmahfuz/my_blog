import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Lock,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useBranding } from '../context/BrandingContext';

export const LoginPage: React.FC = () => {
  const { branding } = useBranding();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
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
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      error('Please enter both username and password.');
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
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 px-4 sm:px-6 lg:px-8 py-8 relative overflow-hidden text-slate-100">
      {/* Top back navigation */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Public Website</span>
        </Link>
        <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest">
          Staff Portal
        </span>
      </div>

      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full mx-auto relative z-10 my-auto">
        {/* Brand logo & title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4">
            <BrandLogo variant="login" imageOnly={true} />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {branding.foundation_name || 'Foundation Management Portal'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {branding.tagline || 'Secure Administrative & Financial Ledger System'}
          </p>
        </div>

        {/* Login form card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username *"
              type="text"
              placeholder="Enter username (e.g. admin)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />

            <div className="relative">
              <Input
                label="Password *"
                type={showPassword ? 'text' : 'password'}
                placeholder="•••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-white transition-colors"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30"
                />
                <span>Remember Me (30 Days)</span>
              </label>

              <span
                onClick={() => alert("To reset your password, please contact your Foundation Super Admin at admin@foundation.org.")}
                className="text-emerald-400 hover:underline cursor-pointer font-semibold"
              >
                Forgot Password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Management System
            </Button>
          </form>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Secure Management System • End-to-End Financial Ledger Auditability
      </p>
    </div>
  );
};
