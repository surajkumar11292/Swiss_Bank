import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../components/common/ToastContainer.jsx';
import { api } from '../services/api.js';

export default function LoginPage() {
  const { login, verify2fa } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // 2FA state
  const [showMfa, setShowMfa] = useState(false);
  const [mfaFullName, setMfaFullName] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // Registration wizard state
  const [regStep, setRegStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [regData, setRegData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    panNumber: '',
    address: '',
    pin: '',
    pinConfirm: '',
    consent: false,
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  const calculatePasswordStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  };

  const pwStrength = calculatePasswordStrength(regData.password);
  const pwLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorBanner('');
    setLoading(true);

    try {
      const res = await login(loginEmail, loginPassword);
      if (res.mfaRequired) {
        setMfaFullName(res.fullName);
        setShowMfa(true);
        toast('Two-factor authentication required', 'info');
      } else {
        toast(`Welcome back, ${res.user.fullName}!`);
        if (res.user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setErrorBanner(err.message || 'Invalid email or password');
      toast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setErrorBanner('');
    setLoading(true);

    try {
      const user = await verify2fa(mfaCode);
      toast(`Welcome back, ${user.fullName}!`);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setErrorBanner(err.message || 'Invalid 2FA code');
      toast(err.message || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
    toast(`Demo credentials loaded for ${email}`, 'info');
  };

  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!regData.fullName.trim()) errors.fullName = 'Full name is required';
      if (!regData.email.trim()) errors.email = 'Email address is required';
      else if (!/\S+@\S+\.\S+/.test(regData.email)) errors.email = 'Enter a valid email';
      if (!regData.password) errors.password = 'Password is required';
      else if (regData.password.length < 8) errors.password = 'Must be at least 8 characters';
    } else if (step === 2) {
      if (!regData.phone.trim()) errors.phone = 'Phone number is required';
      if (!regData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
      else {
        const dob = new Date(regData.dateOfBirth);
        const minAgeDate = new Date();
        minAgeDate.setFullYear(minAgeDate.getFullYear() - 18);
        if (dob > minAgeDate) errors.dateOfBirth = 'You must be at least 18 years old';
      }
      if (!regData.panNumber.trim()) errors.panNumber = 'Tax / ID number is required';
      if (!regData.address.trim()) errors.address = 'Residential address is required';
    } else if (step === 3) {
      if (!regData.pin) errors.pin = 'Security PIN is required';
      else if (!/^\d{4,6}$/.test(regData.pin)) errors.pin = 'PIN must be 4 to 6 digits';
      if (regData.pin !== regData.pinConfirm) errors.pinConfirm = 'PINs do not match';
      if (!regData.consent) errors.consent = 'You must agree to the Terms of Service';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(regStep)) {
      setRegStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    setRegStep((s) => Math.max(1, s - 1));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorBanner('');
    setLoading(true);

    try {
      // 1. Register User
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: regData.fullName,
          email: regData.email,
          password: regData.password,
          phone: regData.phone,
          dateOfBirth: regData.dateOfBirth,
          panNumber: regData.panNumber,
          address: regData.address,
        }),
      });

      // 2. Automatically Log In
      await login(regData.email, regData.password);

      // 3. Open Initial Primary Account
      await api('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          holderName: regData.fullName,
          openingBalance: '5000.00',
          pin: regData.pin,
        }),
      });

      toast('Account opened successfully with ₹5,000 opening deposit!');
      navigate('/');
    } catch (err) {
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
      setErrorBanner(err.message || 'Registration failed');
      toast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      {/* Left Brand Panel */}
      <aside className="auth-side">
        <div className="auth-side__top">
          <img src="/assets/logo.svg" alt="Swiss Bank Logo" />
          <div>
            <div className="auth-side__brand-name">Swiss Bank</div>
            <div className="auth-side__brand-sub">NETBANKING</div>
          </div>
        </div>

        <div className="auth-side__pitch">
          <h2>Banking that works as hard as you do.</h2>
          <p>
            Accounts, transfers, bill pay, cards, deposits, and loans — all in one secure dashboard.
          </p>

          <div className="auth-side__points">
            <div className="auth-side__point">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a9791e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Session-secured sign-in with PIN-protected transactions</span>
            </div>
            <div className="auth-side__point">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a9791e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Instant transfers with a full double-entry statement</span>
            </div>
            <div className="auth-side__point">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a9791e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Deposit & loan calculators, bill pay, and more</span>
            </div>
          </div>

          <div className="auth-side__trust">
            <span className="trust-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              256-bit encryption
            </span>
            <span className="trust-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              RBI-style KYC checks
            </span>
            <span className="trust-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              PCI-DSS aligned
            </span>
          </div>
        </div>

        <div className="auth-side__foot">
          © {new Date().getFullYear()} Swiss Bank — demo product, not a real bank.
        </div>
      </aside>

      {/* Right Form Container */}
      <main className="auth-wrap-inner">
        {/* Floating Theme Toggler */}
        <div style={{ position: 'absolute', top: 24, right: 28, zIndex: 10 }}>
          <div className="theme-toggle" role="group" aria-label="Theme">
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
              title="Light theme"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </button>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
              title="Dark theme"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>
            <button
              type="button"
              aria-pressed={theme === 'system'}
              onClick={() => setTheme('system')}
              title="System preference"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </button>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-hero__brand">
            <img src="/assets/logo.svg" alt="" />
            <span>Swiss Bank</span>
          </div>

          {showMfa ? (
            /* 2FA Login Challenge */
            <div className="auth-body">
              <div className="auth-hero">
                <h1>Two-Factor Verification</h1>
                <p>Hello {mfaFullName}, enter the 6-digit code from your authenticator app.</p>
              </div>

              {errorBanner && (
                <div className="form-banner">
                  <div className="form-banner__ic">!</div>
                  <div>{errorBanner}</div>
                </div>
              )}

              <form onSubmit={handleMfaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label htmlFor="mfaCode">Authenticator Code <span className="req">*</span></label>
                  <input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    className="mono"
                    style={{ fontSize: 22, textAlign: 'center', letterSpacing: '0.3em' }}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>

                <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading || mfaCode.length !== 6}>
                  <span className="btn__label">Verify & Sign In</span>
                  <span className="btn__spinner" />
                </button>

                <button
                  type="button"
                  className="btn btn--ghost btn--block btn--sm"
                  onClick={() => {
                    setShowMfa(false);
                    setErrorBanner('');
                  }}
                >
                  ← Back to Login
                </button>
              </form>
            </div>
          ) : (
            /* Main Auth Container */
            <div>
              <div className="auth-hero">
                <h1>{mode === 'login' ? 'Welcome back' : 'Create an Account'}</h1>
                <p>{mode === 'login' ? 'Sign in to manage your accounts.' : 'Complete 4 simple steps to open your verified bank account.'}</p>
              </div>

              <div className="auth-tabs" role="tablist">
                <button
                  className="auth-tab"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login');
                    setErrorBanner('');
                  }}
                >
                  Sign in
                </button>
                <button
                  className="auth-tab"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => {
                    setMode('register');
                    setErrorBanner('');
                  }}
                >
                  Create account
                </button>
              </div>

              {errorBanner && (
                <div className="form-banner">
                  <div className="form-banner__ic">!</div>
                  <div>{errorBanner}</div>
                </div>
              )}

              {mode === 'login' ? (
                /* Login Form */
                <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="field">
                    <label htmlFor="loginEmail">Email <span className="req">*</span></label>
                    <input
                      id="loginEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="loginPassword">Password <span className="req">*</span></label>
                    <div className="field--password">
                      <input
                        id="loginPassword"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="field__eye"
                        aria-pressed={showLoginPassword}
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        title="Toggle password visibility"
                      >
                        {showLoginPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                    <span className="btn__label">Sign in</span>
                    <span className="btn__spinner" />
                  </button>

                  <div className="auth-demo">
                    Demo login — <b onClick={() => fillDemo('demo@bank.app', 'demo12345')}>demo@bank.app</b> · password <b onClick={() => fillDemo('demo@bank.app', 'demo12345')}>demo12345</b>
                    <span className="demo-sub" style={{ display: 'block', color: 'var(--text-faint)', fontSize: 11, marginTop: 2 }}>
                      (a beneficiary, a bill payment, and a support ticket are pre-loaded)
                    </span>
                    <div style={{ marginTop: 4 }}>
                      Admin login — <b onClick={() => fillDemo('admin@bank.app', 'admin12345')}>admin@bank.app</b> · password <b onClick={() => fillDemo('admin@bank.app', 'admin12345')}>admin12345</b>
                    </div>
                  </div>
                </form>
              ) : (
                /* Registration Wizard */
                <div>
                  <div className="auth-stepper">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`auth-stepper__step ${regStep === step ? 'is-active' : regStep > step ? 'is-done' : ''}`}
                      >
                        <div className="auth-stepper__dot">{regStep > step ? '✓' : step}</div>
                        {step < 4 && <div className="auth-stepper__line" />}
                      </div>
                    ))}
                  </div>

                  <div className="auth-stepper__labels">
                    <span className={`auth-stepper__label ${regStep === 1 ? 'is-active' : ''}`}>Account</span>
                    <span className={`auth-stepper__label ${regStep === 2 ? 'is-active' : ''}`}>KYC</span>
                    <span className={`auth-stepper__label ${regStep === 3 ? 'is-active' : ''}`}>Security</span>
                    <span className={`auth-stepper__label ${regStep === 4 ? 'is-active' : ''}`}>Review</span>
                  </div>

                  <form onSubmit={regStep === 4 ? handleRegisterSubmit : (e) => { e.preventDefault(); nextStep(); }}>
                    {/* Step 1: Account Details */}
                    {regStep === 1 && (
                      <div className="auth-step is-active">
                        <div className="field">
                          <label>Full Legal Name <span className="req">*</span></label>
                          <input
                            type="text"
                            placeholder="e.g. Marcus Weber"
                            value={regData.fullName}
                            onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                            className={fieldErrors.fullName ? 'invalid' : ''}
                            required
                          />
                          {fieldErrors.fullName && <div className="field__error">{fieldErrors.fullName}</div>}
                        </div>

                        <div className="field">
                          <label>Email Address <span className="req">*</span></label>
                          <input
                            type="email"
                            placeholder="marcus@example.com"
                            value={regData.email}
                            onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                            className={fieldErrors.email ? 'invalid' : ''}
                            required
                          />
                          {fieldErrors.email && <div className="field__error">{fieldErrors.email}</div>}
                        </div>

                        <div className="field">
                          <label>Create Password <span className="req">*</span></label>
                          <div className="field--password">
                            <input
                              type={showRegPassword ? 'text' : 'password'}
                              placeholder="Minimum 8 characters"
                              value={regData.password}
                              onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                              className={fieldErrors.password ? 'invalid' : ''}
                              required
                            />
                            <button
                              type="button"
                              className="field__eye"
                              aria-pressed={showRegPassword}
                              onClick={() => setShowRegPassword(!showRegPassword)}
                            >
                              {showRegPassword ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                  <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              )}
                            </button>
                          </div>
                          {regData.password && (
                            <div className="pw-strength" data-level={pwStrength}>
                              <div className="pw-strength__bars">
                                <span />
                                <span />
                                <span />
                                <span />
                              </div>
                              <div className="pw-strength__label">Strength: {pwLabels[pwStrength - 1] || 'Too Weak'}</div>
                            </div>
                          )}
                          {fieldErrors.password && <div className="field__error">{fieldErrors.password}</div>}
                        </div>

                        <button type="button" className="btn btn--primary btn--block" onClick={nextStep}>
                          Continue to KYC Details →
                        </button>
                      </div>
                    )}

                    {/* Step 2: KYC Information */}
                    {regStep === 2 && (
                      <div className="auth-step is-active">
                        <div className="field">
                          <label>Phone Number <span className="req">*</span></label>
                          <input
                            type="tel"
                            placeholder="9876543210"
                            value={regData.phone}
                            onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                            className={fieldErrors.phone ? 'invalid' : ''}
                            required
                          />
                          {fieldErrors.phone && <div className="field__error">{fieldErrors.phone}</div>}
                        </div>

                        <div className="field">
                          <label>Date of Birth (Must be 18+) <span className="req">*</span></label>
                          <input
                            type="date"
                            value={regData.dateOfBirth}
                            onChange={(e) => setRegData({ ...regData, dateOfBirth: e.target.value })}
                            className={fieldErrors.dateOfBirth ? 'invalid' : ''}
                            required
                          />
                          {fieldErrors.dateOfBirth && <div className="field__error">{fieldErrors.dateOfBirth}</div>}
                        </div>

                        <div className="field">
                          <label>Tax Identification / PAN / National ID <span className="req">*</span></label>
                          <input
                            type="text"
                            placeholder="ABCDE1234F"
                            className="mono"
                            style={{ textTransform: 'uppercase' }}
                            value={regData.panNumber}
                            onChange={(e) => setRegData({ ...regData, panNumber: e.target.value.toUpperCase() })}
                            required
                          />
                          {fieldErrors.panNumber && <div className="field__error">{fieldErrors.panNumber}</div>}
                        </div>

                        <div className="field">
                          <label>Residential Address <span className="req">*</span></label>
                          <textarea
                            placeholder="Street, City, Postal Code, Country"
                            value={regData.address}
                            onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                            required
                          />
                          {fieldErrors.address && <div className="field__error">{fieldErrors.address}</div>}
                        </div>

                        <div className="auth-step__nav">
                          <button type="button" className="btn btn--ghost" onClick={prevStep}>
                            ← Back
                          </button>
                          <button type="button" className="btn btn--primary" onClick={nextStep}>
                            Continue to PIN →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Security PIN & Terms */}
                    {regStep === 3 && (
                      <div className="auth-step is-active">
                        <div className="field">
                          <label>Transaction Security PIN (4–6 Digits) <span className="req">*</span></label>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="••••"
                            className="mono"
                            style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.2em' }}
                            value={regData.pin}
                            onChange={(e) => setRegData({ ...regData, pin: e.target.value.replace(/\D/g, '') })}
                            required
                          />
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                            Used to authorize transfers, deposits, and withdrawals.
                          </span>
                          {fieldErrors.pin && <div className="field__error">{fieldErrors.pin}</div>}
                        </div>

                        <div className="field">
                          <label>Confirm Security PIN <span className="req">*</span></label>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="••••"
                            className="mono"
                            style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.2em' }}
                            value={regData.pinConfirm}
                            onChange={(e) => setRegData({ ...regData, pinConfirm: e.target.value.replace(/\D/g, '') })}
                            required
                          />
                          {fieldErrors.pinConfirm && <div className="field__error">{fieldErrors.pinConfirm}</div>}
                        </div>

                        <div className="consent-row">
                          <input
                            id="consentCheck"
                            type="checkbox"
                            checked={regData.consent}
                            onChange={(e) => setRegData({ ...regData, consent: e.target.checked })}
                          />
                          <label htmlFor="consentCheck">
                            I accept the Swiss Bank Account Terms, Privacy Policy, and Sovereign Deposit Protections.
                          </label>
                        </div>
                        {fieldErrors.consent && <div className="field__error">{fieldErrors.consent}</div>}

                        <div className="auth-step__nav">
                          <button type="button" className="btn btn--ghost" onClick={prevStep}>
                            ← Back
                          </button>
                          <button type="button" className="btn btn--primary" onClick={nextStep}>
                            Review Application →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Summary & Submit */}
                    {regStep === 4 && (
                      <div className="auth-step is-active">
                        <div className="review-list">
                          <div className="review-list__row">
                            <span>Account Holder</span>
                            <span>{regData.fullName}</span>
                          </div>
                          <div className="review-list__row">
                            <span>Email</span>
                            <span>{regData.email}</span>
                          </div>
                          <div className="review-list__row">
                            <span>Phone</span>
                            <span>{regData.phone}</span>
                          </div>
                          <div className="review-list__row">
                            <span>Tax ID / PAN</span>
                            <span>{regData.panNumber}</span>
                          </div>
                          <div className="review-list__row">
                            <span>Address</span>
                            <span>{regData.address}</span>
                          </div>
                          <div className="review-list__row">
                            <span>Initial Deposit</span>
                            <span style={{ color: 'var(--credit)' }}>₹5,000.00 (Standard Tier)</span>
                          </div>
                        </div>

                        <div className="auth-step__nav" style={{ marginTop: 12 }}>
                          <button type="button" className="btn btn--ghost" onClick={prevStep} disabled={loading}>
                            ← Edit
                          </button>
                          <button type="submit" className={`btn btn--primary ${loading ? 'is-loading' : ''}`} disabled={loading}>
                            <span className="btn__label">Open Bank Account</span>
                            <span className="btn__spinner" />
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
