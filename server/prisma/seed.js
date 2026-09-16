import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const daysFromNow = (days) => new Date(Date.now() + days * 86400000);

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const [admin, worker] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@janani.gov.np' },
      update: {},
      create: { name: 'System Administrator', email: 'admin@janani.gov.np', passwordHash, role: 'ADMIN' }
    }),
    prisma.user.upsert({
      where: { email: 'worker@janani.gov.np' },
      update: {},
      create: { name: 'Sita Chaudhary', email: 'worker@janani.gov.np', passwordHash, role: 'HEALTHCARE_WORKER' }
    })
  ]);
  await prisma.user.upsert({
    where: { email: 'supervisor@janani.gov.np' },
    update: {},
    create: { name: 'Health Post Supervisor', email: 'supervisor@janani.gov.np', passwordHash, role: 'SUPERVISOR' }
  });

  if (await prisma.mother.count()) return;

  await prisma.mother.create({
    data: {
      maternalId: 'MAT-2026-0001',
      fullName: 'Maya Tharu',
      dateOfBirth: new Date('1998-04-12'),
      phone: '9800000001',
      address: 'Biratnagar, Morang',
      ward: 'Ward 4',
      bloodGroup: 'B+',
      expectedDueDate: daysFromNow(68),
      lastMenstrualDate: daysFromNow(-212),
      riskLevel: 'LOW',
      assignedWorkerId: worker.id,
      ancVisits: {
        create: [{
          visitDate: daysFromNow(-18), gestationalWeeks: 27, systolic: 112, diastolic: 72,
          weightKg: 58.4, hemoglobin: 11.2, nextVisitDate: daysFromNow(3),
          notes: 'Routine check completed. Iron and folic acid counselling provided.', createdById: worker.id
        }]
      }
    }
  });

  await prisma.mother.create({
    data: {
      maternalId: 'MAT-2026-0002',
      fullName: 'Asha Rai',
      dateOfBirth: new Date('1994-11-03'),
      phone: '9800000002',
      email: 'asha@example.com',
      address: 'Itahari, Sunsari',
      ward: 'Ward 8',
      bloodGroup: 'O+',
      pregnancyStatus: 'Postnatal',
      riskLevel: 'HIGH',
      riskNotes: 'Previous high blood pressure; monitor during follow-up.',
      assignedWorkerId: worker.id,
      children: {
        create: [{
          childId: 'CHD-2026-0001', fullName: 'Aarav Rai', dateOfBirth: daysFromNow(-94),
          sex: 'MALE', birthWeightKg: 3.1,
          growthRecords: { create: [{ recordedAt: daysFromNow(-5), weightKg: 5.6, heightCm: 59, nutrition: 'Exclusive breastfeeding' }] },
          vaccinations: {
            create: [
              { vaccineName: 'BCG', dose: 'Birth dose', scheduledDate: daysFromNow(-90), administeredDate: daysFromNow(-88), status: 'COMPLETED', batchNumber: 'BCG-2611', createdById: worker.id },
              { vaccineName: 'Pentavalent', dose: 'Dose 2', scheduledDate: daysFromNow(-4), status: 'MISSED', createdById: worker.id },
              { vaccineName: 'OPV', dose: 'Dose 3', scheduledDate: daysFromNow(8), status: 'DUE', createdById: worker.id }
            ]
          }
        }]
      },
      assistance: {
        create: [{
          requestType: 'Manual follow-up call', details: 'Confirm missed Pentavalent vaccination and arrange visit.',
          priority: 'HIGH', status: 'OPEN', followUpDate: daysFromNow(1), createdById: admin.id
        }]
      }
    }
  });
}

main()
  .then(() => console.log('Database seeded.'))
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => prisma.$disconnect());
