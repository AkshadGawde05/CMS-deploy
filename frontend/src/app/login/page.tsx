'use client';
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Mail, Lock, Eye, EyeOff, GraduationCap, Phone, KeyRound } from 'lucide-react';
import Link from 'next/link';

type LoginMode = 'password' | 'otp';

export default function LoginPage() {
  const { login, requestOtp, verifyOtp } = useAuth();
  const [mode, setMode] = useState<LoginMode>('otp'); // Default to OTP login
  
  // Password login state
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP login state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Common state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(emailOrPhone, password);
      // login() will redirect based on role; no further action here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await requestOtp(phone);
      setOtpSent(true);
      setError('');
      
      // Start countdown for resend (30 seconds)
      setCountdown(30);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !otp) {
      setError('Phone and OTP are required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyOtp(phone, otp);
      // verifyOtp() will redirect based on role
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (countdown === 0) {
      handleRequestOtp();
    }
  };

  const switchToPasswordMode = () => {
    setMode('password');
    setError('');
    setOtpSent(false);
  };

  const switchToOtpMode = () => {
    setMode('otp');
    setError('');
    setOtpSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">EduManage Pro</h2>
            <p className="mt-2 text-sm text-gray-600">Coaching Institute Management</p>
          </div>

          {/* Login Mode Toggle */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={switchToOtpMode}
              className={`flex-1 py-2 px-4 text-center font-medium text-sm ${
                mode === 'otp'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              OTP Login
            </button>
            <button
              type="button"
              onClick={switchToPasswordMode}
              className={`flex-1 py-2 px-4 text-center font-medium text-sm ${
                mode === 'password'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Password Login
            </button>
          </div>

          {/* OTP Login Form */}
          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* Phone Input */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={otpSent}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition duration-150 ease-in-out text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              ) : (
                <>
                  {/* OTP Input */}
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                      OTP Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="otp"
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition duration-150 ease-in-out text-gray-900 placeholder-gray-400 text-center tracking-widest font-mono"
                        placeholder="Enter 6-digit OTP"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Check your backend console for the OTP code
                    </p>
                  </div>

                  {/* Resend OTP */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={countdown > 0}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP & Login'}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Password Login Form */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-6">
              {/* Email/Phone Input */}
              <div>
                <label htmlFor="emailOrPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Email / Phone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="emailOrPhone"
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition duration-150 ease-in-out text-gray-900 placeholder-gray-400"
                    placeholder="Enter your email or phone number"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition duration-150 ease-in-out text-gray-900 placeholder-gray-400"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login with Password'}
              </button>

              {/* Forgot Password */}
              <div className="text-center">
                <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
                  <Lock className="h-4 w-4" />
                  Forgot Password?
                </Link>
              </div>
            </form>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 mt-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Note: Accounts are created by admin */}
          <div className="mt-6 text-center text-sm text-gray-600">
            New here? Please contact your administrator to create your account.
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">Need help? Contact your administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}
