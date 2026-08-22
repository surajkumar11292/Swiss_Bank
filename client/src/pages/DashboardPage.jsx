import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../components/common/ToastContainer.jsx';
import { api, money, fmtAcct, fmtDate } from '../services/api.js';

export default function DashboardPage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [ledgerMeta, setLedgerMeta] = useState({ totalPages: 1, totalElements: 0, first: true, last: true });

  // Beneficiaries, Billpay, Cards, Tickets state
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [cards, setCards] = useState([]);
  const [billHistory, setBillHistory] = useState([]);
  const [billPage, setBillPage] = useState(0);
  const [billMeta, setBillMeta] = useState({ totalPages: 1, totalElements: 0 });
  const [tickets, setTickets] = useState([]);

  // Modals & Action Forms
  const [modalOpen, setModalOpen] = useState(null); // 'openAccount' | 'totpSetup' | 'addBeneficiary' | 'transfer2fa'
  const [loading, setLoading] = useState(false);

  // Form states
  const [newAccountForm, setNewAccountForm] = useState({ holderName: '', openingBalance: '1000', pin: '' });
  const [depositForm, setDepositForm] = useState({ accountNumber: '', amount: '', pin: '' });
  const [withdrawForm, setWithdrawForm] = useState({ accountNumber: '', amount: '', pin: '' });
  const [transferForm, setTransferForm] = useState({ fromAccountNumber: '', toAccountNumber: '', amount: '', pin: '', totpCode: '' });
  const [billForm, setBillForm] = useState({ accountNumber: '', category: 'Electricity', consumer: '', amount: '', pin: '' });
  const [benefForm, setBenefForm] = useState({ name: '', accountNumber: '', nickname: '' });
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // 2FA TOTP setup state
  const [totpData, setTotpData] = useState({ secret: '', otpauthUri: '', verifyCode: '', disablePassword: '', disableCode: '' });

  // EMI Calculator state
  const [emiAmount, setEmiAmount] = useState(100000);
  const [emiMonths, setEmiMonths] = useState(12);

  // Load Accounts & Initial Data
  const loadAccounts = async () => {
    try {
      const data = await api('/api/accounts');
      setAccounts(data);
      if (data.length > 0) {
        if (!activeAccount || !data.some((a) => a.accountNumber === activeAccount.accountNumber)) {
          setActiveAccount(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts', err);
    }
  };

  const loadLedger = async (acctNumber, page = 0) => {
    if (!acctNumber) return;
    try {
      const data = await api(`/api/accounts/${acctNumber}/history?page=${page}&size=8`);
      setLedgerEntries(data.content || []);
      setLedgerPage(data.page || 0);
      setLedgerMeta({
        totalPages: data.totalPages || 1,
        totalElements: data.totalElements || 0,
        first: data.first,
        last: data.last,
      });
    } catch (err) {
      console.error('Failed to load ledger', err);
    }
  };

  const loadBeneficiaries = async () => {
    try {
      const data = await api('/api/beneficiaries');
      setBeneficiaries(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCards = async () => {
    try {
      const data = await api('/api/cards');
      setCards(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBillHistory = async (page = 0) => {
    try {
      const data = await api(`/api/billpay/history?page=${page}&size=8`);
      setBillHistory(data.content || []);
      setBillPage(data.page || 0);
      setBillMeta({ totalPages: data.totalPages || 1, totalElements: data.totalElements || 0 });
    } catch (err) {
      console.error(err);
    }
  };

  const loadTickets = async () => {
    try {
      const data = await api('/api/support/tickets');
      setTickets(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadBeneficiaries();
    loadCards();
  }, []);

  useEffect(() => {
    if (activeAccount) {
      loadLedger(activeAccount.accountNumber, 0);
      setDepositForm((f) => ({ ...f, accountNumber: activeAccount.accountNumber }));
      setWithdrawForm((f) => ({ ...f, accountNumber: activeAccount.accountNumber }));
      setTransferForm((f) => ({ ...f, fromAccountNumber: activeAccount.accountNumber }));
      setBillForm((f) => ({ ...f, accountNumber: activeAccount.accountNumber }));
    }
  }, [activeAccount]);

  useEffect(() => {
    if (activeView === 'beneficiaries') loadBeneficiaries();
    if (activeView === 'cards') loadCards();
    if (activeView === 'billpay') loadBillHistory(0);
    if (activeView === 'support') loadTickets();
  }, [activeView]);

  const totalBalance = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // Handlers
  const handleOpenAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await api('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(newAccountForm),
      });
      toast(`Account #${created.accountNumber} opened successfully!`);
      setModalOpen(null);
      setNewAccountForm({ holderName: '', openingBalance: '1000', pin: '' });
      await loadAccounts();
      setActiveAccount(created);
    } catch (err) {
      toast(err.message || 'Failed to open account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api('/api/accounts/credit', {
        method: 'POST',
        body: JSON.stringify(depositForm),
      });
      toast(`Deposited ₹${money(depositForm.amount)} successfully!`);
      setDepositForm({ ...depositForm, amount: '', pin: '' });
      await loadAccounts();
      setActiveAccount(updated);
      loadLedger(updated.accountNumber, 0);
    } catch (err) {
      toast(err.message || 'Deposit failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api('/api/accounts/debit', {
        method: 'POST',
        body: JSON.stringify(withdrawForm),
      });
      toast(`Withdrawn ₹${money(withdrawForm.amount)} successfully!`);
      setWithdrawForm({ ...withdrawForm, amount: '', pin: '' });
      await loadAccounts();
      setActiveAccount(updated);
      loadLedger(updated.accountNumber, 0);
    } catch (err) {
      toast(err.message || 'Withdrawal failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api('/api/accounts/transfer', {
        method: 'POST',
        body: JSON.stringify(transferForm),
      });
      toast(`Transferred ₹${money(transferForm.amount)} successfully!`);
      setTransferForm({ ...transferForm, toAccountNumber: '', amount: '', pin: '', totpCode: '' });
      setModalOpen(null);
      await loadAccounts();
      setActiveAccount(updated);
      loadLedger(updated.accountNumber, 0);
    } catch (err) {
      if (err.code === 'TOTP_REQUIRED' || err.status === 428) {
        setModalOpen('transfer2fa');
        toast('High-value transfer requires 2FA confirmation', 'info');
      } else {
        toast(err.message || 'Transfer failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = async (accountNumber) => {
    try {
      const blob = await api(`/api/accounts/${accountNumber}/statement.csv`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statement-${accountNumber}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Statement CSV downloaded');
    } catch (err) {
      toast('Failed to download CSV statement', 'error');
    }
  };

  const handleCardToggle = async (accountNumber, patch) => {
    try {
      const updated = await api(`/api/cards/${accountNumber}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setCards((prev) => prev.map((c) => (c.accountNumber === accountNumber ? updated : c)));
      toast('Card settings updated');
    } catch (err) {
      toast(err.message || 'Failed to update card', 'error');
    }
  };

  const handleCardReplacement = async (accountNumber) => {
    try {
      const updated = await api(`/api/cards/${accountNumber}/request-replacement`, {
        method: 'POST',
      });
      setCards((prev) => prev.map((c) => (c.accountNumber === accountNumber ? updated : c)));
      toast('Replacement card requested. It will arrive in 3-5 business days.');
    } catch (err) {
      toast(err.message || 'Failed to request card replacement', 'error');
    }
  };

  const handleBillPay = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/billpay', {
        method: 'POST',
        body: JSON.stringify(billForm),
      });
      toast(`Paid ${billForm.category} bill of ₹${money(billForm.amount)} successfully!`);
      setBillForm({ ...billForm, consumer: '', amount: '', pin: '' });
      await loadAccounts();
      loadBillHistory(0);
      if (activeAccount) loadLedger(activeAccount.accountNumber, 0);
    } catch (err) {
      toast(err.message || 'Bill payment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/beneficiaries', {
        method: 'POST',
        body: JSON.stringify(benefForm),
      });
      toast(`Beneficiary ${benefForm.name} saved!`);
      setBenefForm({ name: '', accountNumber: '', nickname: '' });
      setModalOpen(null);
      loadBeneficiaries();
    } catch (err) {
      toast(err.message || 'Failed to save beneficiary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBeneficiary = async (id) => {
    try {
      await api(`/api/beneficiaries/${id}`, { method: 'DELETE' });
      toast('Beneficiary removed');
      loadBeneficiaries();
    } catch (err) {
      toast('Failed to remove beneficiary', 'error');
    }
  };

  const handleRaiseTicket = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketForm),
      });
      toast('Support ticket submitted! Our team will respond shortly.');
      setTicketForm({ subject: '', message: '' });
      loadTickets();
    } catch (err) {
      toast(err.message || 'Failed to submit ticket', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      toast('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast(err.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTotpSetup = async () => {
    try {
      const data = await api('/api/2fa/setup', { method: 'POST' });
      setTotpData((d) => ({ ...d, secret: data.secret, otpauthUri: data.otpauthUri }));
      setModalOpen('totpSetup');
    } catch (err) {
      toast(err.message || 'Could not initiate 2FA setup', 'error');
    }
  };

  const handleEnableTotp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: totpData.verifyCode }),
      });
      toast('2-Factor Authentication enabled successfully!');
      setModalOpen(null);
      setTotpData((d) => ({ ...d, verifyCode: '' }));
      await refreshUser();
    } catch (err) {
      toast(err.message || 'Incorrect verification code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTotp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({
          password: totpData.disablePassword,
          code: totpData.disableCode,
        }),
      });
      toast('2-Factor Authentication disabled');
      setTotpData((d) => ({ ...d, disablePassword: '', disableCode: '' }));
      await refreshUser();
    } catch (err) {
      toast(err.message || 'Failed to disable 2FA', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Monthly Loan calculation
  const calculateEmi = (p, n) => {
    const r = 8.5 / 12 / 100;
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(emi);
  };

  const emiVal = calculateEmi(emiAmount, emiMonths);

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} id="sidebar">
        <div className="sidebar__brand">
          <img src="/assets/logo.svg" alt="" />
          <div>
            <div className="sidebar__brand-name">Swiss Bank</div>
            <div className="sidebar__brand-sub">Private Banking</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav__group-label">Banking</div>
          <button
            className={`nav__item ${activeView === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('dashboard'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            className={`nav__item ${activeView === 'accounts' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('accounts'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
            <span>Accounts & Statements</span>
          </button>

          <button
            className={`nav__item ${activeView === 'transfers' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('transfers'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="17" y1="17" x2="7" y2="7"></line>
              <polyline points="7 17 7 7 17 7"></polyline>
            </svg>
            <span>Transfers & Pay</span>
          </button>

          <button
            className={`nav__item ${activeView === 'deposits' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('deposits'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span>Deposits & Loans</span>
          </button>

          <button
            className={`nav__item ${activeView === 'cards' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('cards'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            <span>Debit Cards</span>
          </button>

          <button
            className={`nav__item ${activeView === 'billpay' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('billpay'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>Bill Pay & Utilities</span>
          </button>

          <div className="nav__group-label">Manage</div>
          <button
            className={`nav__item ${activeView === 'beneficiaries' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('beneficiaries'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Beneficiaries</span>
          </button>

          <button
            className={`nav__item ${activeView === 'profile' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('profile'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Profile & Security</span>
          </button>

          <button
            className={`nav__item ${activeView === 'support' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('support'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Client Support</span>
          </button>

          {user?.role === 'ADMIN' && (
            <button
              className="nav__item"
              style={{ color: 'var(--gold)', marginTop: 'auto' }}
              onClick={() => navigate('/admin')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Admin Console</span>
            </button>
          )}
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__helpline">
            24/7 Sovereign Banking Hotline:
            <b>+41 44 218 11 11</b>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="main-col">
        {/* Top Appbar */}
        <header className="appbar">
          <button
            className="icon-toggle"
            style={{ display: 'none' }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <div className="appbar__title">
            {activeView === 'dashboard' && 'Dashboard Overview'}
            {activeView === 'accounts' && 'Accounts & Statements'}
            {activeView === 'transfers' && 'Transfers & Remittance'}
            {activeView === 'deposits' && 'Deposits & Credit Facilities'}
            {activeView === 'cards' && 'Debit Card Management'}
            {activeView === 'billpay' && 'Bill Pay & Utilities'}
            {activeView === 'beneficiaries' && 'Saved Beneficiaries'}
            {activeView === 'profile' && 'Client Profile & KYC'}
            {activeView === 'support' && 'Support & Concierge'}
          </div>

          <div className="appbar__right">
            {/* Active Account Switcher */}
            {accounts.length > 0 && activeAccount && (
              <div className="user-chip">
                <span>Active:</span>
                <b>#{fmtAcct(activeAccount.accountNumber)}</b>
                <span style={{ color: 'var(--credit)', fontWeight: 700 }}>₹{money(activeAccount.balance)}</span>
              </div>
            )}

            {/* Theme Toggle */}
            <div className="theme-toggle" role="group" aria-label="Theme">
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
                title="Light"
              >
                ☀️
              </button>
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
                title="Dark"
              >
                🌙
              </button>
              <button
                type="button"
                aria-pressed={theme === 'system'}
                onClick={() => setTheme('system')}
                title="System"
              >
                💻
              </button>
            </div>

            {/* User Chip & Logout */}
            <div className="user-chip">
              <span>{user?.fullName}</span>
              <button
                className="btn btn--ghost btn--sm"
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="wrap">
          {/* 1. DASHBOARD VIEW */}
          {activeView === 'dashboard' && (
            <div className="view-panel">
              {/* Stat Grid */}
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-card__label">Total Sovereign Balance</div>
                  <div className="stat-card__value"><span className="cur">₹</span>{money(totalBalance)}</div>
                  <div className="stat-card__meta">{accounts.length} active account{accounts.length === 1 ? '' : 's'}</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__label">Primary Account</div>
                  <div className="stat-card__value"><span className="cur">₹</span>{activeAccount ? money(activeAccount.balance) : '0.00'}</div>
                  <div className="stat-card__meta">#{activeAccount ? fmtAcct(activeAccount.accountNumber) : 'None'}</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__label">Saved Payees</div>
                  <div className="stat-card__value">{beneficiaries.length}</div>
                  <div className="stat-card__meta">Verified beneficiaries</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__label">Security Status</div>
                  <div className="stat-card__value" style={{ fontSize: 18, marginTop: 14 }}>
                    <span className="kyc-badge">
                      {user?.totpEnabled ? '🛡️ 2FA Verified' : 'Standard KYC'}
                    </span>
                  </div>
                  <div className="stat-card__meta">Protected with BCrypt</div>
                </div>
              </div>

              {/* Promo Banner */}
              <div className="promo-banner">
                <div>
                  <div className="promo-banner__title">Swiss Sovereign High-Yield Liquidity</div>
                  <div className="promo-banner__sub">
                    Institutional security with double-entry cryptographic reconciliation. Earn competitive interest with daily accrual.
                  </div>
                </div>
                <button className="btn btn--primary" onClick={() => setModalOpen('openAccount')}>
                  + Open Additional Account
                </button>
              </div>

              {/* Quick Actions Grid */}
              <div className="quick-grid">
                <div className="quick-tile" onClick={() => setActiveView('transfers')}>
                  <div className="quick-tile__ic">↗️</div>
                  <div className="quick-tile__label">Transfer</div>
                </div>
                <div className="quick-tile" onClick={() => setActiveView('deposits')}>
                  <div className="quick-tile__ic">💵</div>
                  <div className="quick-tile__label">Deposit</div>
                </div>
                <div className="quick-tile" onClick={() => setActiveView('deposits')}>
                  <div className="quick-tile__ic">🏧</div>
                  <div className="quick-tile__label">Withdraw</div>
                </div>
                <div className="quick-tile" onClick={() => setActiveView('billpay')}>
                  <div className="quick-tile__ic">⚡</div>
                  <div className="quick-tile__label">Bill Pay</div>
                </div>
                <div className="quick-tile" onClick={() => setActiveView('cards')}>
                  <div className="quick-tile__ic">💳</div>
                  <div className="quick-tile__label">Cards</div>
                </div>
                <div className="quick-tile" onClick={() => setActiveView('support')}>
                  <div className="quick-tile__ic">💬</div>
                  <div className="quick-tile__label">Support</div>
                </div>
              </div>

              {/* Accounts Rail */}
              <div className="row-between">
                <div>
                  <h3 className="section-title">Your Accounts</h3>
                  <div className="section-sub">Select an account to view transaction ledger</div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => setModalOpen('openAccount')}>
                  + Open Account
                </button>
              </div>

              <div className="cards-rail">
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    className={`bank-card ${a.accountNumber === activeAccount?.accountNumber ? 'is-active' : ''}`}
                    onClick={() => setActiveAccount(a)}
                  >
                    <div className="bank-card__top">
                      <span className="bank-card__label">
                        <img src="/assets/logo.svg" alt="" /> Swiss Bank
                      </span>
                      {a.frozen ? (
                        <span className="status-pill status-pill--frozen">Frozen</span>
                      ) : (
                        <span className="bank-card__chip" />
                      )}
                    </div>
                    <div className="bank-card__balance">
                      <span className="cur">₹</span>{money(a.balance)}
                    </div>
                    <div>
                      <div className="bank-card__holder">{a.holderName}</div>
                      <div className="bank-card__number">#{fmtAcct(a.accountNumber)}</div>
                    </div>
                  </div>
                ))}

                <div className="bank-card bank-card--new" onClick={() => setModalOpen('openAccount')}>
                  <span>+ Open New Account</span>
                </div>
              </div>

              {/* Ledger Statement for Active Account */}
              {activeAccount && (
                <div className="statement" style={{ marginTop: 26 }}>
                  <div className="statement__head">
                    <div>
                      <div className="statement__title">Recent Ledger Entries</div>
                      <div className="statement__acct">Account #{fmtAcct(activeAccount.accountNumber)} · Running Balance</div>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleDownloadCsv(activeAccount.accountNumber)}
                    >
                      📥 Export CSV
                    </button>
                  </div>

                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Transaction</th>
                          <th>Reference</th>
                          <th>Date</th>
                          <th className="num">Amount</th>
                          <th className="num">Balance After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="empty-hint">No transactions recorded on this account yet.</td>
                          </tr>
                        ) : (
                          ledgerEntries.map((e) => (
                            <tr key={e.id} className={e.type === 'CREDIT' ? 'txn-credit' : 'txn-debit'}>
                              <td>
                                <div className="txn-desc">
                                  <span className="txn-icon">{e.type === 'CREDIT' ? '↓' : '↑'}</span>
                                  <div className="txn-desc__meta">
                                    <strong>{e.description}</strong>
                                    <span className="txn-desc__ref">{e.type}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="mono" style={{ fontSize: 12 }}>{e.reference}</td>
                              <td className="txn-date">{fmtDate(e.createdAt)}</td>
                              <td className={`num amt ${e.type === 'CREDIT' ? 'amt--credit' : 'amt--debit'}`}>
                                {e.type === 'CREDIT' ? '+' : '-'}₹{money(e.amount)}
                              </td>
                              <td className="num amt amt--balance">₹{money(e.balanceAfter)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {ledgerMeta.totalPages > 1 && (
                    <div className="pagination">
                      <div className="pagination__info">
                        Showing page {ledgerPage + 1} of {ledgerMeta.totalPages} ({ledgerMeta.totalElements} entries)
                      </div>
                      <div className="pagination__controls">
                        <button
                          className="icon-btn"
                          disabled={ledgerMeta.first}
                          onClick={() => loadLedger(activeAccount.accountNumber, ledgerPage - 1)}
                        >
                          ← Prev
                        </button>
                        <span className="pagination__page">{ledgerPage + 1}</span>
                        <button
                          className="icon-btn"
                          disabled={ledgerMeta.last}
                          onClick={() => loadLedger(activeAccount.accountNumber, ledgerPage + 1)}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. ACCOUNTS & STATEMENTS VIEW */}
          {activeView === 'accounts' && (
            <div className="view-panel">
              <div className="row-between">
                <div>
                  <h2 className="section-title">All Sovereign Accounts</h2>
                  <div className="section-sub">Manage balances, statement records, and download official exports</div>
                </div>
                <button className="btn btn--primary" onClick={() => setModalOpen('openAccount')}>
                  + Open New Account
                </button>
              </div>

              <div className="cards-rail" style={{ marginBottom: 28 }}>
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    className={`bank-card ${a.accountNumber === activeAccount?.accountNumber ? 'is-active' : ''}`}
                    onClick={() => setActiveAccount(a)}
                  >
                    <div className="bank-card__top">
                      <span className="bank-card__label"><img src="/assets/logo.svg" alt="" /> Swiss Bank</span>
                      {a.frozen ? <span className="status-pill status-pill--frozen">Frozen</span> : <span className="bank-card__chip" />}
                    </div>
                    <div className="bank-card__balance"><span className="cur">₹</span>{money(a.balance)}</div>
                    <div>
                      <div className="bank-card__holder">{a.holderName}</div>
                      <div className="bank-card__number">#{fmtAcct(a.accountNumber)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {activeAccount && (
                <div className="statement">
                  <div className="statement__head">
                    <div>
                      <div className="statement__title">Double-Entry Statement Ledger</div>
                      <div className="statement__acct">Account #{fmtAcct(activeAccount.accountNumber)} · Balance: ₹{money(activeAccount.balance)}</div>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => handleDownloadCsv(activeAccount.accountNumber)}>
                      📥 Export Full CSV
                    </button>
                  </div>

                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Transaction</th>
                          <th>Reference</th>
                          <th>Date</th>
                          <th className="num">Amount</th>
                          <th className="num">Balance After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map((e) => (
                          <tr key={e.id} className={e.type === 'CREDIT' ? 'txn-credit' : 'txn-debit'}>
                            <td>
                              <div className="txn-desc">
                                <span className="txn-icon">{e.type === 'CREDIT' ? '↓' : '↑'}</span>
                                <div className="txn-desc__meta">
                                  <strong>{e.description}</strong>
                                  <span className="txn-desc__ref">{e.type}</span>
                                </div>
                              </div>
                            </td>
                            <td className="mono" style={{ fontSize: 12 }}>{e.reference}</td>
                            <td className="txn-date">{fmtDate(e.createdAt)}</td>
                            <td className={`num amt ${e.type === 'CREDIT' ? 'amt--credit' : 'amt--debit'}`}>
                              {e.type === 'CREDIT' ? '+' : '-'}₹{money(e.amount)}
                            </td>
                            <td className="num amt amt--balance">₹{money(e.balanceAfter)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. TRANSFERS VIEW */}
          {activeView === 'transfers' && (
            <div className="view-panel">
              <div className="grid-2">
                <div className="panel">
                  <h3 className="panel__title">Transfer Funds</h3>
                  <div className="panel__sub">Instant atomic transfer between Swiss Bank accounts</div>

                  <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                      <label>From Account <span className="req">*</span></label>
                      <select
                        value={transferForm.fromAccountNumber}
                        onChange={(e) => setTransferForm({ ...transferForm, fromAccountNumber: e.target.value })}
                        required
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.accountNumber}>
                            #{fmtAcct(a.accountNumber)} — {a.holderName} (₹{money(a.balance)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>To Account Number <span className="req">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. 10293847"
                        className="mono"
                        value={transferForm.toAccountNumber}
                        onChange={(e) => setTransferForm({ ...transferForm, toAccountNumber: e.target.value.replace(/\D/g, '') })}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Amount (₹) <span className="req">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="5000.00"
                        className="mono"
                        value={transferForm.amount}
                        onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Security PIN <span className="req">*</span></label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="••••"
                        className="mono"
                        value={transferForm.pin}
                        onChange={(e) => setTransferForm({ ...transferForm, pin: e.target.value.replace(/\D/g, '') })}
                        required
                      />
                    </div>

                    {user?.totpEnabled && Number(transferForm.amount) >= 50000 && (
                      <div className="field">
                        <label>2FA Authenticator Code <span className="req">* (High-Value Transfer)</span></label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          className="mono"
                          value={transferForm.totpCode}
                          onChange={(e) => setTransferForm({ ...transferForm, totpCode: e.target.value.replace(/\D/g, '') })}
                          required
                        />
                      </div>
                    )}

                    <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                      <span className="btn__label">Authorize Transfer</span>
                      <span className="btn__spinner" />
                    </button>
                  </form>
                </div>

                {/* Beneficiaries Quick Pick */}
                <div className="panel">
                  <div className="row-between" style={{ marginBottom: 10 }}>
                    <h3 className="panel__title">Saved Beneficiaries</h3>
                    <button className="btn btn--soft btn--sm" onClick={() => setModalOpen('addBeneficiary')}>
                      + Add
                    </button>
                  </div>
                  <div className="panel__sub">Click a payee to autofill account number</div>

                  <div>
                    {beneficiaries.length === 0 ? (
                      <div className="empty-hint">No saved payees yet.</div>
                    ) : (
                      beneficiaries.map((b) => (
                        <div
                          key={b.id}
                          className="list-row"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setTransferForm((f) => ({ ...f, toAccountNumber: b.accountNumber }));
                            toast(`Selected ${b.name}`);
                          }}
                        >
                          <div className="list-row__avatar">{b.name[0]}</div>
                          <div>
                            <div className="list-row__name">{b.name} {b.nickname ? `(${b.nickname})` : ''}</div>
                            <div className="list-row__meta">#{fmtAcct(b.accountNumber)}</div>
                          </div>
                          <div className="list-row__actions">
                            <button className="btn btn--ghost btn--sm">Send →</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. DEPOSITS & LOANS VIEW */}
          {activeView === 'deposits' && (
            <div className="view-panel">
              <div className="grid-2">
                {/* Cash Deposit */}
                <div className="panel">
                  <h3 className="panel__title">Deposit Funds</h3>
                  <div className="panel__sub">Direct sovereign deposit into your Swiss Bank account</div>
                  <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                      <label>Target Account</label>
                      <select
                        value={depositForm.accountNumber}
                        onChange={(e) => setDepositForm({ ...depositForm, accountNumber: e.target.value })}
                        required
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.accountNumber}>#{fmtAcct(a.accountNumber)} ({a.holderName})</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Amount (₹)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="10000.00"
                        className="mono"
                        value={depositForm.amount}
                        onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Security PIN</label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="••••"
                        className="mono"
                        value={depositForm.pin}
                        onChange={(e) => setDepositForm({ ...depositForm, pin: e.target.value.replace(/\D/g, '') })}
                        required
                      />
                    </div>
                    <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                      <span className="btn__label">Complete Deposit</span>
                      <span className="btn__spinner" />
                    </button>
                  </form>
                </div>

                {/* Cash Withdrawal */}
                <div className="panel">
                  <h3 className="panel__title">Cash Withdrawal</h3>
                  <div className="panel__sub">Authorized debit from your verified account</div>
                  <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                      <label>Source Account</label>
                      <select
                        value={withdrawForm.accountNumber}
                        onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                        required
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.accountNumber}>#{fmtAcct(a.accountNumber)} (₹{money(a.balance)})</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Amount (₹)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="2500.00"
                        className="mono"
                        value={withdrawForm.amount}
                        onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Security PIN</label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="••••"
                        className="mono"
                        value={withdrawForm.pin}
                        onChange={(e) => setWithdrawForm({ ...withdrawForm, pin: e.target.value.replace(/\D/g, '') })}
                        required
                      />
                    </div>
                    <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                      <span className="btn__label">Authorize Withdrawal</span>
                      <span className="btn__spinner" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Loan / Credit Line Calculator */}
              <div className="panel" style={{ marginTop: 24 }}>
                <h3 className="panel__title">Personal Credit & Liquidity Calculator</h3>
                <div className="panel__sub">Competitive 8.5% fixed interest rate for verified Swiss Bank account holders</div>

                <div className="grid-2" style={{ marginTop: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>Borrowing Amount: ₹{money(emiAmount)}</label>
                    <input
                      type="range"
                      min={10000}
                      max={1000000}
                      step={5000}
                      value={emiAmount}
                      onChange={(e) => setEmiAmount(Number(e.target.value))}
                      style={{ width: '100%', margin: '10px 0 20px', accentColor: 'var(--accent)' }}
                    />

                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>Repayment Term: {emiMonths} Months</label>
                    <div className="tag-select" style={{ marginTop: 8 }}>
                      {[6, 12, 24, 36, 48, 60].map((m) => (
                        <button
                          key={m}
                          className={emiMonths === m ? 'is-active' : ''}
                          onClick={() => setEmiMonths(m)}
                        >
                          {m} Mo
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="result-strip">
                    <div className="result-tile">
                      <div className="result-tile__label">Monthly EMI</div>
                      <div className="result-tile__value">₹{money(emiVal)}</div>
                    </div>
                    <div className="result-tile">
                      <div className="result-tile__label">Total Interest</div>
                      <div className="result-tile__value">₹{money(emiVal * emiMonths - emiAmount)}</div>
                    </div>
                    <div className="result-tile">
                      <div className="result-tile__label">Total Repayment</div>
                      <div className="result-tile__value">₹{money(emiVal * emiMonths)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. CARDS VIEW */}
          {activeView === 'cards' && (
            <div className="view-panel">
              <div className="cards-view-grid">
                {/* Virtual Card Graphic */}
                {cards.length > 0 ? (
                  cards.map((c) => (
                    <div key={c.accountNumber} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div className={`debit-card ${c.frozen ? 'is-frozen' : ''}`}>
                        <div className="debit-card__top">
                          <div className="debit-card__brand">
                            <img src="/assets/logo.svg" alt="" />
                            <span>Swiss Bank</span>
                          </div>
                          <div className="debit-card__network">{c.network}</div>
                        </div>

                        <div className="debit-card__chip" />

                        <div className="debit-card__number">
                          •••• •••• •••• {String(c.accountNumber).slice(-4)}
                        </div>

                        <div className="debit-card__bottom">
                          <div>
                            <div className="debit-card__holder">{c.holderName}</div>
                          </div>
                          <div className="debit-card__exp">
                            <span>EXPIRES</span>
                            {String(c.expiryMonth).padStart(2, '0')}/{String(c.expiryYear).slice(-2)}
                          </div>
                        </div>
                      </div>

                      {/* Card Controls Panel */}
                      <div className="card-controls">
                        <div className="card-controls__row">
                          <span>Freeze Debit Card</span>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={c.frozen}
                              onChange={(e) => handleCardToggle(c.accountNumber, { frozen: e.target.checked })}
                            />
                            <span className="switch__track" />
                          </label>
                        </div>

                        <div className="card-controls__row">
                          <span>Contactless NFC Payments</span>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={c.contactlessEnabled}
                              onChange={(e) => handleCardToggle(c.accountNumber, { contactlessEnabled: e.target.checked })}
                            />
                            <span className="switch__track" />
                          </label>
                        </div>

                        <div className="card-controls__row">
                          <span>Online E-Commerce Transactions</span>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={c.onlineEnabled}
                              onChange={(e) => handleCardToggle(c.accountNumber, { onlineEnabled: e.target.checked })}
                            />
                            <span className="switch__track" />
                          </label>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          {c.replacementRequestedAt ? (
                            <span className="status-pill status-pill--open">
                              Replacement requested on {fmtDate(c.replacementRequestedAt)}
                            </span>
                          ) : (
                            <button
                              className="btn btn--ghost btn--block btn--sm"
                              onClick={() => handleCardReplacement(c.accountNumber)}
                            >
                              Request Physical Replacement Card
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="panel">
                    <div className="empty-hint">Open an account to receive your virtual Swiss Bank debit card.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. BILL PAY & UTILITIES VIEW */}
          {activeView === 'billpay' && (
            <div className="view-panel">
              <div className="grid-2">
                <div className="panel">
                  <h3 className="panel__title">Pay Bills & Recharges</h3>
                  <div className="panel__sub">Direct ledger debits for utility services</div>

                  <form onSubmit={handleBillPay} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                      <label>Debit Account</label>
                      <select
                        value={billForm.accountNumber}
                        onChange={(e) => setBillForm({ ...billForm, accountNumber: e.target.value })}
                        required
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.accountNumber}>#{fmtAcct(a.accountNumber)} (₹{money(a.balance)})</option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Biller Category</label>
                      <select
                        value={billForm.category}
                        onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}
                      >
                        <option value="Electricity">Electricity</option>
                        <option value="Mobile Recharge">Mobile Recharge</option>
                        <option value="Broadband">Broadband Internet</option>
                        <option value="Water">Water Utility</option>
                        <option value="Gas">Gas Pipeline</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Consumer Number / Account ID</label>
                      <input
                        type="text"
                        placeholder="e.g. SIG-GENEVA-88291"
                        value={billForm.consumer}
                        onChange={(e) => setBillForm({ ...billForm, consumer: e.target.value })}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Bill Amount (₹)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1180.00"
                        className="mono"
                        value={billForm.amount}
                        onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Security PIN</label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="••••"
                        className="mono"
                        value={billForm.pin}
                        onChange={(e) => setBillForm({ ...billForm, pin: e.target.value.replace(/\D/g, '') })}
                        required
                      />
                    </div>

                    <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                      <span className="btn__label">Pay Utility Bill</span>
                      <span className="btn__spinner" />
                    </button>
                  </form>
                </div>

                {/* Bill Payment History */}
                <div className="panel">
                  <h3 className="panel__title">Bill Payment Records</h3>
                  <div className="panel__sub">Linked to double-entry ledger transactions</div>

                  <div>
                    {billHistory.length === 0 ? (
                      <div className="empty-hint">No past bill payments.</div>
                    ) : (
                      billHistory.map((b) => (
                        <div key={b.id} className="list-row">
                          <div className="list-row__avatar">⚡</div>
                          <div>
                            <div className="list-row__name">{b.category} · {b.consumer}</div>
                            <div className="list-row__meta">{b.reference} · {fmtDate(b.createdAt)}</div>
                          </div>
                          <div className="list-row__actions">
                            <span className="amt amt--debit">-₹{money(b.amount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. BENEFICIARIES VIEW */}
          {activeView === 'beneficiaries' && (
            <div className="view-panel">
              <div className="row-between">
                <div>
                  <h2 className="section-title">Saved Payees</h2>
                  <div className="section-sub">Add and manage verified accounts for instant transfers</div>
                </div>
                <button className="btn btn--primary" onClick={() => setModalOpen('addBeneficiary')}>
                  + Add Beneficiary
                </button>
              </div>

              <div className="panel">
                {beneficiaries.length === 0 ? (
                  <div className="empty-hint">No beneficiaries saved yet.</div>
                ) : (
                  beneficiaries.map((b) => (
                    <div key={b.id} className="list-row">
                      <div className="list-row__avatar">{b.name[0]}</div>
                      <div>
                        <div className="list-row__name">{b.name} {b.nickname ? `(${b.nickname})` : ''}</div>
                        <div className="list-row__meta">Account #{fmtAcct(b.accountNumber)} · Saved on {fmtDate(b.createdAt)}</div>
                      </div>
                      <div className="list-row__actions">
                        <button
                          className="btn btn--soft btn--sm"
                          onClick={() => {
                            setTransferForm((f) => ({ ...f, toAccountNumber: b.accountNumber }));
                            setActiveView('transfers');
                          }}
                        >
                          Transfer →
                        </button>
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => handleDeleteBeneficiary(b.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 8. PROFILE & SECURITY VIEW */}
          {activeView === 'profile' && (
            <div className="view-panel">
              <div className="grid-2">
                {/* KYC Info */}
                <div className="panel">
                  <div className="row-between">
                    <h3 className="panel__title">Verified Identity & KYC</h3>
                    <span className="kyc-badge">✓ Verified Client</span>
                  </div>
                  <div className="panel__sub">Official account holder information</div>

                  <div className="profile-grid">
                    <div className="profile-row">
                      <label>Full Legal Name</label>
                      <div className="val">{user?.fullName}</div>
                    </div>
                    <div className="profile-row">
                      <label>Primary Email</label>
                      <div className="val">{user?.email}</div>
                    </div>
                    <div className="profile-row">
                      <label>Contact Phone</label>
                      <div className="val">{user?.phone || 'Not provided'}</div>
                    </div>
                    <div className="profile-row">
                      <label>Tax Identification / PAN</label>
                      <div className="val mono">{user?.panNumber || 'Not provided'}</div>
                    </div>
                    <div className="profile-row">
                      <label>Date of Birth</label>
                      <div className="val">{user?.dateOfBirth ? fmtDate(user.dateOfBirth) : 'Not provided'}</div>
                    </div>
                    <div className="profile-row">
                      <label>Account Role</label>
                      <div className="val"><span className="status-pill status-pill--open">{user?.role}</span></div>
                    </div>
                  </div>

                  <div className="profile-row" style={{ marginTop: 16 }}>
                    <label>Residential Address</label>
                    <div className="val">{user?.address || 'Not provided'}</div>
                  </div>
                </div>

                {/* 2-Factor Authentication & Password Management */}
                <div className="panel">
                  <h3 className="panel__title">Security & Two-Factor Auth (TOTP)</h3>
                  <div className="panel__sub">RFC 6238 hardware and authenticator app protections</div>

                  <div style={{ marginBottom: 20 }}>
                    {user?.totpEnabled ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <span className="status-pill status-pill--active">2FA Active</span>
                          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Google Authenticator / Authy enabled</span>
                        </div>

                        <form onSubmit={handleDisableTotp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div className="field">
                            <label>Current Password</label>
                            <input
                              type="password"
                              placeholder="Account password"
                              value={totpData.disablePassword}
                              onChange={(e) => setTotpData({ ...totpData, disablePassword: e.target.value })}
                              required
                            />
                          </div>
                          <div className="field">
                            <label>6-Digit 2FA Code</label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="123456"
                              className="mono"
                              value={totpData.disableCode}
                              onChange={(e) => setTotpData({ ...totpData, disableCode: e.target.value.replace(/\D/g, '') })}
                              required
                            />
                          </div>
                          <button type="submit" className="btn btn--danger btn--sm" disabled={loading}>
                            Disable 2-Factor Auth
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
                          Protect your high-value transfers (₹50,000+) and logins with an authenticator app.
                        </p>
                        <button className="btn btn--soft" onClick={handleStartTotpSetup}>
                          🛡️ Setup Two-Factor Authenticator
                        </button>
                      </div>
                    )}
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

                  {/* Change Password Form */}
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Change Password</h4>
                  <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="field">
                      <label>Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>New Password</label>
                      <input
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn--ghost btn--block" disabled={loading}>
                      Update Password
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* 9. SUPPORT VIEW */}
          {activeView === 'support' && (
            <div className="view-panel">
              <div className="grid-2">
                <div className="panel">
                  <h3 className="panel__title">Submit Concierge Inquiry</h3>
                  <div className="panel__sub">Direct priority assistance from our banking operations team</div>

                  <form onSubmit={handleRaiseTicket} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                      <label>Subject</label>
                      <input
                        type="text"
                        placeholder="e.g. International Wire Clearance"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Message</label>
                      <textarea
                        placeholder="Provide details about your question or requested operation..."
                        value={ticketForm.message}
                        onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                        required
                      />
                    </div>

                    <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                      <span className="btn__label">Submit Support Ticket</span>
                      <span className="btn__spinner" />
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <h3 className="panel__title">Your Support Inquiries</h3>
                  <div className="panel__sub">Track ticket status and operator responses</div>

                  <div>
                    {tickets.length === 0 ? (
                      <div className="empty-hint">No open or past tickets.</div>
                    ) : (
                      tickets.map((t) => (
                        <div key={t.id} className="list-row">
                          <div className="list-row__avatar">🎫</div>
                          <div>
                            <div className="list-row__name">{t.subject}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '3px 0' }}>{t.message}</div>
                            <div className="list-row__meta">{t.ticketNumber} · {fmtDate(t.createdAt)}</div>
                          </div>
                          <div className="list-row__actions">
                            <span className={`status-pill ${t.status === 'OPEN' ? 'status-pill--open' : 'status-pill--closed'}`}>
                              {t.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Open Additional Account */}
      {modalOpen === 'openAccount' && (
        <div className="overlay open">
          <div className="modal">
            <div className="modal__head">
              <div className="modal__title">Open New Account</div>
              <button className="modal__close" onClick={() => setModalOpen(null)}>✕</button>
            </div>
            <form onSubmit={handleOpenAccount} className="modal__body">
              <div className="field">
                <label>Account Holder Name</label>
                <input
                  type="text"
                  value={newAccountForm.holderName}
                  placeholder={user?.fullName || 'Account Name'}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, holderName: e.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label>Opening Deposit Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAccountForm.openingBalance}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, openingBalance: e.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label>Security PIN (4–6 Digits)</label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••"
                  className="mono"
                  value={newAccountForm.pin}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, pin: e.target.value.replace(/\D/g, '') })}
                  required
                />
              </div>

              <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                <span className="btn__label">Create Bank Account</span>
                <span className="btn__spinner" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Beneficiary */}
      {modalOpen === 'addBeneficiary' && (
        <div className="overlay open">
          <div className="modal">
            <div className="modal__head">
              <div className="modal__title">Save Beneficiary</div>
              <button className="modal__close" onClick={() => setModalOpen(null)}>✕</button>
            </div>
            <form onSubmit={handleAddBeneficiary} className="modal__body">
              <div className="field">
                <label>Payee Name</label>
                <input
                  type="text"
                  placeholder="Priya Shah"
                  value={benefForm.name}
                  onChange={(e) => setBenefForm({ ...benefForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label>Account Number</label>
                <input
                  type="text"
                  placeholder="10293847"
                  className="mono"
                  value={benefForm.accountNumber}
                  onChange={(e) => setBenefForm({ ...benefForm, accountNumber: e.target.value.replace(/\D/g, '') })}
                  required
                />
              </div>

              <div className="field">
                <label>Nickname (Optional)</label>
                <input
                  type="text"
                  placeholder="Priya"
                  value={benefForm.nickname}
                  onChange={(e) => setBenefForm({ ...benefForm, nickname: e.target.value })}
                />
              </div>

              <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                <span className="btn__label">Save Beneficiary</span>
                <span className="btn__spinner" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: TOTP Setup */}
      {modalOpen === 'totpSetup' && (
        <div className="overlay open">
          <div className="modal">
            <div className="modal__head">
              <div className="modal__title">Setup 2FA Authenticator</div>
              <button className="modal__close" onClick={() => setModalOpen(null)}>✕</button>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Enter the secret key below into Google Authenticator, Authy, or 1Password:
              </p>

              <div className="field">
                <label>Manual Entry Secret Key</label>
                <input
                  type="text"
                  readOnly
                  className="mono"
                  value={totpData.secret}
                  style={{ background: 'var(--surface-3)', fontWeight: 700, letterSpacing: '0.1em' }}
                />
              </div>

              <form onSubmit={handleEnableTotp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Enter 6-Digit Code to Verify</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    className="mono"
                    style={{ textAlign: 'center', fontSize: 20 }}
                    value={totpData.verifyCode}
                    onChange={(e) => setTotpData({ ...totpData, verifyCode: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                </div>

                <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading || totpData.verifyCode.length !== 6}>
                  <span className="btn__label">Activate 2-Factor Auth</span>
                  <span className="btn__spinner" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
