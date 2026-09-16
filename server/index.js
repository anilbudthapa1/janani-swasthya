import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'development-only-secret';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const toDate = (value) => value ? new Date(value) : null;
const numberOrNull = (value) => value === '' || value == null ? null : Number(value);
const requireFields = (body, fields) => fields.filter((field) => !String(body[field] ?? '').trim());

function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: 'Your session is invalid or expired.' });
  }
}

const allow = (...roles) => (req, res, next) => roles.includes(req.user.role)
  ? next()
  : res.status(403).json({ message: 'You do not have permission for this action.' });

async function nextReference(model, prefix) {
  const count = await prisma[model].count();
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'janani-swasthya' }));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: String(email || '').toLowerCase() } });
  if (!user || !user.active || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  const profile = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(profile, jwtSecret, { expiresIn: '8h' });
  res.json({ token, user: profile });
}));

app.get('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!user?.active) return res.status(401).json({ message: 'Account is inactive.' });
  res.json(user);
}));

app.get('/api/dashboard', auth, asyncRoute(async (req, res) => {
  const now = new Date();
  const inSevenDays = new Date(Date.now() + 7 * 86400000);
  const [mothers, children, highRisk, pendingFollowUps, dueVaccines, missedVaccines, assistance, recentMothers] = await Promise.all([
    prisma.mother.count(),
    prisma.child.count(),
    prisma.mother.count({ where: { riskLevel: 'HIGH' } }),
    prisma.ancVisit.count({ where: { nextVisitDate: { lte: inSevenDays } } }),
    prisma.vaccination.count({ where: { status: 'DUE', scheduledDate: { lte: inSevenDays } } }),
    prisma.vaccination.count({ where: { OR: [{ status: 'MISSED' }, { status: 'DUE', scheduledDate: { lt: now } }] } }),
    prisma.assistance.count({ where: { status: { not: 'RESOLVED' } } }),
    prisma.mother.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { assignedWorker: { select: { name: true } }, _count: { select: { children: true, ancVisits: true } } } })
  ]);
  res.json({ summary: { mothers, children, highRisk, pendingFollowUps, dueVaccines, missedVaccines, assistance }, recentMothers });
}));

app.get('/api/mothers', auth, asyncRoute(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const where = search ? { OR: [
    { fullName: { contains: search, mode: 'insensitive' } },
    { maternalId: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search } }
  ] } : {};
  const mothers = await prisma.mother.findMany({
    where, orderBy: { createdAt: 'desc' },
    include: { assignedWorker: { select: { name: true } }, _count: { select: { children: true, ancVisits: true } }, ancVisits: { take: 1, orderBy: { visitDate: 'desc' } } }
  });
  res.json(mothers);
}));

app.post('/api/mothers', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const missing = requireFields(req.body, ['fullName', 'phone', 'address']);
  if (missing.length) return res.status(400).json({ message: `Required: ${missing.join(', ')}` });
  const mother = await prisma.mother.create({ data: {
    maternalId: await nextReference('mother', 'MAT'),
    fullName: req.body.fullName.trim(), dateOfBirth: toDate(req.body.dateOfBirth), phone: req.body.phone.trim(),
    email: req.body.email?.trim() || null, address: req.body.address.trim(), ward: req.body.ward?.trim() || null,
    bloodGroup: req.body.bloodGroup || null, pregnancyStatus: req.body.pregnancyStatus || 'Pregnant',
    lastMenstrualDate: toDate(req.body.lastMenstrualDate), expectedDueDate: toDate(req.body.expectedDueDate),
    riskLevel: req.body.riskLevel || 'LOW', riskNotes: req.body.riskNotes?.trim() || null,
    assignedWorkerId: req.body.assignedWorkerId || (req.user.role === 'HEALTHCARE_WORKER' ? req.user.id : null)
  }});
  res.status(201).json(mother);
}));

app.get('/api/mothers/:id', auth, asyncRoute(async (req, res) => {
  const mother = await prisma.mother.findUnique({ where: { id: req.params.id }, include: {
    assignedWorker: { select: { id: true, name: true } }, children: { include: { _count: { select: { vaccinations: true, growthRecords: true } } } },
    ancVisits: { orderBy: { visitDate: 'desc' }, include: { createdBy: { select: { name: true } } } },
    assistance: { orderBy: { createdAt: 'desc' } }
  }});
  if (!mother) return res.status(404).json({ message: 'Mother record not found.' });
  res.json(mother);
}));

app.put('/api/mothers/:id', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const fields = ['fullName', 'phone', 'email', 'address', 'ward', 'bloodGroup', 'pregnancyStatus', 'riskLevel', 'riskNotes', 'assignedWorkerId'];
  const data = Object.fromEntries(fields.filter((key) => key in req.body).map((key) => [key, req.body[key] || null]));
  for (const key of ['dateOfBirth', 'lastMenstrualDate', 'expectedDueDate']) if (key in req.body) data[key] = toDate(req.body[key]);
  res.json(await prisma.mother.update({ where: { id: req.params.id }, data }));
}));

app.get('/api/children', auth, asyncRoute(async (req, res) => {
  const children = await prisma.child.findMany({ orderBy: { createdAt: 'desc' }, include: {
    mother: { select: { id: true, fullName: true, maternalId: true, phone: true } },
    vaccinations: { orderBy: { scheduledDate: 'asc' } }, growthRecords: { take: 1, orderBy: { recordedAt: 'desc' } }
  }});
  res.json(children);
}));

app.get('/api/children/:id', auth, asyncRoute(async (req, res) => {
  const child = await prisma.child.findUnique({ where: { id: req.params.id }, include: {
    mother: { select: { id: true, fullName: true, maternalId: true, phone: true, address: true } },
    growthRecords: { orderBy: { recordedAt: 'desc' } },
    vaccinations: { orderBy: { scheduledDate: 'asc' } },
    assistance: { orderBy: { createdAt: 'desc' } }
  }});
  if (!child) return res.status(404).json({ message: 'Child record not found.' });
  res.json(child);
}));

app.post('/api/children', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const missing = requireFields(req.body, ['motherId', 'fullName', 'dateOfBirth', 'sex']);
  if (missing.length) return res.status(400).json({ message: `Required: ${missing.join(', ')}` });
  const child = await prisma.child.create({ data: {
    childId: await nextReference('child', 'CHD'), motherId: req.body.motherId, fullName: req.body.fullName.trim(),
    dateOfBirth: toDate(req.body.dateOfBirth), sex: req.body.sex, birthWeightKg: numberOrNull(req.body.birthWeightKg),
    bloodGroup: req.body.bloodGroup || null, notes: req.body.notes?.trim() || null
  }});
  res.status(201).json(child);
}));

app.put('/api/children/:id', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const data = {};
  for (const key of ['fullName', 'sex', 'bloodGroup', 'notes']) if (key in req.body) data[key] = req.body[key] || null;
  if ('dateOfBirth' in req.body) data.dateOfBirth = toDate(req.body.dateOfBirth);
  if ('birthWeightKg' in req.body) data.birthWeightKg = numberOrNull(req.body.birthWeightKg);
  res.json(await prisma.child.update({ where: { id: req.params.id }, data }));
}));

app.post('/api/anc-visits', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const missing = requireFields(req.body, ['motherId', 'visitDate']);
  if (missing.length) return res.status(400).json({ message: `Required: ${missing.join(', ')}` });
  const visit = await prisma.ancVisit.create({ data: {
    motherId: req.body.motherId, visitDate: toDate(req.body.visitDate), gestationalWeeks: numberOrNull(req.body.gestationalWeeks),
    systolic: numberOrNull(req.body.systolic), diastolic: numberOrNull(req.body.diastolic), weightKg: numberOrNull(req.body.weightKg),
    hemoglobin: numberOrNull(req.body.hemoglobin), notes: req.body.notes?.trim() || null, nextVisitDate: toDate(req.body.nextVisitDate),
    riskFlag: Boolean(req.body.riskFlag), createdById: req.user.id
  }});
  if (req.body.riskFlag) await prisma.mother.update({ where: { id: req.body.motherId }, data: { riskLevel: 'HIGH' } });
  res.status(201).json(visit);
}));

app.post('/api/growth-records', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const missing = requireFields(req.body, ['childId', 'recordedAt', 'weightKg']);
  if (missing.length) return res.status(400).json({ message: `Required: ${missing.join(', ')}` });
  const record = await prisma.growthRecord.create({ data: {
    childId: req.body.childId, recordedAt: toDate(req.body.recordedAt), weightKg: Number(req.body.weightKg),
    heightCm: numberOrNull(req.body.heightCm), headCm: numberOrNull(req.body.headCm), nutrition: req.body.nutrition?.trim() || null, notes: req.body.notes?.trim() || null
  }});
  res.status(201).json(record);
}));

app.get('/api/vaccinations', auth, asyncRoute(async (req, res) => {
  await prisma.vaccination.updateMany({ where: { status: 'DUE', scheduledDate: { lt: new Date(new Date().toDateString()) } }, data: { status: 'MISSED' } });
  const where = req.query.status ? { status: req.query.status } : {};
  res.json(await prisma.vaccination.findMany({ where, orderBy: { scheduledDate: 'asc' }, include: { child: { include: { mother: { select: { fullName: true, phone: true } } } } } }));
}));

app.post('/api/vaccinations', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const missing = requireFields(req.body, ['childId', 'vaccineName', 'dose', 'scheduledDate']);
  if (missing.length) return res.status(400).json({ message: `Required: ${missing.join(', ')}` });
  const vaccination = await prisma.vaccination.create({ data: {
    childId: req.body.childId, vaccineName: req.body.vaccineName.trim(), dose: req.body.dose.trim(), scheduledDate: toDate(req.body.scheduledDate),
    status: req.body.status || 'DUE', notes: req.body.notes?.trim() || null, createdById: req.user.id
  }});
  res.status(201).json(vaccination);
}));

app.patch('/api/vaccinations/:id', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const data = {};
  for (const key of ['status', 'batchNumber', 'notes']) if (key in req.body) data[key] = req.body[key] || null;
  if ('administeredDate' in req.body) data.administeredDate = toDate(req.body.administeredDate);
  if (data.status === 'COMPLETED' && !data.administeredDate) data.administeredDate = new Date();
  res.json(await prisma.vaccination.update({ where: { id: req.params.id }, data }));
}));

app.get('/api/reminders', auth, asyncRoute(async (req, res) => {
  const [anc, vaccinations, assistance] = await Promise.all([
    prisma.ancVisit.findMany({ where: { nextVisitDate: { not: null } }, orderBy: { nextVisitDate: 'asc' }, include: { mother: { select: { id: true, maternalId: true, fullName: true, phone: true, riskLevel: true } } } }),
    prisma.vaccination.findMany({ where: { status: { not: 'COMPLETED' } }, orderBy: { scheduledDate: 'asc' }, include: { child: { include: { mother: { select: { fullName: true, phone: true } } } } } }),
    prisma.assistance.findMany({ where: { status: { not: 'RESOLVED' }, followUpDate: { not: null } }, orderBy: { followUpDate: 'asc' }, include: { mother: { select: { fullName: true, phone: true } }, child: { select: { fullName: true } } } })
  ]);
  res.json({ anc, vaccinations, assistance });
}));

app.get('/api/assistance', auth, asyncRoute(async (req, res) => {
  res.json(await prisma.assistance.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], include: {
    mother: { select: { fullName: true, maternalId: true, phone: true } }, child: { select: { fullName: true, childId: true } }, createdBy: { select: { name: true } }
  }}));
}));

app.post('/api/assistance', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const missing = requireFields(req.body, ['requestType', 'details']);
  if (missing.length || (!req.body.motherId && !req.body.childId)) return res.status(400).json({ message: 'Request type, details, and a mother or child are required.' });
  res.status(201).json(await prisma.assistance.create({ data: {
    motherId: req.body.motherId || null, childId: req.body.childId || null, requestType: req.body.requestType.trim(), details: req.body.details.trim(),
    priority: req.body.priority || 'LOW', followUpDate: toDate(req.body.followUpDate), createdById: req.user.id
  }}));
}));

app.patch('/api/assistance/:id', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  const data = {};
  for (const key of ['status', 'resolution', 'priority']) if (key in req.body) data[key] = req.body[key] || null;
  if ('followUpDate' in req.body) data.followUpDate = toDate(req.body.followUpDate);
  res.json(await prisma.assistance.update({ where: { id: req.params.id }, data }));
}));

app.get('/api/reports', auth, asyncRoute(async (req, res) => {
  const [mothers, children, vaccinations, ancVisits, assistance] = await Promise.all([
    prisma.mother.findMany({ select: { riskLevel: true, pregnancyStatus: true, createdAt: true } }),
    prisma.child.findMany({ select: { sex: true, createdAt: true } }),
    prisma.vaccination.findMany({ select: { status: true, vaccineName: true, scheduledDate: true } }),
    prisma.ancVisit.findMany({ select: { visitDate: true, riskFlag: true } }),
    prisma.assistance.findMany({ select: { status: true, priority: true } })
  ]);
  const countBy = (items, key) => items.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] || 0) + 1 }), {});
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const within = (value) => { const d = new Date(value); return `${d.getFullYear()}-${d.getMonth()}` === key; };
    return { month: date.toLocaleString('en', { month: 'short' }), mothers: mothers.filter((x) => within(x.createdAt)).length, children: children.filter((x) => within(x.createdAt)).length, ancVisits: ancVisits.filter((x) => within(x.visitDate)).length };
  });
  res.json({ totals: { mothers: mothers.length, children: children.length, vaccinations: vaccinations.length, ancVisits: ancVisits.length }, maternalRisk: countBy(mothers, 'riskLevel'), pregnancyStatus: countBy(mothers, 'pregnancyStatus'), childSex: countBy(children, 'sex'), vaccinationStatus: countBy(vaccinations, 'status'), assistanceStatus: countBy(assistance, 'status'), months });
}));

app.get('/api/users', auth, allow('ADMIN'), asyncRoute(async (req, res) => {
  res.json(await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } }));
}));

app.post('/api/users', auth, allow('ADMIN'), asyncRoute(async (req, res) => {
  const missing = requireFields(req.body, ['name', 'email', 'password', 'role']);
  if (missing.length) return res.status(400).json({ message: `Required: ${missing.join(', ')}` });
  const user = await prisma.user.create({ data: { name: req.body.name.trim(), email: req.body.email.toLowerCase().trim(), passwordHash: await bcrypt.hash(req.body.password, 12), role: req.body.role }, select: { id: true, name: true, email: true, role: true, active: true } });
  res.status(201).json(user);
}));

app.patch('/api/users/:id', auth, allow('ADMIN'), asyncRoute(async (req, res) => {
  const data = {};
  for (const key of ['name', 'role', 'active']) if (key in req.body) data[key] = req.body[key];
  if (req.body.password) data.passwordHash = await bcrypt.hash(req.body.password, 12);
  res.json(await prisma.user.update({ where: { id: req.params.id }, data, select: { id: true, name: true, email: true, role: true, active: true } }));
}));

app.post('/api/reminders/email', auth, allow('HEALTHCARE_WORKER', 'ADMIN'), asyncRoute(async (req, res) => {
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ message: 'Email delivery is not configured. Add RESEND_API_KEY.' });
  const missing = requireFields(req.body, ['to', 'subject', 'message']);
  if (missing.length) return res.status(400).json({ message: `Required: ${missing.join(', ')}` });
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [req.body.to], subject: req.body.subject, text: req.body.message }) });
  if (!response.ok) return res.status(502).json({ message: 'Email provider rejected the request.' });
  res.json({ message: 'Reminder sent.' });
}));

const webDist = path.resolve(__dirname, '../web/dist');
app.use(express.static(webDist));
app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(webDist, 'index.html'), (error) => error && next()));

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (error.code === 'P2002') return res.status(409).json({ message: 'A record with this value already exists.' });
  if (error.code === 'P2025') return res.status(404).json({ message: 'Record not found.' });
  res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : error.message });
});

const server = app.listen(port, () => console.log(`Janani Swasthya running on http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { server.close(); await prisma.$disconnect(); process.exit(0); });
