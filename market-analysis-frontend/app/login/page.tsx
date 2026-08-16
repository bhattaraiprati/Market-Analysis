'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    // Clear any previous errors
    clearError();

    // Card 3D hover effect
    const card = document.querySelector('.glass-card');
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768 || !card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x > 0 && x < rect.width && y > 0 && y < rect.height) {
        const rotateX = (y - rect.height / 2) / 100;
        const rotateY = (rect.width / 2 - x) / 100;
        (card as HTMLElement).style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      } else {
        (card as HTMLElement).style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login({ email, password });

      const { organization } = useAuthStore.getState();

      // An authenticated user must create or join an organization before
      // accessing any dashboard route.
      if (!organization) {
        router.replace('/register/organization');
        return;
      }

      const requestedRedirect = searchParams.get('redirect');
      const redirectUrl = requestedRedirect?.startsWith('/dashboard')
        ? requestedRedirect
        : '/dashboard';
      router.replace(redirectUrl);
    } catch (error) {
      // Error is handled by the store
      console.error('Login failed:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{
        backgroundColor: '#f8f9ff',
        backgroundImage: 'radial-gradient(#1a707010 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        padding: '16px'
      }}
    >
      <main className="w-full max-w-[480px] animate-fade-in">
        <div
          className="glass-card rounded-xl shadow-lg relative overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #bec9c8',
            padding: '24px'
          }}
        >
          {/* Decorative accent line */}
          <div
            className="absolute top-0 left-0 w-full"
            style={{
              height: '6px',
              backgroundColor: '#1a7070'
            }}
          ></div>

          {/* Brand Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-1">
              {/* <span
                className="material-symbols-outlined text-[40px]"
                style={{
                  fontVariationSettings: "'FILL' 1",
                  color: '#1a7070'
                }}
              >
                smart_toy
              </span> */}
              <h1
                className="text-2xl font-semibold tracking-tight"
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  color: '#005657',
                  fontWeight: '600',
                  lineHeight: '32px'
                }}
              >
                PersonaFlow
              </h1>
            </div>
            <p
              className="text-center px-6"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                lineHeight: '24px',
                color: '#3f4948'
              }}
            >
              Welcome back. Sign in to manage your AI personas and knowledge base.
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div
                className="p-4 rounded-lg flex items-start gap-3"
                style={{
                  backgroundColor: '#ffdad6',
                  border: '1px solid #ba1a1a',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: '#ba1a1a', fontSize: '20px' }}
                >
                  error
                </span>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#93000a',
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  lineHeight: '16px',
                  fontWeight: '500',
                  letterSpacing: '0.02em',
                  color: '#0b1c30'
                }}
              >
                Email Address
              </label>
              <div className="relative group">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#6f7979' }}
                  onFocus={(e: any) => e.target.style.color = '#1a7070'}
                >
                  mail
                </span>
                <input
                  className="w-full px-3 py-3 rounded-lg outline-none transition-all"
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '16px',
                    border: '1px solid #bec9c8',
                    backgroundColor: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    lineHeight: '24px',
                    color: '#0b1c30'
                  }}
                  id="email"
                  name="email"
                  placeholder="name@company.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1a7070';
                    e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                    const icon = e.target.previousElementSibling as HTMLElement;
                    if (icon) icon.style.color = '#1a7070';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#bec9c8';
                    e.target.style.boxShadow = 'none';
                    const icon = e.target.previousElementSibling as HTMLElement;
                    if (icon) icon.style.color = '#6f7979';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    lineHeight: '16px',
                    fontWeight: '500',
                    letterSpacing: '0.02em',
                    color: '#0b1c30'
                  }}
                >
                  Password
                </label>
                <Link
                  href="#"
                  className="hover:underline transition-all"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '12px',
                    lineHeight: '14px',
                    fontWeight: '500',
                    color: '#1a7070'
                  }}
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#6f7979' }}
                >
                  lock
                </span>
                <input
                  className="w-full py-3 rounded-lg outline-none transition-all"
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    border: '1px solid #bec9c8',
                    backgroundColor: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    lineHeight: '24px',
                    color: '#0b1c30'
                  }}
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1a7070';
                    e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                    const icon = e.target.previousElementSibling as HTMLElement;
                    if (icon) icon.style.color = '#1a7070';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#bec9c8';
                    e.target.style.boxShadow = 'none';
                    const icon = e.target.previousElementSibling as HTMLElement;
                    if (icon) icon.style.color = '#6f7979';
                  }}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none hover:opacity-75 transition-opacity"
                  onClick={togglePasswordVisibility}
                  type="button"
                  style={{ color: '#6f7979' }}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Keep signed in */}
            <div className="flex items-center gap-2">
              <input
                className="w-4 h-4 rounded focus:ring-2"
                style={{
                  borderColor: '#bec9c8',
                  accentColor: '#1a7070'
                }}
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label
                className="cursor-pointer"
                htmlFor="remember"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#3f4948'
                }}
              >
                Keep me signed in
              </label>
            </div>

            {/* Action Button */}
            <button
              className="w-full py-3.5 rounded-lg transition-all transform active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? '#6f7979' : '#1a7070',
                color: '#ffffff',
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '500',
                letterSpacing: '0.02em',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#145a5a';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#1a7070';
              }}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[20px]">login</span>
                </>
              )}
            </button>
          </form>

          {/* Social Login / Divider */}
          {/* <div
            className="mt-8 pt-8"
            style={{ borderTop: '1px solid rgba(190, 201, 200, 0.5)' }}
          >
            <p
              className="text-center mb-6 uppercase tracking-widest"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '12px',
                lineHeight: '14px',
                fontWeight: '500',
                color: '#6f7979'
              }}
            >
              OR CONTINUE WITH
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors"
                style={{
                  border: '1px solid #bec9c8',
                  backgroundColor: '#ffffff',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  lineHeight: '16px',
                  fontWeight: '500',
                  letterSpacing: '0.02em',
                  color: '#0b1c30'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5eeff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  ></path>
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  ></path>
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  ></path>
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  ></path>
                </svg>
                Google
              </button>
              <button
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors"
                style={{
                  border: '1px solid #bec9c8',
                  backgroundColor: '#ffffff',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  lineHeight: '16px',
                  fontWeight: '500',
                  letterSpacing: '0.02em',
                  color: '#0b1c30'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5eeff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.341-3.369-1.341-.454-1.152-1.11-1.459-1.11-1.459-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
                    fill="#000"
                  ></path>
                </svg>
                GitHub
              </button>
            </div>
          </div> */}

          {/* Registration Link */}
          <div className="mt-8 text-center">
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              lineHeight: '20px',
              color: '#3f4948'
            }}>
              Don't have an account?{' '}
              <Link
                className="font-semibold hover:underline transition-all"
                href="/register"
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  lineHeight: '16px',
                  fontWeight: '600',
                  letterSpacing: '0.02em',
                  color: '#1a7070'
                }}
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 flex justify-center gap-6">
          <Link
            className="hover:opacity-75 transition-opacity"
            href="#"
            style={{
              fontFamily: 'Geist, sans-serif',
              fontSize: '12px',
              lineHeight: '14px',
              fontWeight: '500',
              color: '#6f7979'
            }}
          >
            Privacy Policy
          </Link>
          <Link
            className="hover:opacity-75 transition-opacity"
            href="#"
            style={{
              fontFamily: 'Geist, sans-serif',
              fontSize: '12px',
              lineHeight: '14px',
              fontWeight: '500',
              color: '#6f7979'
            }}
          >
            Terms of Service
          </Link>
          <Link
            className="hover:opacity-75 transition-opacity"
            href="#"
            style={{
              fontFamily: 'Geist, sans-serif',
              fontSize: '12px',
              lineHeight: '14px',
              fontWeight: '500',
              color: '#6f7979'
            }}
          >
            Status
          </Link>
        </div>
      </main>
    </div>
  );
}
