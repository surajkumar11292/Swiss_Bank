import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../components/common/ToastContainer.jsx';
import { api, money, fmtAcct, fmtDate } from '../services/api.js';
import '../styles/admin.css';

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      const [usersData, ticketsData] = await Promise.all([
        api('/api/admin/users'),
        api('/api/admin/tickets'),
      ]);
      setUsers(usersData || []);
      setTickets(ticketsData || []);
    } catch (err) {
      if (err.status === 403) {
        toast('Admin privileges required', 'error');
        navigate('/');
      } else {
        toast('Failed to load admin telemetry', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      toast('Access restricted to Bank Administrators', 'error');
      navigate('/');
    } else {
      loadAdminData();
    }
  }, [user]);

  const handleToggleFreeze = async (accountNumber, currentlyFrozen) => {
    try {
      if (currentlyFrozen) {
        await api(`/api/admin/accounts/${accountNumber}/unfreeze`, { method: 'POST' });
        toast(`Account #${accountNumber} unfrozen`);
      } else {
        await api(`/api/admin/accounts/${accountNumber}/freeze`, { method: 'POST' });
        toast(`Account #${accountNumber} frozen`);
      }
      loadAdminData();
    } catch (err) {
      toast(err.message || 'Failed to toggle account status', 'error');
    }
  };

  const handleCloseTicket = async (id) => {
    try {
      await api(`/api/admin/tickets/${id}/close`, { method: 'POST' });
      toast(`Ticket #${id} marked as resolved`);
      loadAdminData();
    } catch (err) {
      toast(err.message || 'Failed to close ticket', 'error');
    }
  };

  const totalAccounts = users.reduce((sum, u) => sum + (u.accounts?.length || 0), 0);
  const frozenAccounts = users.reduce(
    (sum, u) => sum + (u.accounts?.filter((a) => a.frozen).length || 0),
    0
  );
  const openTickets = tickets.filter((t) => t.status === 'OPEN').length;

  return (
    <div className="admin-shell">
      {/* Admin Header */}
      <header className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="sidebar__brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="/assets/logo.svg" alt="" style={{ width: 32, height: 32 }} />
            <div>
              <div className="sidebar__brand-name">Swiss Bank</div>
              <div className="sidebar__brand-sub">Executive Admin Console</div>
            </div>
          </div>
        </div>

        <div className="admin-header__right">
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>
            ← Customer Dashboard
          </button>

          {/* Theme Toggler */}
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

          <button
            className="btn btn--danger btn--sm"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Admin Content */}
      <main className="admin-main">
        {/* Metric Cards */}
        <div className="admin-stats">
          <div className="admin-stat">
            <div className="admin-stat__label">Total Registered Users</div>
            <div className="admin-stat__value">{users.length}</div>
          </div>

          <div className="admin-stat">
            <div className="admin-stat__label">Total Bank Accounts</div>
            <div className="admin-stat__value">{totalAccounts}</div>
          </div>

          <div className="admin-stat">
            <div className="admin-stat__label">Frozen Accounts</div>
            <div className="admin-stat__value" style={{ color: frozenAccounts > 0 ? 'var(--danger)' : 'inherit' }}>
              {frozenAccounts}
            </div>
          </div>

          <div className="admin-stat">
            <div className="admin-stat__label">Pending Support Tickets</div>
            <div className="admin-stat__value" style={{ color: openTickets > 0 ? 'var(--accent)' : 'inherit' }}>
              {openTickets}
            </div>
          </div>
        </div>

        {/* All Users & Account Freeze Table */}
        <div className="panel">
          <div className="row-between">
            <div>
              <h3 className="panel__title">Bank User Registry & Account Controls</h3>
              <div className="panel__sub">{users.length} client profiles registered</div>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Accounts & Balance</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-hint">No registered users found.</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.fullName}</strong></td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`status-pill ${u.role === 'ADMIN' ? 'status-pill--open' : 'status-pill--closed'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <div className="admin-accts">
                          {u.accounts && u.accounts.length > 0 ? (
                            u.accounts.map((a) => (
                              <div key={a.id} className="admin-acct-row">
                                <span>#{fmtAcct(a.accountNumber)}</span>
                                <span style={{ color: 'var(--text-dim)' }}>₹{money(a.balance)}</span>
                                <span className={`status-pill ${a.frozen ? 'status-pill--frozen' : 'status-pill--active'}`}>
                                  {a.frozen ? 'Frozen' : 'Active'}
                                </span>
                                <button
                                  className={`btn ${a.frozen ? 'btn--soft' : 'btn--danger'}`}
                                  onClick={() => handleToggleFreeze(a.accountNumber, a.frozen)}
                                >
                                  {a.frozen ? 'Unfreeze' : 'Freeze'}
                                </button>
                              </div>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>No accounts</span>
                          )}
                        </div>
                      </td>
                      <td className="txn-date">{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Support Tickets Queue */}
        <div className="panel">
          <div className="row-between">
            <div>
              <h3 className="panel__title">Client Support & Inquiries Queue</h3>
              <div className="panel__sub">{tickets.length} total ticket requests</div>
            </div>
          </div>

          <div>
            {tickets.length === 0 ? (
              <div className="empty-hint">No support tickets in queue.</div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="ticket-admin-row">
                  <div className="ticket-admin-row__body">
                    <div className="ticket-admin-row__subject">{t.subject}</div>
                    <div className="ticket-admin-row__msg">{t.message}</div>
                    <div className="ticket-admin-row__meta">
                      {t.ticketNumber} · {t.ownerName} ({t.ownerEmail}) · {fmtDate(t.createdAt)}
                    </div>
                  </div>

                  <div className="ticket-admin-row__side">
                    <span className={`status-pill ${t.status === 'OPEN' ? 'status-pill--open' : 'status-pill--closed'}`}>
                      {t.status}
                    </span>
                    {t.status === 'OPEN' && (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleCloseTicket(t.id)}
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
