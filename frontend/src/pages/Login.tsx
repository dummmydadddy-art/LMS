import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { KeyRound, User, Sparkles, Loader2, ArrowRight, X } from 'lucide-react';
import api from '../services/api';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'EMAIL' | 'OTP' | 'PASSWORD'>('EMAIL');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setForgotError('Please enter your email ID');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await api.post('/api/auth/forgot-password', { email: resetEmail });
      if (res.data?.success) {
        setForgotSuccess(res.data.message || 'OTP sent successfully!');
        setResetStep('OTP');
      } else {
        setForgotError(res.data?.error || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Failed to send OTP. Ensure email is correct.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp) {
      setForgotError('Please enter the 6-digit OTP code');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await api.post('/api/auth/verify-otp', { email: resetEmail, otp: resetOtp });
      if (res.data?.success) {
        setForgotSuccess('OTP verified successfully!');
        setResetStep('PASSWORD');
      } else {
        setForgotError(res.data?.error || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Verification failed. Try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetNewPassword || !resetConfirmPassword) {
      setForgotError('Please fill in all fields');
      return;
    }
    if (resetNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: resetEmail,
        otp: resetOtp,
        new_password: resetNewPassword
      });
      if (res.data?.success) {
        setForgotSuccess('Password reset successfully! You can now log in.');
        setTimeout(() => {
          setForgotModalOpen(false);
        }, 2000);
      } else {
        setForgotError(res.data?.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          try {
            const checkRes = await api.post('/api/auth/check-user', { email });
            if (checkRes.data && checkRes.data.success) {
              if (checkRes.data.exists) {
                setError('invalid password');
              } else {
                setError('invalid user id');
              }
            } else {
              setError('Invalid login credentials');
            }
          } catch (checkErr) {
            setError('Invalid login credentials');
          }
        } else {
          setError(authError.message);
        }
      } else {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail: string) => {
    setLoading(true);
    setError('');
    setEmail(roleEmail);
    setPassword('Password123'); // Preset default testing password

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: roleEmail,
        password: 'Password123',
      });

      if (authError) {
        setError(authError.message + ' (Make sure users are registered in Supabase Auth first)');
      } else {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError('Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-dark-950">
      {/* Decorative blurred backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -z-10 animate-pulse-subtle"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-700/10 rounded-full blur-3xl -z-10 animate-pulse-subtle" style={{ animationDelay: '1.5s' }}></div>

      <div className="w-full max-w-md glass-card p-8 relative">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-800 shadow-lg shadow-primary-500/10 mb-4">
            <img src="/logo.png" alt="LMS" className="h-12 w-12 object-contain" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">LMS</h2>
          <p className="text-slate-400 text-sm mt-1">Sign in to access your digital classroom</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 text-sm rounded-xl p-3.5 mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">User ID</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Enter your User ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 glass-input focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(true);
                  setResetStep('EMAIL');
                  setResetEmail('');
                  setResetOtp('');
                  setResetNewPassword('');
                  setResetConfirmPassword('');
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors font-semibold"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 glass-input focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Panel */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-4">Quick Demo Logins</h4>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleQuickLogin('admin@lms.com')}
              className="text-xs py-2 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              disabled={loading}
            >
              Super Admin
            </button>
            <button
              onClick={() => handleQuickLogin('teacher@lms.com')}
              className="text-xs py-2 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              disabled={loading}
            >
              Teacher
            </button>
            <button
              onClick={() => handleQuickLogin('student@lms.com')}
              className="text-xs py-2 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              disabled={loading}
            >
              Student
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mt-2.5">
            <button
              onClick={() => handleQuickLogin('Mukul-admin@lms.com')}
              className="text-xs py-2 px-2.5 rounded-lg bg-primary-600/10 hover:bg-primary-600/20 border border-primary-500/20 text-primary-400 transition-colors"
              disabled={loading}
            >
              Mukul Admin
            </button>
            <button
              onClick={() => handleQuickLogin('Mukul-teacher@lms.com')}
              className="text-xs py-2 px-2.5 rounded-lg bg-primary-600/10 hover:bg-primary-600/20 border border-primary-500/20 text-primary-400 transition-colors"
              disabled={loading}
            >
              Mukul Teacher
            </button>
            <button
              onClick={() => handleQuickLogin('Mukul-student@lms.com')}
              className="text-xs py-2 px-2.5 rounded-lg bg-primary-600/10 hover:bg-primary-600/20 border border-primary-500/20 text-primary-400 transition-colors"
              disabled={loading}
            >
              Mukul Student
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-3">Default Password: <span className="font-mono text-slate-400">Password123</span></p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="glass-card w-full max-w-md overflow-hidden flex flex-col relative bg-dark-900 border-slate-800 shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Reset Password</h3>
                <p className="text-xs text-slate-400 mt-0.5">Follow the steps to recover your account</p>
              </div>
              <button
                onClick={() => setForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 border border-slate-800 hover:bg-slate-800 p-2 rounded-xl transition-colors"
                disabled={forgotLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {forgotError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl p-3 text-center">
                  {forgotError}
                </div>
              )}
              {forgotSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl p-3 text-center">
                  {forgotSuccess}
                </div>
              )}

              {/* STEP 1: Request OTP by Email */}
              {resetStep === 'EMAIL' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email Address / User ID</label>
                    <input
                      type="text"
                      placeholder="e.g. student@lms.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="w-full glass-input text-sm text-slate-200"
                      required
                      disabled={forgotLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary py-2.5 text-xs font-bold mt-2 flex items-center justify-center gap-2"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Verification OTP'}
                  </button>
                </form>
              )}

              {/* STEP 2: Verify 6-digit OTP */}
              {resetStep === 'OTP' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      maxLength={6}
                      value={resetOtp}
                      onChange={e => setResetOtp(e.target.value)}
                      className="w-full glass-input text-center text-sm font-mono tracking-widest text-slate-200"
                      required
                      disabled={forgotLoading}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setResetStep('EMAIL')}
                      className="text-xs text-slate-400 hover:text-slate-200 font-semibold"
                      disabled={forgotLoading}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
                      disabled={forgotLoading}
                    >
                      Resend OTP
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary py-2.5 text-xs font-bold mt-2 flex items-center justify-center gap-2"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify Code'}
                  </button>
                </form>
              )}

              {/* STEP 3: Choose New Password */}
              {resetStep === 'PASSWORD' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={resetNewPassword}
                      onChange={e => setResetNewPassword(e.target.value)}
                      className="w-full glass-input text-sm text-slate-200"
                      required
                      disabled={forgotLoading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      value={resetConfirmPassword}
                      onChange={e => setResetConfirmPassword(e.target.value)}
                      className="w-full glass-input text-sm text-slate-200"
                      required
                      disabled={forgotLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary py-2.5 text-xs font-bold mt-2 flex items-center justify-center gap-2"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
