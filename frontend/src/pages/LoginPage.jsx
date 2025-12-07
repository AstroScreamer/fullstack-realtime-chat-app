import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import AuthImagePattern from "../components/AuthImagePattern";
import { EyeOff, Mail, MessageSquare, Lock, Eye, Loader2, Shield, AlertCircle } from "lucide-react";



const Reset = () => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const handleResetPassword = async () => {
    setError('');

    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(resetEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await response.json();

      if (response.ok) {
        setResetSent(true);
        setError('');
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setShowResetModal(false);
    setResetSent(false);
    setResetEmail('');
    setError('');
  };

  return (
    <div className="text-center">  
      {/* Forgot Password Link */}
      <div className="text-center text-primary">
        <button
          onClick={() => setShowResetModal(true)}
          className="link link-primary"
        >
          Forgot your password?
        </button>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
            {!resetSent ? (
              <>
                <h3 className="text-xl font-semibold mb-4">Reset Password</h3>
                <p className="text-base-content/70 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-error mb-4">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-control mb-4">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setError('');
                    }}
                    className="px-3 py-2 mb-4
                    input input-bordered rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-full"
                    required
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleResetPassword();
                      }
                    }}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-300"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={!resetEmail || isLoading}
                    className="px-4 py-2 bg-primary text rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary flex items-center gap-2"
                  >
                    {isLoading && <span className="loading loading-spinner loading-xs"></span>}
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-success" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Check your email</h3>
                <p className="text-base-content/70 mb-4">
                  We've sent a password reset link to <strong>{resetEmail}</strong>
                </p>
                <p className="text-sm text-base-content/60 mb-4">
                  The link will expire in 1 hour. If you don't see the email, check your spam folder.
                </p>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const {login, isLoggingIn} = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    login(formData);
  };
  
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* left side */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Welcome Back</h1>
              <p className="text-base-content/60">Get started with your free account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className={`input input-bordered rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-full`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-full`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"  
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-base-content/40" />
                  ) : (
                    <Eye className="size-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Log in"
              )}
            </button>
          </form>
          
          <div>
            <Reset/>
          </div>
          <div className="text-center">
              <p className="text-base-content/60">
              Don't have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* right side */}
      <AuthImagePattern 
        title="Join our Community"
        subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
      />

    </div>
  )
};

export default LoginPage;