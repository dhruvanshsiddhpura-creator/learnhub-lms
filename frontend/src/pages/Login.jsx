import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, GraduationCap, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const { login, setSocialCredentials } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Route to redirect back to or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  // Intercept query parameters (token / refreshToken / error) from OAuth redirects
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const oauthError = params.get('error');

    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      // Clean query string
      navigate('/login', { replace: true });
    } else if (token && refreshToken) {
      setOauthLoading(true);
      setSocialCredentials(token, refreshToken).then((res) => {
        setOauthLoading(false);
        if (res.success) {
          navigate(from, { replace: true });
        } else {
          setError(res.message || 'OAuth authentication failed.');
        }
      });
    }
  }, [location, navigate, setSocialCredentials, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(true); // Keep loading true during route change
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }
  };

  const handleQuickLogin = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
  };

  const handleOAuthRedirect = (provider) => {
    setError('');
    setOauthLoading(true);
    window.location.href = `http://localhost:5000/api/auth/${provider}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-dark-950">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-primary-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none"></div>

      {oauthLoading && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-primary-500 animate-spin"></div>
          </div>
          <p className="mt-4 text-dark-300 font-semibold animate-pulse">Completing social login...</p>
        </div>
      )}

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10 animate-fade-in">
        
        {/* Left Side: Brand presentation */}
        <div className="md:col-span-6 space-y-6 hidden md:block">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 text-sm font-semibold tracking-wide">
            <GraduationCap size={16} /> Learning Management System
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight">
            Elevate Your <br/>
            <span className="text-gradient">Knowledge</span> Hub
          </h1>
          
          <p className="text-dark-300 text-lg leading-relaxed max-w-md">
            Unlock your full learning potential. Create courses, enroll in modern curricula, and track your achievements with a gorgeous, role-based platform.
          </p>

          <div className="pt-4 space-y-4">
            <h4 className="text-sm font-bold text-dark-400 uppercase tracking-widest">Quick Demo Login</h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleQuickLogin('teacher@lms.com', 'password123')}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-dark-700 bg-dark-900/50 hover:bg-primary-950/20 hover:border-primary-500/50 transition-all text-dark-300"
              >
                Teacher: teacher@lms.com
              </button>
              <button
                onClick={() => handleQuickLogin('admin@lms.com', 'password123')}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-dark-700 bg-dark-900/50 hover:bg-primary-950/20 hover:border-primary-500/50 transition-all text-dark-300"
              >
                Admin: admin@lms.com
              </button>
            </div>
            <p className="text-xs text-dark-500 italic">
              Default credentials password: <span className="font-semibold text-dark-400">password123</span>
            </p>
          </div>
        </div>

        {/* Right Side: Log In Box */}
        <div className="md:col-span-6 w-full max-w-md mx-auto">
          <div className="glass-panel p-8 rounded-2xl shadow-2xl relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome back</h2>
              <p className="text-dark-400 text-sm">
                Enter your credentials to manage your learning workspace.
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 text-sm animate-shake">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Social Authentication Buttons */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => handleOAuthRedirect('google')}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-dark-700/80 bg-dark-900/50 hover:bg-dark-850 hover:border-dark-600 text-white font-semibold text-xs transition-all duration-200 active:scale-[0.99]"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => handleOAuthRedirect('github')}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-dark-700/80 bg-dark-900/50 hover:bg-dark-850 hover:border-dark-600 text-white font-semibold text-xs transition-all duration-200 active:scale-[0.99]"
              >
                <svg fill="#FFFFFF" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                Continue with GitHub
              </button>

              <button
                type="button"
                onClick={() => handleOAuthRedirect('facebook')}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-dark-700/80 bg-dark-900/50 hover:bg-dark-850 hover:border-dark-600 text-white font-semibold text-xs transition-all duration-200 active:scale-[0.99]"
              >
                <svg fill="#1877F2" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </button>
            </div>

            {/* Separator line */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute w-full border-t border-dark-800"></div>
              <span className="relative px-3 bg-dark-900 text-dark-500 text-[10px] font-bold uppercase tracking-wider">
                Or Sign In With Email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-300">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-dark-300">Password</label>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-white text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-brand text-white font-semibold rounded-xl shadow-lg hover:shadow-primary-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-primary-400/20 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-dark-800 text-center">
              <p className="text-sm text-dark-400">
                New to LearnHub?{' '}
                <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                  Create an account
                </Link>
              </p>
            </div>
            
            {/* Quick Demo selection for mobile (visible under md screen) */}
            <div className="mt-6 p-4 rounded-xl border border-dark-800 bg-dark-950/40 md:hidden space-y-3">
              <h4 className="text-xs font-bold text-dark-400 uppercase tracking-widest text-center">Demo Quick Log In</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickLogin('teacher@lms.com', 'password123')}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-dark-700 bg-dark-900/50 text-dark-300"
                >
                  Teacher View
                </button>
                <button
                  onClick={() => handleQuickLogin('admin@lms.com', 'password123')}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-dark-700 bg-dark-900/50 text-dark-300"
                >
                  Admin View
                </button>
              </div>
            </div>
            
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Login;
