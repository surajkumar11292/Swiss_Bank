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
  const [notifOpen, setNotifOpen] = useState(false);

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [allRecentEntries, setAllRecentEntries] = useState([]);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [ledgerMeta, setLedgerMeta] = useState({ totalPages: 1, totalElements: 0, first: true, last: true });

  // Beneficiaries, Billpay, Cards, Tickets state
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [cards, setCards] = useState([]);
  const [billHistory, setBillHistory] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Modals & Action Forms
  const [modalOpen, setModalOpen] = useState(null); // 'openAccount' | 'deposit' | 'withdraw' | 'transfer' | 'addBeneficiary' | 'transfer2fa'
  const [loading, setLoading] = useState(false);

  // Form states
  const [newAccountForm, setNewAccountForm] = useState({ holderName: '', openingBalance: '1000', pin: '' });
  const [depositForm, setDepositForm] = useState({ accountNumber: '', amount: '', pin: '' });
  const [withdrawForm, setWithdrawForm] = useState({ accountNumber: '', amount: '', pin: '' });
  const [transferForm, setTransferForm] = useState({ fromAccountNumber: '', toAccountNumber: '', amount: '', pin: '', totpCode: '' });
  const [billForm, setBillForm] = useState({ accountNumber: '', category: 'Electricity', consumer: '', amount: '', pin: '' });
  const [benefForm, setBenefForm] = useState({ name: '', accountNumber: '', nickname: '' });
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
  const [twofaSecret, setTwofaSecret] = useState('');
  const [twofaCode, setTwofaCode] = useState('');
  const [showTwofaSetup, setShowTwofaSetup] = useState(false);

  // FD / RD Calculator state
  const [fdType, setFdType] = useState('fd'); // 'fd' | 'rd'
  const [fdAmount, setFdAmount] = useState(100000);
  const [fdTenure, setFdTenure] = useState(24);
  const [fdRate, setFdRate] = useState(6.5);

  // Loan EMI Calculator state
  const [loanType, setLoanType] = useState('Personal');
  const [loanAmount, setLoanAmount] = useState(500000);
  const [loanTenure, setLoanTenure] = useState(36);
  const [loanRate, setLoanRate] = useState(10.5);

  // Load Accounts & Initial Data
  const loadAccounts = async () => {
    try {
      const data = await api('/api/accounts');
      setAccounts(data || []);
      if (data && data.length > 0) {
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

  const loadAllRecentActivity = async () => {
    try {
      const accts = await api('/api/accounts');
      if (accts && accts.length > 0) {
        const promises = accts.map((a) =>
          api(`/api/accounts/${a.accountNumber}/history?page=0&size=10`).catch(() => ({ content: [] }))
        );
        const results = await Promise.all(promises);
        const combined = results.flatMap((r) => r.content || []);
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllRecentEntries(combined.slice(0, 8));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadBeneficiaries = async () => {
    try {
      const data = await api('/api/beneficiaries');
      setBeneficiaries(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCards = async () => {
    try {
      const data = await api('/api/cards');
      setCards(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBillHistory = async () => {
    try {
      const data = await api('/api/billpay/history?page=0&size=8');
      setBillHistory(data.content || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTickets = async () => {
    try {
      const data = await api('/api/support/tickets');
      setTickets(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadBeneficiaries();
    loadCards();
    loadAllRecentActivity();
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
    if (activeView === 'dashboard') loadAllRecentActivity();
    if (activeView === 'beneficiaries') loadBeneficiaries();
    if (activeView === 'cards') loadCards();
    if (activeView === 'billpay') loadBillHistory();
    if (activeView === 'support') loadTickets();
  }, [activeView]);

  const totalBalance = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const recentMoneyIn = allRecentEntries
    .filter((e) => e.type === 'CREDIT')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const recentMoneyOut = allRecentEntries
    .filter((e) => e.type === 'DEBIT')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

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
      setModalOpen(null);
      await loadAccounts();
      setActiveAccount(updated);
      loadLedger(updated.accountNumber, 0);
      loadAllRecentActivity();
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
      setModalOpen(null);
      await loadAccounts();
      setActiveAccount(updated);
      loadLedger(updated.accountNumber, 0);
      loadAllRecentActivity();
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
      loadAllRecentActivity();
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
      loadBillHistory();
      loadAllRecentActivity();
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

  // 2FA Setup
  const handleStart2fa = async () => {
    try {
      const data = await api('/api/2fa/setup', { method: 'POST' });
      setTwofaSecret(data.secret);
      setShowTwofaSetup(true);
    } catch (err) {
      toast(err.message || 'Failed to initialize 2FA', 'error');
    }
  };

  const handleEnable2fa = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: twofaCode }),
      });
      toast('2-Factor Authentication enabled!');
      setShowTwofaSetup(false);
      setTwofaCode('');
      await refreshUser();
    } catch (err) {
      toast(err.message || 'Invalid 2FA code', 'error');
    } finally {
      setLoading(false);
    }
  };

  // FD / RD calculations
  const calculateFd = () => {
    const P = Number(fdAmount) || 0;
    const n = Number(fdTenure) || 1;
    const r = Number(fdRate) / 100 || 0.065;
    if (fdType === 'fd') {
      const invested = P;
      const maturity = Math.round(P * Math.pow(1 + r / 4, (4 * n) / 12));
      const interest = maturity - invested;
      return { invested, interest, maturity };
    } else {
      const invested = P * n;
      const maturity = Math.round(P * ((Math.pow(1 + r / 4, (4 * n) / 12) - 1) / (1 - Math.pow(1 + r / 4, -1 / 3))));
      const interest = Math.max(0, maturity - invested);
      return { invested, interest, maturity };
    }
  };

  // Loan calculations
  const calculateLoan = () => {
    const P = Number(loanAmount) || 0;
    const n = Number(loanTenure) || 1;
    const r = Number(loanRate) / 12 / 100 || 0.01;
    const emi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    const total = emi * n;
    const interest = total - P;
    return { emi, interest, total };
  };

  const fdRes = calculateFd();
  const loanRes = calculateLoan();

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} id="sidebar">
        <div className="sidebar__brand" style={{ cursor: 'pointer' }} onClick={() => setActiveView('dashboard')}>
          <img src="/assets/logo.svg" alt="Swiss Bank" />
          <div>
            <div className="sidebar__brand-name">Swiss Bank</div>
            <div className="sidebar__brand-sub">NetBanking</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav__group-label">Menu</div>
          <button
            className={`nav__item ${activeView === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('dashboard'); setSidebarOpen(false); }}
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="12" width="8" height="9" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></svg>
            Dashboard
          </button>

          <button
            className={`nav__item ${activeView === 'accounts' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('accounts'); setSidebarOpen(false); }}
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.2"/></svg>
            Accounts
          </button>

          <button
            className={`nav__item ${activeView === 'transfers' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('transfers'); setSidebarOpen(false); }}
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12"/></svg>
            Transfers
          </button>

          <button
            className={`nav__item ${activeView === 'deposits' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('deposits'); setSidebarOpen(false); }}
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Deposits &amp; Loans
          </button>

          <button
            className={`nav__item ${activeView === 'cards' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('cards'); setSidebarOpen(false); }}
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg>
            Cards
          </button>

          <button
            className={`nav__item ${activeView === 'billpay' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('billpay'); setSidebarOpen(false); }}
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l3 3v15H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>
            Bill Pay &amp; Recharge
          </button>

          <button
            className={`nav__item ${activeView === 'beneficiaries' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('beneficiaries'); setSidebarOpen(false); }}
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Beneficiaries
          </button>

          <div className="nav__group-label">Account</div>
          <button
            className={`nav__item ${activeView === 'profile' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('profile'); setSidebarOpen(false); }}
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
            Profile &amp; KYC
          </button>

          <button
            className={`nav__item ${activeView === 'support' ? 'is-active' : ''}`}
            onClick={() => { setActiveView('support'); setSidebarOpen(false); }}
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.6-2.2 2-2.5 3.4M12 17h.01"/></svg>
            Support
          </button>
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__helpline">
            24×7 Customer Care
            <b>1800-000-0000</b>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="main-col">
        {/* Top Appbar */}
        <header className="appbar">
          <button
            className="icon-toggle"
            id="menuToggle"
            aria-label="Menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>

          <div className="appbar__title">
            {activeView === 'dashboard' && 'Dashboard'}
            {activeView === 'accounts' && 'Accounts'}
            {activeView === 'transfers' && 'Transfers'}
            {activeView === 'deposits' && 'Deposits & Loans'}
            {activeView === 'cards' && 'Cards'}
            {activeView === 'billpay' && 'Bill Pay & Recharge'}
            {activeView === 'beneficiaries' && 'Beneficiaries'}
            {activeView === 'profile' && 'Profile & KYC'}
            {activeView === 'support' && 'Support'}
          </div>

          <div className="appbar__right">
            {/* Notification Bell Dropdown */}
            <div className="dropdown">
              <button
                className="icon-toggle"
                aria-label="Notifications"
                title="Notifications"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>
              <div className={`dropdown__panel ${notifOpen ? 'open' : ''}`}>
                <div className="dropdown__head">Notifications</div>
                <div className="dropdown__empty">You're all caught up.</div>
              </div>
            </div>

            {/* Theme Toggle with exact SVGs */}
            <div className="theme-toggle" role="group" aria-label="Theme">
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
                title="Light"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
              </button>
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
                title="Dark"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              </button>
              <button
                type="button"
                aria-pressed={theme === 'system'}
                onClick={() => setTheme('system')}
                title="System"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </button>
            </div>

            {/* Signed in as demo user & Sign out */}
            <div className="user-chip">
              <span>Signed in as</span>
              <b>{user?.fullName || 'Demo User'}</b>
            </div>

            <button
              className="btn btn--ghost btn--sm"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* View Content */}
        <main className="wrap">
          {/* 1. DASHBOARD VIEW */}
          {activeView === 'dashboard' && (
            <section className="view is-active view-panel">
              <div className="row-between">
                <div>
                  <h1 className="section-title">Welcome back{user ? `, ${user.fullName.split(' ')[0]}` : ''}</h1>
                  <p className="section-sub">Here's what's happening with your money today.</p>
                </div>
              </div>

              {/* Stat Grid (4 Cards) */}
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-card__label">Total balance</div>
                  <div className="stat-card__value"><span className="cur">₹</span>{money(totalBalance)}</div>
                  <div className="stat-card__meta">{accounts.length} account{accounts.length === 1 ? '' : 's'}</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__label">Money in (recent)</div>
                  <div className="stat-card__value"><span className="cur">₹</span>{money(recentMoneyIn || 62500)}</div>
                  <div className="stat-card__meta">Across recent activity</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__label">Money out (recent)</div>
                  <div className="stat-card__value"><span className="cur">₹</span>{money(recentMoneyOut || 1180)}</div>
                  <div className="stat-card__meta">Across recent activity</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__label">Saved beneficiaries</div>
                  <div className="stat-card__value">{beneficiaries.length}</div>
                  <div className="stat-card__meta">Ready for quick transfer</div>
                </div>
              </div>

              {/* Promo Banner */}
              <div className="promo-banner">
                <div>
                  <div className="promo-banner__title">Grow your savings with a Fixed Deposit</div>
                  <div className="promo-banner__sub">
                    Earn up to 7.25% p.a. Use the deposit calculator to see how much your money can grow.
                  </div>
                </div>
                <button className="btn btn--primary btn--sm" onClick={() => setActiveView('deposits')}>
                  Explore deposits
                </button>
              </div>

              {/* Quick Actions Header & Grid */}
              <div className="row-between" style={{ marginBottom: 12 }}>
                <h2 className="section-title" style={{ fontSize: 18 }}>Quick actions</h2>
              </div>
              <div className="quick-grid">
                <div className="quick-tile" onClick={() => setActiveView('transfers')}>
                  <span className="quick-tile__ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12"/></svg></span>
                  <span className="quick-tile__label">Transfer</span>
                </div>
                <div className="quick-tile" onClick={() => setModalOpen('deposit')}>
                  <span className="quick-tile__ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></span>
                  <span className="quick-tile__label">Deposit</span>
                </div>
                <div className="quick-tile" onClick={() => setModalOpen('withdraw')}>
                  <span className="quick-tile__ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg></span>
                  <span className="quick-tile__label">Withdraw</span>
                </div>
                <div className="quick-tile" onClick={() => setActiveView('billpay')}>
                  <span className="quick-tile__ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l3 3v15H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></span>
                  <span className="quick-tile__label">Pay bills</span>
                </div>
                <div className="quick-tile" onClick={() => setModalOpen('addBeneficiary')}>
                  <span className="quick-tile__ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg></span>
                  <span className="quick-tile__label">Add payee</span>
                </div>
                <div className="quick-tile" onClick={() => setActiveView('cards')}>
                  <span className="quick-tile__ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg></span>
                  <span className="quick-tile__label">Manage cards</span>
                </div>
              </div>

              {/* Your Accounts Rail */}
              <div className="row-between" style={{ marginBottom: 12 }}>
                <h2 className="section-title" style={{ fontSize: 18 }}>Your accounts</h2>
              </div>
              <div className="cards-rail">
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    className={`bank-card ${a.accountNumber === activeAccount?.accountNumber ? 'is-active' : ''}`}
                    onClick={() => setActiveAccount(a)}
                  >
                    <div className="bank-card__top">
                      <span className="bank-card__label"><img src="/assets/logo.svg" alt="" /> Swiss Bank</span>
                      <span className="bank-card__chip" />
                    </div>
                    <div className="bank-card__balance"><span className="cur">₹</span>{money(a.balance)}</div>
                    <div>
                      <div className="bank-card__holder">{a.holderName}</div>
                      <div className="bank-card__number">{fmtAcct(a.accountNumber)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Activity Table */}
              <div className="statement" style={{ marginTop: 24 }}>
                <div className="statement__head">
                  <div className="statement__title">Recent activity</div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setActiveView('accounts')}>
                    View full statement
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Date</th>
                        <th className="num">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRecentEntries.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="empty-hint">No recent transactions recorded.</td>
                        </tr>
                      ) : (
                        allRecentEntries.map((e) => (
                          <tr key={e.id}>
                            <td>
                              <div className="txn-desc">
                                <span className="txn-icon">{e.type === 'CREDIT' ? '↑' : '↓'}</span>
                                <div className="txn-desc__meta">
                                  <strong>{e.description}</strong>
                                </div>
                              </div>
                            </td>
                            <td className="txn-date">{fmtDate(e.createdAt)}</td>
                            <td className={`num amt ${e.type === 'CREDIT' ? 'amt--credit' : 'amt--debit'}`}>
                              {e.type === 'CREDIT' ? '+' : '-'}₹{money(e.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 2. ACCOUNTS VIEW */}
          {activeView === 'accounts' && (
            <section className="view is-active view-panel">
              <div className="row-between">
                <div>
                  <h1 className="section-title">Your accounts</h1>
                  <p className="section-sub">Select an account to view its statement.</p>
                </div>
                <button className="btn btn--primary btn--sm" onClick={() => setModalOpen('openAccount')}>
                  + Open new account
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
                      <span className="bank-card__label"><img src="/assets/logo.svg" alt="" /> Swiss Bank</span>
                      <span className="bank-card__chip" />
                    </div>
                    <div className="bank-card__balance"><span className="cur">₹</span>{money(a.balance)}</div>
                    <div>
                      <div className="bank-card__holder">{a.holderName}</div>
                      <div className="bank-card__number">{fmtAcct(a.accountNumber)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {activeAccount && (
                <div>
                  <div className="actions-bar">
                    <button className="btn btn--primary btn--sm" onClick={() => setModalOpen('deposit')}>Deposit</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setModalOpen('withdraw')}>Withdraw</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => { setTransferForm((f) => ({ ...f, fromAccountNumber: activeAccount.accountNumber })); setActiveView('transfers'); }}>Transfer</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => handleDownloadCsv(activeAccount.accountNumber)}>Download statement (CSV)</button>
                  </div>

                  <div className="statement">
                    <div className="statement__head">
                      <div>
                        <div className="statement__title">Statement</div>
                        <div className="statement__acct">Account #{fmtAcct(activeAccount.accountNumber)} · Balance: ₹{money(activeAccount.balance)}</div>
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Date</th>
                            <th className="num">Amount</th>
                            <th className="num">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerEntries.map((e) => (
                            <tr key={e.id}>
                              <td>
                                <div className="txn-desc">
                                  <span className="txn-icon">{e.type === 'CREDIT' ? '↑' : '↓'}</span>
                                  <div className="txn-desc__meta">
                                    <strong>{e.description}</strong>
                                    <span className="txn-desc__ref">{e.reference}</span>
                                  </div>
                                </div>
                              </td>
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
                </div>
              )}
            </section>
          )}

          {/* 3. TRANSFERS VIEW */}
          {activeView === 'transfers' && (
            <section className="view is-active view-panel">
              <div className="row-between">
                <div>
                  <h1 className="section-title">Transfers</h1>
                  <p className="section-sub">Move money between your accounts or to a saved payee.</p>
                </div>
              </div>

              <div className="grid-2">
                <div className="panel">
                  <div className="panel__title">New transfer</div>
                  <div className="panel__sub">All transfers are secured with your account PIN.</div>

                  <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                      <label>From account <span className="req">*</span></label>
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
                      <label>To account number <span className="req">*</span></label>
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

                    <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                      <span className="btn__label">Authorize Transfer</span>
                      <span className="btn__spinner" />
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <div className="panel__title">Send to a beneficiary</div>
                  <div className="panel__sub">Quick-transfer to one of your saved payees.</div>

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
            </section>
          )}

          {/* 4. DEPOSITS & LOANS VIEW */}
          {activeView === 'deposits' && (
            <section className="view is-active view-panel">
              <div className="row-between">
                <div>
                  <h1 className="section-title">Deposits &amp; Loans</h1>
                  <p className="section-sub">Plan your savings and borrowing — calculators update instantly.</p>
                </div>
              </div>

              <div className="grid-2">
                {/* FD / RD Calculator */}
                <div className="panel">
                  <div className="panel__title">Fixed / Recurring Deposit calculator</div>
                  <div className="panel__sub">Estimate maturity value on a lump-sum or monthly deposit.</div>

                  <div className="tag-select">
                    <button type="button" className={fdType === 'fd' ? 'is-active' : ''} onClick={() => setFdType('fd')}>
                      Fixed Deposit
                    </button>
                    <button type="button" className={fdType === 'rd' ? 'is-active' : ''} onClick={() => setFdType('rd')}>
                      Recurring Deposit
                    </button>
                  </div>

                  <div className="field" style={{ marginTop: 14 }}>
                    <label>{fdType === 'fd' ? 'Deposit amount' : 'Monthly deposit'} <span className="req">*</span></label>
                    <input
                      type="number"
                      className="mono"
                      value={fdAmount}
                      onChange={(e) => setFdAmount(Number(e.target.value))}
                    />
                  </div>

                  <div className="field">
                    <label>Tenure (months): <b>{fdTenure}</b></label>
                    <div className="range-row">
                      <input
                        type="range"
                        min="3"
                        max="120"
                        value={fdTenure}
                        onChange={(e) => setFdTenure(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Interest rate (% p.a.): <b>{fdRate.toFixed(2)}</b></label>
                    <div className="range-row">
                      <input
                        type="range"
                        min="3"
                        max="9"
                        step="0.05"
                        value={fdRate}
                        onChange={(e) => setFdRate(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="result-strip">
                    <div className="result-tile">
                      <div className="result-tile__label">Invested</div>
                      <div className="result-tile__value">₹{money(fdRes.invested)}</div>
                    </div>
                    <div className="result-tile">
                      <div className="result-tile__label">Interest earned</div>
                      <div className="result-tile__value">₹{money(fdRes.interest)}</div>
                    </div>
                    <div className="result-tile">
                      <div className="result-tile__label">Maturity value</div>
                      <div className="result-tile__value">₹{money(fdRes.maturity)}</div>
                    </div>
                  </div>
                </div>

                {/* Loan EMI Calculator */}
                <div className="panel">
                  <div className="panel__title">Loan EMI calculator</div>
                  <div className="panel__sub">Estimate your monthly instalment on a personal, home, or auto loan.</div>

                  <div className="tag-select">
                    <button
                      type="button"
                      className={loanType === 'Personal' ? 'is-active' : ''}
                      onClick={() => { setLoanType('Personal'); setLoanRate(10.5); }}
                    >
                      Personal
                    </button>
                    <button
                      type="button"
                      className={loanType === 'Home' ? 'is-active' : ''}
                      onClick={() => { setLoanType('Home'); setLoanRate(8.4); }}
                    >
                      Home
                    </button>
                    <button
                      type="button"
                      className={loanType === 'Auto' ? 'is-active' : ''}
                      onClick={() => { setLoanType('Auto'); setLoanRate(9.2); }}
                    >
                      Auto
                    </button>
                  </div>

                  <div className="field" style={{ marginTop: 14 }}>
                    <label>Loan amount <span className="req">*</span></label>
                    <input
                      type="number"
                      className="mono"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                    />
                  </div>

                  <div className="field">
                    <label>Tenure (months): <b>{loanTenure}</b></label>
                    <div className="range-row">
                      <input
                        type="range"
                        min="6"
                        max="360"
                        value={loanTenure}
                        onChange={(e) => setLoanTenure(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Interest rate (% p.a.): <b>{loanRate.toFixed(2)}</b></label>
                    <div className="range-row">
                      <input
                        type="range"
                        min="6"
                        max="18"
                        step="0.05"
                        value={loanRate}
                        onChange={(e) => setLoanRate(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="result-strip">
                    <div className="result-tile">
                      <div className="result-tile__label">Monthly EMI</div>
                      <div className="result-tile__value">₹{money(loanRes.emi)}</div>
                    </div>
                    <div className="result-tile">
                      <div className="result-tile__label">Total interest</div>
                      <div className="result-tile__value">₹{money(loanRes.interest)}</div>
                    </div>
                    <div className="result-tile">
                      <div className="result-tile__label">Total payment</div>
                      <div className="result-tile__value">₹{money(loanRes.total)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="note-strip" style={{ marginTop: 18 }}>Rates shown are illustrative defaults and run entirely in your browser.</p>
            </section>
          )}

          {/* 5. CARDS VIEW */}
          {activeView === 'cards' && (
            <section className="view is-active view-panel">
              <div className="row-between">
                <div>
                  <h1 className="section-title">Cards</h1>
                  <p className="section-sub">Manage your debit cards, freeze them instantly, or request a new one.</p>
                </div>
              </div>

              <div className="cards-view-grid">
                {cards.map((c) => (
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
                        <div className="debit-card__holder">{c.holderName}</div>
                        <div className="debit-card__exp">
                          <span>EXPIRES</span>
                          {String(c.expiryMonth).padStart(2, '0')}/{String(c.expiryYear).slice(-2)}
                        </div>
                      </div>
                    </div>

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
                        <span>Contactless NFC</span>
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
                        <span>Online E-Commerce</span>
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
                            Request Replacement Card
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. BILL PAY VIEW */}
          {activeView === 'billpay' && (
            <section className="view is-active view-panel">
              <div className="row-between">
                <div>
                  <h1 className="section-title">Bill Pay &amp; Recharge</h1>
                  <p className="section-sub">Pay a biller directly from one of your accounts — recorded in your statement.</p>
                </div>
              </div>

              <div className="grid-2">
                <div className="panel">
                  <div className="panel__title">Pay a bill</div>
                  <div className="panel__sub">Select a category, enter details, and confirm with your PIN.</div>

                  <form onSubmit={handleBillPay} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                      <label>Biller category <span className="req">*</span></label>
                      <select
                        value={billForm.category}
                        onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}
                      >
                        <option>Electricity</option>
                        <option>Mobile Recharge</option>
                        <option>DTH / Cable</option>
                        <option>Water Bill</option>
                        <option>Broadband / Wi-Fi</option>
                        <option>Gas Booking</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Consumer / mobile number <span className="req">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. 9876543210"
                        className="mono"
                        value={billForm.consumer}
                        onChange={(e) => setBillForm({ ...billForm, consumer: e.target.value })}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Pay from account <span className="req">*</span></label>
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
                      <label>Amount <span className="req">*</span></label>
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
                      <label>Security PIN <span className="req">*</span></label>
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
                      <span className="btn__label">Pay bill</span>
                      <span className="btn__spinner" />
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <div className="panel__title">Recent bill payments</div>
                  <div className="panel__sub">Payments recorded on your accounts.</div>

                  <div>
                    {billHistory.length === 0 ? (
                      <div className="empty-hint">No bill payments yet.</div>
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
            </section>
          )}

          {/* 7. BENEFICIARIES VIEW */}
          {activeView === 'beneficiaries' && (
            <section className="view is-active view-panel">
              <div className="row-between">
                <div>
                  <h1 className="section-title">Beneficiaries</h1>
                  <p className="section-sub">Save payees for faster transfers next time.</p>
                </div>
                <button className="btn btn--primary btn--sm" onClick={() => setModalOpen('addBeneficiary')}>
                  Add beneficiary
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
                        <div className="list-row__meta">Account #{fmtAcct(b.accountNumber)}</div>
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
            </section>
          )}

          {/* 8. PROFILE & KYC VIEW */}
          {activeView === 'profile' && (
            <section className="view is-active view-panel">
              <div className="row-between">
                <div>
                  <h1 className="section-title">Profile &amp; KYC</h1>
                  <p className="section-sub">Your registered details.</p>
                </div>
                <span className="kyc-badge">✓ KYC verified</span>
              </div>

              <div className="panel">
                <div className="panel__title">Personal details</div>
                <div className="panel__sub">Official account holder information.</div>

                <div className="profile-grid">
                  <div className="profile-row"><label>Full name</label><div className="val">{user?.fullName}</div></div>
                  <div className="profile-row"><label>Email</label><div className="val">{user?.email}</div></div>
                  <div className="profile-row"><label>Registered mobile</label><div className="val">{user?.phone || '—'}</div></div>
                  <div className="profile-row"><label>Customer ID</label><div className="val mono">CUST-00{user?.id}</div></div>
                  <div className="profile-row"><label>Date of birth</label><div className="val">{user?.dateOfBirth ? fmtDate(user.dateOfBirth) : '—'}</div></div>
                  <div className="profile-row"><label>PAN</label><div className="val mono">{user?.panNumber || '—'}</div></div>
                  <div className="profile-row"><label>Address on file</label><div className="val">{user?.address || '—'}</div></div>
                  <div className="profile-row"><label>Communication preference</label><div className="val">Email &amp; SMS</div></div>
                </div>
                <div className="note-strip">Profile fields reflect what you provided at sign-up — no personal data is shared beyond this app.</div>
              </div>

              <div className="panel" style={{ marginTop: 20 }}>
                <div className="panel__title">Two-factor authentication</div>
                <div className="panel__sub">Add an authenticator-app code on top of your password for sign-in and large transfers.</div>

                {user?.totpEnabled ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="status-pill status-pill--active">Enabled</span>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Authenticator app active</span>
                  </div>
                ) : (
                  <div>
                    {!showTwofaSetup ? (
                      <div className="row-between" style={{ gap: 12 }}>
                        <span className="status-pill status-pill--frozen">Disabled</span>
                        <button className="btn btn--primary btn--sm" onClick={handleStart2fa}>Enable 2FA</button>
                      </div>
                    ) : (
                      <div style={{ maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="note-strip">Add this key to Google Authenticator or Authy, then enter the 6-digit code.</div>
                        <div className="field">
                          <label>Manual entry key</label>
                          <input className="mono" value={twofaSecret} readOnly />
                        </div>
                        <form onSubmit={handleEnable2fa} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div className="field">
                            <label>6-digit code from your app <span className="req">*</span></label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="000000"
                              className="mono"
                              style={{ letterSpacing: '0.25em', textAlign: 'center' }}
                              value={twofaCode}
                              onChange={(e) => setTwofaCode(e.target.value.replace(/\D/g, ''))}
                              required
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button type="submit" className="btn btn--primary btn--sm" disabled={loading || twofaCode.length !== 6}>Verify &amp; Activate</button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowTwofaSetup(false)}>Cancel</button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 9. SUPPORT VIEW */}
          {activeView === 'support' && (
            <section className="view is-active view-panel">
              <div className="row-between">
                <div>
                  <h1 className="section-title">Support</h1>
                  <p className="section-sub">Get help with your account or raise a query with our operations desk.</p>
                </div>
              </div>

              <div className="grid-2">
                <div className="panel">
                  <div className="panel__title">Raise a ticket</div>
                  <div className="panel__sub">We'll review and respond promptly.</div>

                  <form onSubmit={handleRaiseTicket} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                      <label>Subject</label>
                      <input
                        type="text"
                        placeholder="e.g. Question about card replacement"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Message</label>
                      <textarea
                        placeholder="Describe what you need help with..."
                        value={ticketForm.message}
                        onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                        required
                      />
                    </div>

                    <button type="submit" className={`btn btn--primary btn--block ${loading ? 'is-loading' : ''}`} disabled={loading}>
                      <span className="btn__label">Submit ticket</span>
                      <span className="btn__spinner" />
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <div className="panel__title">Your tickets</div>
                  <div className="panel__sub">Track support conversations.</div>

                  <div>
                    {tickets.length === 0 ? (
                      <div className="empty-hint">No support tickets found.</div>
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
            </section>
          )}
        </main>
      </div>

      {/* Modal: Deposit */}
      {modalOpen === 'deposit' && (
        <div className="overlay open">
          <div className="modal">
            <div className="modal__head">
              <div className="modal__title">Deposit funds</div>
              <button className="modal__close" onClick={() => setModalOpen(null)}>✕</button>
            </div>
            <form onSubmit={handleDeposit} className="modal__body">
              <div className="field">
                <label>Account</label>
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
                  step="0.01"
                  placeholder="5000.00"
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
                <span className="btn__label">Complete deposit</span>
                <span className="btn__spinner" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Withdraw */}
      {modalOpen === 'withdraw' && (
        <div className="overlay open">
          <div className="modal">
            <div className="modal__head">
              <div className="modal__title">Withdraw funds</div>
              <button className="modal__close" onClick={() => setModalOpen(null)}>✕</button>
            </div>
            <form onSubmit={handleWithdraw} className="modal__body">
              <div className="field">
                <label>Account</label>
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
                  step="0.01"
                  placeholder="1000.00"
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
                <span className="btn__label">Authorize withdrawal</span>
                <span className="btn__spinner" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Open New Account */}
      {modalOpen === 'openAccount' && (
        <div className="overlay open">
          <div className="modal">
            <div className="modal__head">
              <div className="modal__title">Open new account</div>
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
                <span className="btn__label">Create account</span>
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
              <div className="modal__title">Add beneficiary</div>
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
                <span className="btn__label">Save beneficiary</span>
                <span className="btn__spinner" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
