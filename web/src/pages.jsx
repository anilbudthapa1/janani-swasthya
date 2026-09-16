import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Activity, AlertTriangle, Baby, Bell, CalendarClock, Check, ClipboardPlus as ClipboardHeart, Download, HandHeart, HeartPulse, KeyRound, Mail, MapPin, Phone, Plus, Search, Stethoscope, Syringe, TrendingUp, UserPlus, UserRound } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from './api';
import { Badge, Brand, Empty, ErrorNote, Field, FormActions, Loading, Modal, PageTitle, Section, StatCard, SubmitButton, Table, canEdit, formatDate, humanRole, icons } from './components';
import { useAuth } from './store';

const today = () => new Date().toISOString().slice(0, 10);
const defaultMother = { fullName: '', phone: '', email: '', address: '', ward: '', dateOfBirth: '', bloodGroup: '', pregnancyStatus: 'Pregnant', lastMenstrualDate: '', expectedDueDate: '', riskLevel: 'LOW', riskNotes: '' };

function useLoad(path, dependencies = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = async () => { setLoading(true); setError(''); try { setData(await api(path)); } catch (e) { { setError(e.message); } } finally { setLoading(false); } };
  useEffect(() => { reload(); }, dependencies);
  return { data, error, loading, reload };
}

export function Login() {
  const [form, setForm] = useState({ email: 'worker@janani.gov.np', password: 'Admin@123' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const login = useAuth((state) => state.login);
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) }); login(result.token, result.user); navigate('/'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const useDemo = (email) => setForm({ email, password: 'Admin@123' });
  return <main className="login-page">
    <section className="login-story">
      <Brand />
      <div className="story-copy"><span className="eyebrow-light">नेपालको समुदाय स्वास्थ्यका लागि</span><h1>Every mother. Every child. Every follow-up.</h1><p>A shared care record for maternal health, early childhood, vaccination, and community follow-up.</p></div>
      <div className="story-metric"><HeartPulse /><div><strong>Continuity of care</strong><span>From pregnancy through a child’s first two years</span></div></div>
      <small className="story-foot">JANANI SWASTHYA · Secure community health platform</small>
    </section>
    <section className="login-panel"><form onSubmit={submit}>
      <div className="mobile-brand"><Brand /></div><span className="eyebrow">Secure sign in</span><h2>Welcome back</h2><p>Use your assigned health-post account.</p>
      <ErrorNote message={error} />
      <Field label="Email address"><div className="input-icon"><Mail size={18} /><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></Field>
      <Field label="Password"><div className="input-icon"><KeyRound size={18} /><input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div></Field>
      <SubmitButton busy={busy}>Sign in</SubmitButton>
      <div className="demo-box"><strong>Demo accounts</strong><p>All accounts use <code>Admin@123</code></p><div><button type="button" onClick={() => useDemo('worker@janani.gov.np')}>Worker</button><button type="button" onClick={() => useDemo('supervisor@janani.gov.np')}>Supervisor</button><button type="button" onClick={() => useDemo('admin@janani.gov.np')}>Admin</button></div></div>
    </form></section>
  </main>;
}

export function Dashboard() {
  const { data, error, loading } = useLoad('/dashboard');
  const user = useAuth((state) => state.user);
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Overview" title={`Namaste, ${user?.name?.split(' ')[0]}`} description="Here is today’s maternal and child health picture." action={canEdit(user) && <Link className="button primary" to="/mothers"><Plus size={18} /> Register mother</Link>} /><ErrorNote message={error} />
    {data && <>
      <div className="stat-grid">
        <StatCard label="Registered mothers" value={data.summary.mothers} note="Active records" icon={UserRound} />
        <StatCard label="Registered children" value={data.summary.children} note="Linked to mothers" icon={Baby} tone="blue" />
        <StatCard label="Follow-ups due" value={data.summary.pendingFollowUps} note="Within 7 days" icon={CalendarClock} tone="amber" />
        <StatCard label="High-risk cases" value={data.summary.highRisk} note="Need close monitoring" icon={AlertTriangle} tone="red" />
      </div>
      <div className="dashboard-grid">
        <Section title="Care priorities" note="Items that need attention now">
          <div className="priority-list">
            <Link to="/vaccinations"><span className="priority-icon red"><Syringe /></span><div><strong>{data.summary.missedVaccines} missed vaccinations</strong><p>Review and contact caregivers</p></div><span>Review</span></Link>
            <Link to="/reminders"><span className="priority-icon amber"><Bell /></span><div><strong>{data.summary.dueVaccines} vaccines due soon</strong><p>Scheduled in the next 7 days</p></div><span>Review</span></Link>
            <Link to="/assistance"><span className="priority-icon blue"><HandHeart /></span><div><strong>{data.summary.assistance} open assistance requests</strong><p>Calls and follow-ups pending</p></div><span>Review</span></Link>
          </div>
        </Section>
        <Section title="Service health" note="Current community coverage">
          <div className="coverage"><div className="coverage-ring"><span>{data.summary.children + data.summary.mothers}</span><small>people</small></div><div><p><i className="dot green" /> Maternal records</p><p><i className="dot blue" /> Child records</p><p><i className="dot amber" /> Follow-up queue</p></div></div>
        </Section>
      </div>
      <Section title="Recently registered mothers" note="Latest community records" action={<Link className="text-link" to="/mothers">View all</Link>}>
        <Table emptyTitle="No mothers registered" rows={data.recentMothers} columns={[
          { label: 'Mother', render: (row) => <Link className="person-cell" to={`/mothers/${row.id}`}><span>{row.fullName[0]}</span><div><strong>{row.fullName}</strong><small>{row.maternalId}</small></div></Link> },
          { label: 'Risk', render: (row) => <Badge>{row.riskLevel}</Badge> },
          { label: 'Children', render: (row) => row._count.children },
          { label: 'ANC visits', render: (row) => row._count.ancVisits },
          { label: 'Assigned worker', render: (row) => row.assignedWorker?.name || 'Unassigned' }
        ]} />
      </Section>
    </>}
  </>;
}

function MotherForm({ onClose, onSaved }) {
  const [form, setForm] = useState(defaultMother); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await api('/mothers', { method: 'POST', body: JSON.stringify(form) }); onSaved(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="modal-body"><ErrorNote message={error} /><div className="form-grid">
    <Field label="Full name"><input required value={form.fullName} onChange={update('fullName')} /></Field><Field label="Phone number"><input required value={form.phone} onChange={update('phone')} /></Field>
    <Field label="Email (optional)"><input type="email" value={form.email} onChange={update('email')} /></Field><Field label="Date of birth"><input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} /></Field>
    <Field label="Address" className="span-2"><input required value={form.address} onChange={update('address')} placeholder="Municipality, district" /></Field><Field label="Ward"><input value={form.ward} onChange={update('ward')} /></Field>
    <Field label="Blood group"><select value={form.bloodGroup} onChange={update('bloodGroup')}><option value="">Unknown</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Care status"><select value={form.pregnancyStatus} onChange={update('pregnancyStatus')}><option>Pregnant</option><option>Postnatal</option><option>Completed</option></select></Field>
    <Field label="Risk level"><select value={form.riskLevel} onChange={update('riskLevel')}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></Field>
    <Field label="Last menstrual date"><input type="date" value={form.lastMenstrualDate} onChange={update('lastMenstrualDate')} /></Field><Field label="Expected due date"><input type="date" value={form.expectedDueDate} onChange={update('expectedDueDate')} /></Field>
    <Field label="Risk notes" className="span-2"><textarea rows="3" value={form.riskNotes} onChange={update('riskNotes')} placeholder="Known risks, conditions, or follow-up instructions" /></Field>
  </div></div><FormActions onCancel={onClose} busy={busy} submitLabel="Register mother" /></form>;
}

function MotherEditForm({ mother, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: mother.fullName, phone: mother.phone, email: mother.email || '', address: mother.address, ward: mother.ward || '', bloodGroup: mother.bloodGroup || '', pregnancyStatus: mother.pregnancyStatus, expectedDueDate: mother.expectedDueDate?.slice(0, 10) || '', riskLevel: mother.riskLevel, riskNotes: mother.riskNotes || '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api(`/mothers/${mother.id}`, { method: 'PUT', body: JSON.stringify(form) }); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="modal-body"><ErrorNote message={error} /><div className="form-grid">
    <Field label="Full name"><input required value={form.fullName} onChange={update('fullName')} /></Field><Field label="Phone"><input required value={form.phone} onChange={update('phone')} /></Field><Field label="Email"><input type="email" value={form.email} onChange={update('email')} /></Field><Field label="Blood group"><input value={form.bloodGroup} onChange={update('bloodGroup')} /></Field><Field label="Address" className="span-2"><input required value={form.address} onChange={update('address')} /></Field><Field label="Ward"><input value={form.ward} onChange={update('ward')} /></Field><Field label="Care status"><select value={form.pregnancyStatus} onChange={update('pregnancyStatus')}><option>Pregnant</option><option>Postnatal</option><option>Completed</option></select></Field><Field label="Expected due date"><input type="date" value={form.expectedDueDate} onChange={update('expectedDueDate')} /></Field><Field label="Risk level"><select value={form.riskLevel} onChange={update('riskLevel')}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></Field><Field label="Risk notes" className="span-2"><textarea rows="3" value={form.riskNotes} onChange={update('riskNotes')} /></Field>
  </div></div><FormActions onCancel={onClose} busy={busy} submitLabel="Update mother" /></form>;
}

export function Mothers() {
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [show, setShow] = useState(false); const user = useAuth((s) => s.user);
  const { data, error, loading, reload } = useLoad(`/mothers${query ? `?search=${encodeURIComponent(query)}` : ''}`, [query]);
  const save = () => { setShow(false); reload(); };
  return <><PageTitle eyebrow="Mother management" title="Mothers" description="Register pregnancies and maintain a continuous maternal health record." action={canEdit(user) && <button className="button primary" onClick={() => setShow(true)}><Plus size={18} /> Register mother</button>} />
    <Section title="Maternal records" note={`${data?.length || 0} records found`} action={<form className="search" onSubmit={(e) => { e.preventDefault(); setQuery(search); }}><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, or phone" /></form>}>
      <ErrorNote message={error} />{loading ? <Loading /> : <Table emptyTitle="No mother records found" rows={data} columns={[
        { label: 'Mother', render: (row) => <Link className="person-cell" to={`/mothers/${row.id}`}><span>{row.fullName[0]}</span><div><strong>{row.fullName}</strong><small>{row.maternalId}</small></div></Link> },
        { label: 'Contact', render: (row) => <div className="stack"><span>{row.phone}</span><small>{row.address}</small></div> },
        { label: 'Care status', render: (row) => <Badge tone="neutral">{row.pregnancyStatus}</Badge> },
        { label: 'Risk', render: (row) => <Badge>{row.riskLevel}</Badge> },
        { label: 'Last ANC', render: (row) => formatDate(row.ancVisits?.[0]?.visitDate) },
        { label: 'Children', render: (row) => row._count.children }
      ]} />}
    </Section>
    {show && <Modal title="Register a mother" subtitle="Create a maternal health record" onClose={() => setShow(false)} wide><MotherForm onClose={() => setShow(false)} onSaved={save} /></Modal>}
  </>;
}

function AncForm({ motherId, onClose, onSaved }) {
  const [form, setForm] = useState({ motherId, visitDate: today(), gestationalWeeks: '', systolic: '', diastolic: '', weightKg: '', hemoglobin: '', nextVisitDate: '', notes: '', riskFlag: false });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const update = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api('/anc-visits', { method: 'POST', body: JSON.stringify(form) }); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="modal-body"><ErrorNote message={error} /><div className="form-grid">
    <Field label="Visit date"><input required type="date" value={form.visitDate} onChange={update('visitDate')} /></Field><Field label="Gestational week"><input type="number" min="1" max="45" value={form.gestationalWeeks} onChange={update('gestationalWeeks')} /></Field>
    <Field label="Blood pressure (systolic)"><input type="number" value={form.systolic} onChange={update('systolic')} /></Field><Field label="Blood pressure (diastolic)"><input type="number" value={form.diastolic} onChange={update('diastolic')} /></Field>
    <Field label="Weight (kg)"><input type="number" step="0.1" value={form.weightKg} onChange={update('weightKg')} /></Field><Field label="Hemoglobin (g/dL)"><input type="number" step="0.1" value={form.hemoglobin} onChange={update('hemoglobin')} /></Field>
    <Field label="Next visit"><input type="date" value={form.nextVisitDate} onChange={update('nextVisitDate')} /></Field><label className="check-field"><input type="checkbox" checked={form.riskFlag} onChange={update('riskFlag')} /><span><strong>Flag as high risk</strong><small>Add this case to the priority dashboard.</small></span></label>
    <Field label="Clinical notes" className="span-2"><textarea rows="4" value={form.notes} onChange={update('notes')} /></Field>
  </div></div><FormActions onCancel={onClose} busy={busy} submitLabel="Save ANC visit" /></form>;
}

function ChildForm({ motherId, onClose, onSaved }) {
  const [form, setForm] = useState({ motherId, fullName: '', dateOfBirth: '', sex: 'FEMALE', birthWeightKg: '', bloodGroup: '', notes: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api('/children', { method: 'POST', body: JSON.stringify(form) }); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="modal-body"><ErrorNote message={error} /><div className="form-grid">
    <Field label="Child’s full name" className="span-2"><input required value={form.fullName} onChange={update('fullName')} /></Field><Field label="Date of birth"><input required type="date" max={today()} value={form.dateOfBirth} onChange={update('dateOfBirth')} /></Field><Field label="Sex"><select value={form.sex} onChange={update('sex')}><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></Field>
    <Field label="Birth weight (kg)"><input type="number" step="0.1" value={form.birthWeightKg} onChange={update('birthWeightKg')} /></Field><Field label="Blood group"><select value={form.bloodGroup} onChange={update('bloodGroup')}><option value="">Unknown</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Birth or health notes" className="span-2"><textarea rows="3" value={form.notes} onChange={update('notes')} /></Field>
  </div></div><FormActions onCancel={onClose} busy={busy} submitLabel="Register child" /></form>;
}

export function MotherProfile() {
  const { id } = useParams(); const [modal, setModal] = useState(''); const { data: mother, error, loading, reload } = useLoad(`/mothers/${id}`, [id]); const user = useAuth((s) => s.user);
  if (loading) return <Loading />;
  if (!mother) return <><ErrorNote message={error || 'Mother not found.'} /><Link className="text-link" to="/mothers">Back to mothers</Link></>;
  const saved = () => { setModal(''); reload(); };
  return <><PageTitle eyebrow={mother.maternalId} title={mother.fullName} description={`${mother.pregnancyStatus} care record`} action={canEdit(user) && <div className="button-row"><button className="button ghost" onClick={() => setModal('edit')}>Edit details</button><button className="button ghost" onClick={() => setModal('child')}><Baby size={18} /> Add child</button><button className="button primary" onClick={() => setModal('anc')}><Stethoscope size={18} /> Record ANC</button></div>} />
    <ErrorNote message={error} />
    <div className="profile-grid">
      <Section title="Profile" note="Contact and care details" className="profile-card"><div className="profile-summary"><div className="large-avatar">{mother.fullName.split(' ').map((x) => x[0]).slice(0,2).join('')}</div><div><h3>{mother.fullName}</h3><Badge>{mother.riskLevel}</Badge></div></div><dl className="detail-list">
        <div><dt><Phone size={16} /> Phone</dt><dd>{mother.phone}</dd></div><div><dt><MapPin size={16} /> Address</dt><dd>{mother.address}{mother.ward ? `, ${mother.ward}` : ''}</dd></div><div><dt><Activity size={16} /> Blood group</dt><dd>{mother.bloodGroup || 'Not recorded'}</dd></div><div><dt><CalendarClock size={16} /> Expected due date</dt><dd>{formatDate(mother.expectedDueDate)}</dd></div><div><dt><Stethoscope size={16} /> Assigned worker</dt><dd>{mother.assignedWorker?.name || 'Unassigned'}</dd></div>
      </dl>{mother.riskNotes && <div className="risk-note"><AlertTriangle size={18} /><div><strong>Risk note</strong><p>{mother.riskNotes}</p></div></div>}</Section>
      <div className="profile-main">
        <Section title="Antenatal care history" note={`${mother.ancVisits.length} visits recorded`} action={canEdit(user) && <button className="text-button" onClick={() => setModal('anc')}><Plus size={16} /> Add visit</button>}>
          {mother.ancVisits.length ? <div className="timeline">{mother.ancVisits.map((visit) => <article key={visit.id}><i className={visit.riskFlag ? 'danger' : ''} /><div className="timeline-head"><div><strong>{formatDate(visit.visitDate)}</strong><span>{visit.gestationalWeeks ? `${visit.gestationalWeeks} weeks` : 'Routine visit'}</span></div>{visit.riskFlag && <Badge>HIGH</Badge>}</div><div className="vitals"><span>BP <b>{visit.systolic && visit.diastolic ? `${visit.systolic}/${visit.diastolic}` : '—'}</b></span><span>Weight <b>{visit.weightKg ? `${visit.weightKg} kg` : '—'}</b></span><span>Hb <b>{visit.hemoglobin ? `${visit.hemoglobin} g/dL` : '—'}</b></span><span>Next <b>{formatDate(visit.nextVisitDate)}</b></span></div>{visit.notes && <p>{visit.notes}</p>}<small>Recorded by {visit.createdBy.name}</small></article>)}</div> : <Empty icon={Stethoscope} title="No ANC visits yet" text="Record the first antenatal check-up." />}
        </Section>
        <Section title="Children" note="Linked child health records" action={canEdit(user) && <button className="text-button" onClick={() => setModal('child')}><Plus size={16} /> Add child</button>}>
          {mother.children.length ? <div className="child-cards">{mother.children.map((child) => <article key={child.id}><div className="child-icon"><Baby /></div><div><strong>{child.fullName}</strong><span>{child.childId}</span><small>Born {formatDate(child.dateOfBirth)} · {child.sex.toLowerCase()}</small></div><div><b>{child._count.vaccinations}</b><small>vaccines</small></div></article>)}</div> : <Empty icon={Baby} title="No children linked" text="Register a child and link the record to this mother." />}
        </Section>
      </div>
    </div>
    {modal === 'anc' && <Modal title="Record ANC visit" subtitle={`Maternal record · ${mother.fullName}`} onClose={() => setModal('')} wide><AncForm motherId={id} onClose={() => setModal('')} onSaved={saved} /></Modal>}
    {modal === 'child' && <Modal title="Register a child" subtitle={`Link to ${mother.fullName}`} onClose={() => setModal('')} wide><ChildForm motherId={id} onClose={() => setModal('')} onSaved={saved} /></Modal>}
    {modal === 'edit' && <Modal title="Update mother details" subtitle={mother.maternalId} onClose={() => setModal('')} wide><MotherEditForm mother={mother} onClose={() => setModal('')} onSaved={saved} /></Modal>}
  </>;
}

export function Children() {
  const { data, error, loading } = useLoad('/children');
  return <><PageTitle eyebrow="Child management" title="Children" description="Growth, nutrition, vaccination, and early-childhood health records." /><Section title="Child health records" note={`${data?.length || 0} registered children`}><ErrorNote message={error} />{loading ? <Loading /> : <Table emptyTitle="No children registered" rows={data} columns={[
    { label: 'Child', render: (row) => <Link className="person-cell" to={`/children/${row.id}`}><span>{row.fullName[0]}</span><div><strong>{row.fullName}</strong><small>{row.childId}</small></div></Link> },
    { label: 'Mother', render: (row) => <Link className="text-link" to={`/mothers/${row.mother.id}`}>{row.mother.fullName}</Link> },
    { label: 'Born', render: (row) => formatDate(row.dateOfBirth) },
    { label: 'Sex', render: (row) => <Badge tone="neutral">{row.sex}</Badge> },
    { label: 'Latest weight', render: (row) => row.growthRecords[0] ? `${row.growthRecords[0].weightKg} kg` : '—' },
    { label: 'Vaccination', render: (row) => { const missed = row.vaccinations.filter((x) => x.status === 'MISSED').length; return missed ? <Badge>MISSED</Badge> : <Badge tone="completed">On track</Badge>; } }
  ]} />}</Section></>;
}

function GrowthForm({ childId, onClose, onSaved }) {
  const [form, setForm] = useState({ childId, recordedAt: today(), weightKg: '', heightCm: '', headCm: '', nutrition: '', notes: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api('/growth-records', { method: 'POST', body: JSON.stringify(form) }); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="modal-body"><ErrorNote message={error} /><div className="form-grid">
    <Field label="Recorded date"><input required type="date" value={form.recordedAt} onChange={update('recordedAt')} /></Field><Field label="Weight (kg)"><input required type="number" min="0" step="0.1" value={form.weightKg} onChange={update('weightKg')} /></Field>
    <Field label="Height (cm)"><input type="number" min="0" step="0.1" value={form.heightCm} onChange={update('heightCm')} /></Field><Field label="Head circumference (cm)"><input type="number" min="0" step="0.1" value={form.headCm} onChange={update('headCm')} /></Field>
    <Field label="Nutrition" className="span-2"><input value={form.nutrition} onChange={update('nutrition')} placeholder="e.g. Exclusive breastfeeding" /></Field><Field label="Notes" className="span-2"><textarea rows="3" value={form.notes} onChange={update('notes')} /></Field>
  </div></div><FormActions onCancel={onClose} busy={busy} submitLabel="Save growth record" /></form>;
}

function ChildEditForm({ child, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: child.fullName, dateOfBirth: child.dateOfBirth.slice(0,10), sex: child.sex, birthWeightKg: child.birthWeightKg || '', bloodGroup: child.bloodGroup || '', notes: child.notes || '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api(`/children/${child.id}`, { method: 'PUT', body: JSON.stringify(form) }); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="modal-body"><ErrorNote message={error} /><div className="form-grid"><Field label="Full name" className="span-2"><input required value={form.fullName} onChange={update('fullName')} /></Field><Field label="Date of birth"><input required type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} /></Field><Field label="Sex"><select value={form.sex} onChange={update('sex')}><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></Field><Field label="Birth weight (kg)"><input type="number" step="0.1" value={form.birthWeightKg} onChange={update('birthWeightKg')} /></Field><Field label="Blood group"><input value={form.bloodGroup} onChange={update('bloodGroup')} /></Field><Field label="Health notes" className="span-2"><textarea rows="3" value={form.notes} onChange={update('notes')} /></Field></div></div><FormActions onCancel={onClose} busy={busy} submitLabel="Update child" /></form>;
}

export function ChildProfile() {
  const { id } = useParams(); const [modal, setModal] = useState(''); const { data: child, error, loading, reload } = useLoad(`/children/${id}`, [id]); const user = useAuth((s) => s.user);
  if (loading) return <Loading />; if (!child) return <ErrorNote message={error || 'Child not found.'} />; const saved = () => { setModal(''); reload(); };
  return <><PageTitle eyebrow={child.childId} title={child.fullName} description="Growth, nutrition, and immunization record" action={canEdit(user) && <div className="button-row"><button className="button ghost" onClick={() => setModal('edit')}>Edit details</button><button className="button primary" onClick={() => setModal('growth')}><Plus size={18} /> Record growth</button></div>} /><div className="profile-grid"><Section title="Child profile" note="Identity and household"><div className="profile-summary"><div className="large-avatar"><Baby /></div><div><h3>{child.fullName}</h3><Badge tone="neutral">{child.sex}</Badge></div></div><dl className="detail-list"><div><dt><CalendarClock size={16} /> Date of birth</dt><dd>{formatDate(child.dateOfBirth)}</dd></div><div><dt><Activity size={16} /> Birth weight</dt><dd>{child.birthWeightKg ? `${child.birthWeightKg} kg` : 'Not recorded'}</dd></div><div><dt><HeartPulse size={16} /> Blood group</dt><dd>{child.bloodGroup || 'Not recorded'}</dd></div><div><dt><UserRound size={16} /> Mother</dt><dd><Link className="text-link" to={`/mothers/${child.mother.id}`}>{child.mother.fullName}</Link></dd></div><div><dt><Phone size={16} /> Contact</dt><dd>{child.mother.phone}</dd></div></dl>{child.notes && <p className="profile-notes">{child.notes}</p>}</Section><div className="profile-main"><Section title="Growth & nutrition" note={`${child.growthRecords.length} measurements`} action={canEdit(user) && <button className="text-button" onClick={() => setModal('growth')}><Plus size={16} /> Add measurement</button>}>{child.growthRecords.length ? <Table rows={child.growthRecords} columns={[{label:'Date',render:(x)=>formatDate(x.recordedAt)},{label:'Weight',render:(x)=>`${x.weightKg} kg`},{label:'Height',render:(x)=>x.heightCm ? `${x.heightCm} cm` : '—'},{label:'Head',render:(x)=>x.headCm ? `${x.headCm} cm` : '—'},{label:'Nutrition',render:(x)=>x.nutrition || '—'}]} /> : <Empty icon={TrendingUp} title="No growth measurements" text="Record weight, height, and nutrition at the next visit." />}</Section><Section title="Vaccination history" note={`${child.vaccinations.length} scheduled doses`}>{child.vaccinations.length ? <Table rows={child.vaccinations} columns={[{label:'Vaccine',render:(x)=><div className="stack"><strong>{x.vaccineName}</strong><small>{x.dose}</small></div>},{label:'Scheduled',render:(x)=>formatDate(x.scheduledDate)},{label:'Given',render:(x)=>formatDate(x.administeredDate)},{label:'Status',render:(x)=><Badge>{x.status}</Badge>}]} /> : <Empty icon={Syringe} title="No vaccine schedule" text="Add vaccine doses from the Vaccinations module." />}</Section></div></div>
    {modal === 'growth' && <Modal title="Record growth" subtitle={child.fullName} onClose={() => setModal('')}><GrowthForm childId={child.id} onClose={() => setModal('')} onSaved={saved} /></Modal>}
    {modal === 'edit' && <Modal title="Update child details" subtitle={child.childId} onClose={() => setModal('')}><ChildEditForm child={child} onClose={() => setModal('')} onSaved={saved} /></Modal>}
  </>;
}

function VaccineForm({ children, onClose, onSaved }) {
  const [form, setForm] = useState({ childId: children?.[0]?.id || '', vaccineName: '', dose: '', scheduledDate: today(), notes: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api('/vaccinations', { method: 'POST', body: JSON.stringify(form) }); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="modal-body"><ErrorNote message={error} /><div className="form-grid">
    <Field label="Child" className="span-2"><select required value={form.childId} onChange={update('childId')}><option value="">Select a child</option>{children?.map((child) => <option key={child.id} value={child.id}>{child.fullName} · {child.childId}</option>)}</select></Field>
    <Field label="Vaccine"><input required value={form.vaccineName} onChange={update('vaccineName')} placeholder="e.g. Pentavalent" /></Field><Field label="Dose"><input required value={form.dose} onChange={update('dose')} placeholder="e.g. Dose 1" /></Field>
    <Field label="Scheduled date"><input required type="date" value={form.scheduledDate} onChange={update('scheduledDate')} /></Field><Field label="Notes"><input value={form.notes} onChange={update('notes')} /></Field>
  </div></div><FormActions onCancel={onClose} busy={busy} submitLabel="Add vaccination" /></form>;
}

export function Vaccinations() {
  const [filter, setFilter] = useState(''); const [show, setShow] = useState(false); const [actionError, setActionError] = useState(''); const user = useAuth((s) => s.user);
  const { data, error, loading, reload } = useLoad(`/vaccinations${filter ? `?status=${filter}` : ''}`, [filter]); const childrenLoad = useLoad('/children');
  async function complete(id) { setActionError(''); try { await api(`/vaccinations/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED', administeredDate: today() }) }); reload(); } catch (e) { setActionError(e.message); } }
  const saved = () => { setShow(false); reload(); };
  return <><PageTitle eyebrow="Vaccination module" title="Vaccinations" description="See due, completed, and missed vaccines across all child records." action={canEdit(user) && <button className="button primary" onClick={() => setShow(true)}><Plus size={18} /> Add schedule</button>} />
    <div className="filter-tabs">{[['','All'],['DUE','Due'],['MISSED','Missed'],['COMPLETED','Completed']].map(([value,label]) => <button className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div>
    <Section title="Vaccination register" note={`${data?.length || 0} scheduled doses`}><ErrorNote message={error || actionError} />{loading ? <Loading /> : <Table emptyTitle="No vaccination records" rows={data} columns={[
      { label: 'Child', render: (row) => <div className="stack"><strong>{row.child.fullName}</strong><small>{row.child.childId}</small></div> },
      { label: 'Vaccine', render: (row) => <div className="stack"><strong>{row.vaccineName}</strong><small>{row.dose}</small></div> },
      { label: 'Scheduled', render: (row) => formatDate(row.scheduledDate) },
      { label: 'Caregiver', render: (row) => <div className="stack"><span>{row.child.mother.fullName}</span><small>{row.child.mother.phone}</small></div> },
      { label: 'Status', render: (row) => <Badge>{row.status}</Badge> },
      { label: 'Action', render: (row) => row.status !== 'COMPLETED' && canEdit(user) ? <button className="mini-button" onClick={() => complete(row.id)}><Check size={15} /> Complete</button> : <span className="muted">{row.batchNumber || '—'}</span> }
    ]} />}</Section>
    {show && <Modal title="Add vaccination schedule" subtitle="Plan a vaccine dose for a registered child" onClose={() => setShow(false)}><VaccineForm children={childrenLoad.data} onClose={() => setShow(false)} onSaved={saved} /></Modal>}
  </>;
}

const dueLabel = (value) => { const days = Math.ceil((new Date(value).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000); return days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue` : days === 0 ? 'Due today' : `In ${days} day${days === 1 ? '' : 's'}`; };

export function Reminders() {
  const { data, error, loading } = useLoad('/reminders');
  const entries = useMemo(() => data ? [
    ...data.anc.map((x) => ({ id: `anc-${x.id}`, type: 'ANC follow-up', icon: Stethoscope, name: x.mother.fullName, reference: x.mother.maternalId, phone: x.mother.phone, date: x.nextVisitDate, risk: x.mother.riskLevel })),
    ...data.vaccinations.map((x) => ({ id: `vac-${x.id}`, type: `${x.vaccineName} · ${x.dose}`, icon: Syringe, name: x.child.fullName, reference: `Caregiver: ${x.child.mother.fullName}`, phone: x.child.mother.phone, date: x.scheduledDate, risk: x.status === 'MISSED' ? 'HIGH' : 'LOW' })),
    ...data.assistance.map((x) => ({ id: `ast-${x.id}`, type: x.requestType, icon: HandHeart, name: x.child?.fullName || x.mother?.fullName, reference: 'Assistance follow-up', phone: x.mother?.phone || '', date: x.followUpDate, risk: x.priority }))
  ].sort((a,b) => new Date(a.date) - new Date(b.date)) : [], [data]);
  return <><PageTitle eyebrow="Reminder module" title="Follow-up reminders" description="A single queue for ANC visits, vaccination dates, and assistance calls." /><ErrorNote message={error} />{loading ? <Loading /> : <div className="reminder-layout"><Section title="Follow-up queue" note={`${entries.length} scheduled items`}>
    {entries.length ? <div className="reminder-list">{entries.map((item) => { const Icon = item.icon; const overdue = new Date(item.date) < new Date(new Date().toDateString()); return <article key={item.id}><div className={`reminder-icon ${overdue ? 'overdue' : ''}`}><Icon /></div><div><span>{item.type}</span><strong>{item.name}</strong><small>{item.reference}</small></div><div className="reminder-contact"><a href={`tel:${item.phone}`}><Phone size={15} />{item.phone}</a><small>{formatDate(item.date)}</small></div><Badge tone={overdue ? 'missed' : 'due'}>{dueLabel(item.date)}</Badge></article>; })}</div> : <Empty icon={Bell} title="No follow-ups scheduled" text="Future ANC visits and vaccinations will appear here." />}
  </Section><aside className="reminder-aside"><HeartPulse /><h2>Timely care matters</h2><p>Review overdue items first, contact the household, and update the health record after every follow-up.</p><div><span>Suggested order</span><ol><li>High-risk ANC cases</li><li>Missed vaccinations</li><li>Upcoming routine visits</li></ol></div></aside></div>}</>;
}

function AssistanceForm({ mothers, onClose, onSaved }) {
  const [form, setForm] = useState({ motherId: mothers?.[0]?.id || '', requestType: 'Manual follow-up call', details: '', priority: 'LOW', followUpDate: today() }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api('/assistance', { method: 'POST', body: JSON.stringify(form) }); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="modal-body"><ErrorNote message={error} /><div className="form-grid">
    <Field label="Mother" className="span-2"><select required value={form.motherId} onChange={update('motherId')}><option value="">Select a maternal record</option>{mothers?.map((x) => <option key={x.id} value={x.id}>{x.fullName} · {x.maternalId}</option>)}</select></Field>
    <Field label="Request type"><select value={form.requestType} onChange={update('requestType')}><option>Manual follow-up call</option><option>Home visit</option><option>Referral assistance</option><option>Nutrition counselling</option><option>Transport assistance</option></select></Field><Field label="Priority"><select value={form.priority} onChange={update('priority')}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></Field>
    <Field label="Follow-up date"><input type="date" value={form.followUpDate} onChange={update('followUpDate')} /></Field><Field label="Request details" className="span-2"><textarea required rows="4" value={form.details} onChange={update('details')} /></Field>
  </div></div><FormActions onCancel={onClose} busy={busy} submitLabel="Record request" /></form>;
}

export function Assistance() {
  const [show, setShow] = useState(false); const [actionError, setActionError] = useState(''); const user = useAuth((s) => s.user); const { data, error, loading, reload } = useLoad('/assistance'); const mothers = useLoad('/mothers');
  async function update(id, status) { setActionError(''); try { await api(`/assistance/${id}`, { method: 'PATCH', body: JSON.stringify({ status, ...(status === 'RESOLVED' ? { resolution: 'Follow-up completed.' } : {}) }) }); reload(); } catch (e) { setActionError(e.message); } }
  return <><PageTitle eyebrow="Assistance module" title="Assistance & follow-up" description="Record community requests, manual calls, referrals, and their outcomes." action={canEdit(user) && <button className="button primary" onClick={() => setShow(true)}><Plus size={18} /> New request</button>} /><Section title="Assistance register" note="Track every request through resolution"><ErrorNote message={error || actionError} />{loading ? <Loading /> : <Table emptyTitle="No assistance requests" rows={data} columns={[
    { label: 'Person', render: (row) => <div className="stack"><strong>{row.child?.fullName || row.mother?.fullName}</strong><small>{row.child?.childId || row.mother?.maternalId}</small></div> },
    { label: 'Request', render: (row) => <div className="stack"><strong>{row.requestType}</strong><small className="limit-text">{row.details}</small></div> },
    { label: 'Priority', render: (row) => <Badge>{row.priority}</Badge> },
    { label: 'Follow-up', render: (row) => formatDate(row.followUpDate) },
    { label: 'Status', render: (row) => <Badge>{row.status}</Badge> },
    { label: 'Action', render: (row) => canEdit(user) && row.status !== 'RESOLVED' ? <select className="status-select" value={row.status} onChange={(e) => update(row.id, e.target.value)}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select> : <span className="muted">{row.resolution || '—'}</span> }
  ]} />}</Section>{show && <Modal title="Record assistance request" subtitle="Add a call, visit, referral, or support need" onClose={() => setShow(false)}><AssistanceForm mothers={mothers.data} onClose={() => setShow(false)} onSaved={() => { setShow(false); reload(); }} /></Modal>}</>;
}

const chartColors = ['#0b6b5a', '#2f80ed', '#e2a323', '#d94c4c'];
export function Reports() {
  const { data, error, loading } = useLoad('/reports');
  const riskData = data ? Object.entries(data.maternalRisk).map(([name, value]) => ({ name, value })) : [];
  const vaccineData = data ? Object.entries(data.vaccinationStatus).map(([name, value]) => ({ name, value })) : [];
  function download() {
    const rows = [['Metric','Value'],['Registered mothers',data.totals.mothers],['Registered children',data.totals.children],['ANC visits',data.totals.ancVisits],['Vaccination records',data.totals.vaccinations],...Object.entries(data.vaccinationStatus).map(([k,v]) => [`Vaccinations: ${k}`,v])];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `janani-monthly-report-${today()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <><PageTitle eyebrow="Reports" title="Health service reports" description="Current coverage, care activity, maternal risk, and vaccination outcomes." action={data && <button className="button ghost" onClick={download}><Download size={18} /> Export CSV</button>} /><ErrorNote message={error} />{loading ? <Loading /> : data && <>
    <div className="stat-grid report-stats"><StatCard label="Mothers" value={data.totals.mothers} note="Registered" icon={UserRound} /><StatCard label="Children" value={data.totals.children} note="Registered" icon={Baby} tone="blue" /><StatCard label="ANC visits" value={data.totals.ancVisits} note="All time" icon={Stethoscope} tone="amber" /><StatCard label="Vaccinations" value={data.totals.vaccinations} note="Scheduled doses" icon={Syringe} tone="red" /></div>
    <div className="report-grid"><Section title="Registration & ANC trend" note="Last six months"><div className="chart"><ResponsiveContainer width="100%" height={280}><BarChart data={data.months}><CartesianGrid vertical={false} stroke="#e7ecea" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip /><Legend /><Bar dataKey="mothers" fill="#0b6b5a" radius={[5,5,0,0]} /><Bar dataKey="children" fill="#57a8a0" radius={[5,5,0,0]} /><Bar dataKey="ancVisits" fill="#e2a323" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div></Section>
      <Section title="Vaccination status" note="Distribution of scheduled doses"><div className="chart"><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={vaccineData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>{vaccineData.map((x,i) => <Cell key={x.name} fill={chartColors[i % chartColors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></Section>
    </div><Section title="Maternal risk overview" note="Cases grouped by current risk level"><div className="risk-bars">{riskData.map((item, index) => <div key={item.name}><span>{item.name.toLowerCase()} risk</span><div><i style={{ width: `${Math.max(8, item.value / Math.max(1, data.totals.mothers) * 100)}%`, background: chartColors[index] }} /></div><strong>{item.value}</strong></div>)}</div></Section>
  </>}</>;
}

function UserForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'HEALTHCARE_WORKER' }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api('/users', { method: 'POST', body: JSON.stringify(form) }); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="modal-body"><ErrorNote message={error} /><div className="form-grid one-col"><Field label="Full name"><input required value={form.name} onChange={update('name')} /></Field><Field label="Email"><input required type="email" value={form.email} onChange={update('email')} /></Field><Field label="Temporary password" hint="Use at least 8 characters."><input required minLength="8" type="password" value={form.password} onChange={update('password')} /></Field><Field label="Role"><select value={form.role} onChange={update('role')}><option value="HEALTHCARE_WORKER">Healthcare worker</option><option value="SUPERVISOR">Health post supervisor</option><option value="ADMIN">System administrator</option></select></Field></div></div><FormActions onCancel={onClose} busy={busy} submitLabel="Create user" /></form>;
}

export function Users() {
  const [show, setShow] = useState(false); const [actionError, setActionError] = useState(''); const { data, error, loading, reload } = useLoad('/users'); const current = useAuth((s) => s.user);
  async function toggle(row) { setActionError(''); try { await api(`/users/${row.id}`, { method: 'PATCH', body: JSON.stringify({ active: !row.active }) }); reload(); } catch (e) { setActionError(e.message); } }
  return <><PageTitle eyebrow="Administration" title="Users & access" description="Manage healthcare workers, supervisors, and system administrators." action={<button className="button primary" onClick={() => setShow(true)}><UserPlus size={18} /> Add user</button>} /><Section title="System users" note={`${data?.length || 0} accounts`}><ErrorNote message={error || actionError} />{loading ? <Loading /> : <Table emptyTitle="No users" rows={data} columns={[
    { label: 'User', render: (row) => <div className="person-cell"><span>{row.name.split(' ').map((x) => x[0]).slice(0,2).join('')}</span><div><strong>{row.name}</strong><small>{row.email}</small></div></div> },
    { label: 'Role', render: (row) => <Badge tone="neutral">{humanRole(row.role)}</Badge> },
    { label: 'Created', render: (row) => formatDate(row.createdAt) },
    { label: 'Status', render: (row) => <Badge tone={row.active ? 'completed' : 'missed'}>{row.active ? 'Active' : 'Inactive'}</Badge> },
    { label: 'Access', render: (row) => <button disabled={row.id === current.id} className="mini-button" onClick={() => toggle(row)}>{row.active ? 'Deactivate' : 'Activate'}</button> }
  ]} />}</Section>{show && <Modal title="Create user account" subtitle="Assign access based on the person’s responsibilities" onClose={() => setShow(false)}><UserForm onClose={() => setShow(false)} onSaved={() => { setShow(false); reload(); }} /></Modal>}</>;
}
