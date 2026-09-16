import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Baby, BarChart3, Bell, ChevronRight, ClipboardPlus as ClipboardHeart, HandHeart, HeartPulse, LayoutDashboard, LogOut, Menu, ShieldCheck, Syringe, UserRound, Users, X } from 'lucide-react';
import { useAuth } from './store';

export const formatDate = (value) => value ? new Intl.DateTimeFormat('en-NP', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
export const humanRole = (role) => ({ HEALTHCARE_WORKER: 'Healthcare worker', SUPERVISOR: 'Supervisor', ADMIN: 'Administrator' }[role] || role);
export const canEdit = (user) => ['HEALTHCARE_WORKER', 'ADMIN'].includes(user?.role);

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mothers', label: 'Mothers', icon: UserRound },
  { to: '/children', label: 'Children', icon: Baby },
  { to: '/vaccinations', label: 'Vaccinations', icon: Syringe },
  { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/assistance', label: 'Assistance', icon: HandHeart },
  { to: '/reports', label: 'Reports', icon: BarChart3 }
];

export function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}>
    <div className="brand-mark"><HeartPulse size={24} /><span>ज</span></div>
    {!compact && <div><strong>Janani Swasthya</strong><small>Maternal & child health</small></div>}
  </div>;
}

export function Shell({ children }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const active = [...nav, { to: '/users', label: 'Users' }].find((item) => item.to === location.pathname)?.label || (location.pathname.startsWith('/mothers/') ? 'Mother profile' : 'Janani Swasthya');
  const links = user?.role === 'ADMIN' ? [...nav, { to: '/users', label: 'Users & access', icon: ShieldCheck }] : nav;
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-head"><Brand /><button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <nav>{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}><Icon size={19} />{label}<ChevronRight className="nav-arrow" size={15} /></NavLink>)}</nav>
      <div className="sidebar-foot">
        <div className="profile-dot">{user?.name?.split(' ').map((x) => x[0]).slice(0, 2).join('')}</div>
        <div><strong>{user?.name}</strong><small>{humanRole(user?.role)}</small></div>
        <button className="icon-button" onClick={logout} aria-label="Log out"><LogOut size={18} /></button>
      </div>
    </aside>
    {open && <button className="backdrop mobile-only" onClick={() => setOpen(false)} aria-label="Close menu" />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={21} /></button><div><small>Janani Swasthya</small><strong>{active}</strong></div><div className="secure-label"><ShieldCheck size={16} /> Secure health records</div></header>
      <div className="page-wrap">{children}</div>
    </main>
  </div>;
}

export function PageTitle({ eyebrow, title, description, action }) {
  return <div className="page-title"><div><span>{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function StatCard({ label, value, note, icon: Icon, tone = 'green' }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={21} /></div><div><small>{label}</small><strong>{value ?? '—'}</strong><span>{note}</span></div></article>;
}

export function Badge({ children, tone }) {
  const normalized = String(children || '').toLowerCase().replaceAll('_', '-');
  return <span className={`badge ${tone || normalized}`}>{String(children || '').replaceAll('_', ' ')}</span>;
}

export function Empty({ icon: Icon = ClipboardHeart, title = 'Nothing here yet', text = 'New records will appear here.' }) {
  return <div className="empty"><Icon size={30} /><strong>{title}</strong><p>{text}</p></div>;
}

export function Loading() { return <div className="loading"><span /><span /><span /></div>; }
export function ErrorNote({ message }) { return message ? <div className="error-note">{message}</div> : null; }

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  return <div className="modal-layer" role="dialog" aria-modal="true"><button className="modal-backdrop" onClick={onClose} aria-label="Close dialog" /><section className={`modal ${wide ? 'modal-wide' : ''}`}><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose}><X size={20} /></button></header>{children}</section></div>;
}

export function Field({ label, hint, className = '', children }) { return <label className={`field ${className}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }

export function Table({ columns, rows, emptyTitle }) {
  if (!rows?.length) return <Empty title={emptyTitle} />;
  return <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || index}>{columns.map((column) => <td key={column.label} data-label={column.label}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}

export function Section({ title, note, action, children, className = '' }) { return <section className={`panel ${className}`}><div className="panel-head"><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</div>{children}</section>; }

export function SubmitButton({ busy, children = 'Save record' }) { return <button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : children}</button>; }

export function FormActions({ onCancel, busy, submitLabel }) { return <div className="form-actions"><button type="button" className="button ghost" onClick={onCancel}>Cancel</button><SubmitButton busy={busy}>{submitLabel}</SubmitButton></div>; }

export const icons = { Users, Baby, Bell, Syringe, HandHeart, ClipboardHeart };
