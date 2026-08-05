'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Client-side validation
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match!');
      return;
    }

    if (!terms) {
      setValidationError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return;
    }

    try {
      await register({ name: fullName, email, password });
      setShowSuccess(true);

      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err) {
      // Error is handled by the store
      console.error('Registration failed:', err);
    }
  };

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundColor: '#F8FAFC',
          padding: '16px'
        }}
      >
        {/* Atmospheric Background Decoration */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="absolute rounded-full"
            style={{
              top: '-10%',
              left: '-10%',
              width: '40%',
              height: '40%',
              backgroundColor: 'rgba(163, 237, 236, 0.1)',
              filter: 'blur(120px)'
            }}
          ></div>
          <div
            className="absolute rounded-full"
            style={{
              bottom: '-10%',
              right: '-10%',
              width: '40%',
              height: '40%',
              backgroundColor: 'rgba(26, 112, 112, 0.05)',
              filter: 'blur(120px)'
            }}
          ></div>
        </div>

        {/* Main Registration Container */}
        <main className="w-full max-w-[480px] z-10" style={{ animation: 'fadeIn 0.7s ease-out' }}>
          {/* Header Branding (Above Card) */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm"
              style={{ backgroundColor: '#1a7070' }}
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{
                  fontVariationSettings: "'FILL' 1",
                  color: '#ffffff'
                }}
              >
                smart_toy
              </span>
            </div>
            <h2
              className="text-2xl font-semibold tracking-tight"
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                color: '#005657',
                fontWeight: '600',
                lineHeight: '32px'
              }}
            >
              PersonaFlow
            </h2>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                lineHeight: '20px',
                color: '#3f4948'
              }}
            >
              Join the next generation of AI Knowledge Management
            </p>
          </div>

          {/* Centered Card */}
          <div
            className="bg-white rounded-xl p-8"
            style={{
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              border: '1px solid #E2E8F0'
            }}
          >
            <div className="mb-8 text-center md:text-left">
              <h1
                className="mb-2"
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '32px',
                  lineHeight: '40px',
                  fontWeight: '600',
                  letterSpacing: '-0.01em',
                  color: '#0b1c30'
                }}
              >
                Create Account
              </h1>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: '#3f4948'
                }}
              >
                Enter your details to start building your knowledge base.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Error Messages */}
              {(error || validationError) && (
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
                    {error || validationError}
                  </p>
                </div>
              )}

              {/* Name Field */}
              <div className="space-y-2">
                <label
                  htmlFor="full_name"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    lineHeight: '16px',
                    fontWeight: '500',
                    letterSpacing: '0.02em',
                    color: '#0b1c30'
                  }}
                >
                  Full Name
                </label>
                <div className="relative">
                  <span
                    className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] transition-colors"
                    style={{ color: '#6f7979' }}
                  >
                    person
                  </span>
                  <input
                    className="w-full py-3 rounded-lg bg-white outline-none transition-all"
                    style={{
                      paddingLeft: '40px',
                      paddingRight: '16px',
                      border: '1px solid #bec9c8',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '16px',
                      color: '#0b1c30'
                    }}
                    id="full_name"
                    placeholder="Alex Rivera"
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1a7070';
                      e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                      const icon = e.target.previousElementSibling as HTMLElement;
                      if (icon) icon.style.color = '#005657';
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

              {/* Email Field */}
              <div className="space-y-2">
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
                <div className="relative">
                  <span
                    className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] transition-colors"
                    style={{ color: '#6f7979' }}
                  >
                    mail
                  </span>
                  <input
                    className="w-full py-3 rounded-lg bg-white outline-none transition-all"
                    style={{
                      paddingLeft: '40px',
                      paddingRight: '16px',
                      border: '1px solid #bec9c8',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '16px',
                      color: '#0b1c30'
                    }}
                    id="email"
                    placeholder="alex@example.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1a7070';
                      e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                      const icon = e.target.previousElementSibling as HTMLElement;
                      if (icon) icon.style.color = '#005657';
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

              {/* Password Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Password */}
                <div className="space-y-2">
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
                  <div className="relative">
                    <span
                      className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] transition-colors"
                      style={{ color: '#6f7979' }}
                    >
                      lock
                    </span>
                    <input
                      className="w-full py-3 rounded-lg bg-white outline-none transition-all"
                      style={{
                        paddingLeft: '40px',
                        paddingRight: '16px',
                        border: '1px solid #bec9c8',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '16px',
                        color: '#0b1c30'
                      }}
                      id="password"
                      placeholder="••••••••"
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1a7070';
                        e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                        const icon = e.target.previousElementSibling as HTMLElement;
                        if (icon) icon.style.color = '#005657';
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

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="confirm_password"
                    style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '14px',
                      lineHeight: '16px',
                      fontWeight: '500',
                      letterSpacing: '0.02em',
                      color: '#0b1c30'
                    }}
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span
                      className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] transition-colors"
                      style={{ color: '#6f7979' }}
                    >
                      lock_clock
                    </span>
                    <input
                      className="w-full py-3 rounded-lg bg-white outline-none transition-all"
                      style={{
                        paddingLeft: '40px',
                        paddingRight: '16px',
                        border: '1px solid #bec9c8',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '16px',
                        color: '#0b1c30'
                      }}
                      id="confirm_password"
                      placeholder="••••••••"
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1a7070';
                        e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                        const icon = e.target.previousElementSibling as HTMLElement;
                        if (icon) icon.style.color = '#005657';
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
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 py-2">
                <div className="flex items-center h-5">
                  <input
                    className="w-4 h-4 rounded"
                    style={{
                      borderColor: '#bec9c8',
                      accentColor: '#1a7070'
                    }}
                    id="terms"
                    required
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                  />
                </div>
                <label
                  htmlFor="terms"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#3f4948'
                  }}
                >
                  I agree to the{' '}
                  <Link
                    className="font-medium hover:underline"
                    href="#"
                    style={{ color: '#005657' }}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    className="font-medium hover:underline"
                    href="#"
                    style={{ color: '#005657' }}
                  >
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              {/* Register Button */}
              <button
                className="w-full py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-sm"
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
                  if (!isLoading) e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) e.currentTarget.style.opacity = '1';
                }}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Creating account...
                  </>
                ) : (
                  <>
                    Register
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer / Login Link */}
            <div
              className="mt-8 pt-8 text-center"
              style={{ borderTop: '1px solid rgba(190, 201, 200, 0.3)' }}
            >
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: '#3f4948'
                }}
              >
                Already have an account?{' '}
                <Link
                  className="font-bold hover:underline transition-all"
                  href="/login"
                  style={{ color: '#005657' }}
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>

          {/* Secondary Navigation (Social/Other) */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 w-full">
              <div
                className="h-[1px] flex-grow"
                style={{ backgroundColor: 'rgba(190, 201, 200, 0.5)' }}
              ></div>
              <span
                className="uppercase tracking-widest"
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '12px',
                  lineHeight: '14px',
                  fontWeight: '500',
                  color: '#6f7979'
                }}
              >
                Or sign up with
              </span>
              <div
                className="h-[1px] flex-grow"
                style={{ backgroundColor: 'rgba(190, 201, 200, 0.5)' }}
              ></div>
            </div>
            <div className="flex gap-4 w-full">
              <button
                className="flex-1 py-3 px-4 bg-white rounded-lg flex items-center justify-center gap-3 transition-colors group"
                style={{ border: '1px solid #bec9c8' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff4ff'}
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
                <span
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    lineHeight: '16px',
                    fontWeight: '500',
                    letterSpacing: '0.02em',
                    color: '#0b1c30'
                  }}
                >
                  Google
                </span>
              </button>
              <button
                className="flex-1 py-3 px-4 bg-white rounded-lg flex items-center justify-center gap-3 transition-colors group"
                style={{ border: '1px solid #bec9c8' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff4ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ color: '#0b1c30' }}
                >
                  brand_family
                </span>
                <span
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    lineHeight: '16px',
                    fontWeight: '500',
                    letterSpacing: '0.02em',
                    color: '#0b1c30'
                  }}
                >
                  SSO
                </span>
              </button>
            </div>
          </div>

          {/* Back to main site link */}
          <div className="mt-12 text-center">
            <Link
              className="inline-flex items-center gap-2 transition-colors"
              href="/"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '500',
                letterSpacing: '0.02em',
                color: '#6f7979'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#005657'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6f7979'}
            >
              <span className="material-symbols-outlined text-[18px]">keyboard_backspace</span>
              Back to PersonaFlow.com
            </Link>
          </div>
        </main>
      </div>

      {/* Success Feedback Overlay */}
      {showSuccess && (
        <div
          className="fixed inset-0 backdrop-blur-md z-50 flex flex-col items-center justify-center transition-opacity duration-500"
          style={{
            backgroundColor: 'rgba(248, 249, 255, 0.95)',
            animation: 'fadeIn 0.5s ease-out'
          }}
        >
          <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center text-center max-w-sm">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(26, 112, 112, 0.1)' }}
            >
              <span
                className="material-symbols-outlined text-4xl"
                style={{
                  fontVariationSettings: "'FILL' 1",
                  color: '#1a7070'
                }}
              >
                check_circle
              </span>
            </div>
            <h2
              className="mb-2"
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: '24px',
                lineHeight: '32px',
                fontWeight: '600',
                color: '#0b1c30'
              }}
            >
              Account Created!
            </h2>
            <p
              className="mb-8"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                lineHeight: '24px',
                color: '#3f4948'
              }}
            >
              Redirecting you to the setup wizard to personalize your AI flow...
            </p>
            <div
              className="w-12 h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: '#d3e4fe' }}
            >
              <div
                className="h-full"
                style={{
                  width: '40%',
                  backgroundColor: '#1a7070',
                  animation: 'progress 1.5s ease-in-out infinite'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
