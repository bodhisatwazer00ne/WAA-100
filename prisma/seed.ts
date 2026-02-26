import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type TeacherSeed = {
  name: string;
  email: string;
  password: string;
};

type StudentSeed = {
  name: string;
  email: string;
  password: string;
  className: string;
  rollNumber: string;
};

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function createUser(
  name: string,
  email: string,
  password: string,
  role: Role,
  departmentId: string,
) {
  return prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
      role,
      departmentId,
    },
  });
}

async function main() {
  // Full reseed order.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.analyticsCache.deleteMany();
  await prisma.mergedClassReport.deleteMany();
  await prisma.teacherClassSubject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const department = await prisma.department.create({
    data: {
      name: 'Computer Science & Engineering',
      code: 'CSE',
    },
  });

  const hod = await createUser(
    'Rahul Gaikwad',
    'rahul.gaikwad@university.edu',
    'rahul123',
    Role.hod,
    department.id,
  );

  await prisma.department.update({
    where: { id: department.id },
    data: { hodId: hod.id },
  });

  const teacherSeeds: TeacherSeed[] = [
    { name: 'Prakash Mali', email: 'prakash.mali@university.edu', password: 'prakash123' },
    { name: 'Preeti Raut', email: 'preeti.raut@university.edu', password: 'preeti123' },
    { name: 'Vijay Mane', email: 'vijay.mane@university.edu', password: 'vijay123' },
    { name: 'Sonali Bansode', email: 'sonali.bansode@university.edu', password: 'sonali123' },
    { name: 'Vijay Pawar', email: 'vijay.pawar@university.edu', password: 'vijay123' },
  ];

  const teacherUsersByEmail = new Map<string, { id: string; name: string }>();
  const teacherProfilesByEmail = new Map<string, { id: string }>();

  for (const teacherSeed of teacherSeeds) {
    const user = await createUser(
      teacherSeed.name,
      teacherSeed.email,
      teacherSeed.password,
      Role.teacher,
      department.id,
    );
    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        departmentId: department.id,
      },
    });
    teacherUsersByEmail.set(teacherSeed.email, { id: user.id, name: user.name });
    teacherProfilesByEmail.set(teacherSeed.email, { id: teacher.id });
  }

  const classSeeds = [
    { name: 'SYCSE A', semester: 6, classTeacherEmail: 'preeti.raut@university.edu' },
    { name: 'SYCSE B', semester: 6, classTeacherEmail: 'sonali.bansode@university.edu' },
    { name: 'TYCSE A', semester: 7, classTeacherEmail: 'prakash.mali@university.edu' },
    { name: 'TYCSE B', semester: 7, classTeacherEmail: 'vijay.mane@university.edu' },
  ] as const;

  const classesByName = new Map<string, { id: string }>();
  for (const classSeed of classSeeds) {
    const classTeacher = teacherUsersByEmail.get(classSeed.classTeacherEmail);
    const classRow = await prisma.class.create({
      data: {
        name: classSeed.name,
        semester: classSeed.semester,
        departmentId: department.id,
        classTeacherId: classTeacher?.id,
      },
    });
    classesByName.set(classSeed.name, { id: classRow.id });
  }

  const subjectSeeds = [
    { code: 'OS', name: 'Operating Systems', semester: 7 },
    { code: 'DSA', name: 'Data Structure and Algorithms', semester: 6 },
    { code: 'PE', name: 'Professional Ethics', semester: 6 },
    { code: 'IOT', name: 'Internet of Things', semester: 7 },
    { code: 'ECE', name: 'Electronics', semester: 6 },
    { code: 'BDA', name: 'Big Data Analytics', semester: 7 },
    { code: 'DM', name: 'Digital Marketing', semester: 6 },
    { code: 'CN', name: 'Computer Networks', semester: 7 },
  ] as const;

  const subjectsByCode = new Map<string, { id: string }>();
  for (const subjectSeed of subjectSeeds) {
    const subject = await prisma.subject.create({
      data: {
        code: subjectSeed.code,
        name: subjectSeed.name,
        semester: subjectSeed.semester,
        departmentId: department.id,
      },
    });
    subjectsByCode.set(subject.code, { id: subject.id });
  }

  const mappingSeeds = [
    { teacherEmail: 'prakash.mali@university.edu', subjectCode: 'OS', className: 'TYCSE A' },
    { teacherEmail: 'prakash.mali@university.edu', subjectCode: 'OS', className: 'TYCSE B' },
    { teacherEmail: 'prakash.mali@university.edu', subjectCode: 'DSA', className: 'SYCSE B' },
    { teacherEmail: 'preeti.raut@university.edu', subjectCode: 'DSA', className: 'SYCSE A' },
    { teacherEmail: 'preeti.raut@university.edu', subjectCode: 'PE', className: 'SYCSE A' },
    { teacherEmail: 'preeti.raut@university.edu', subjectCode: 'PE', className: 'SYCSE B' },
    { teacherEmail: 'vijay.mane@university.edu', subjectCode: 'IOT', className: 'TYCSE A' },
    { teacherEmail: 'vijay.mane@university.edu', subjectCode: 'IOT', className: 'TYCSE B' },
    { teacherEmail: 'vijay.mane@university.edu', subjectCode: 'ECE', className: 'SYCSE A' },
    { teacherEmail: 'vijay.mane@university.edu', subjectCode: 'ECE', className: 'SYCSE B' },
    { teacherEmail: 'vijay.mane@university.edu', subjectCode: 'BDA', className: 'TYCSE A' },
    { teacherEmail: 'sonali.bansode@university.edu', subjectCode: 'DM', className: 'SYCSE A' },
    { teacherEmail: 'sonali.bansode@university.edu', subjectCode: 'DM', className: 'SYCSE B' },
    { teacherEmail: 'sonali.bansode@university.edu', subjectCode: 'BDA', className: 'TYCSE B' },
    { teacherEmail: 'vijay.pawar@university.edu', subjectCode: 'CN', className: 'TYCSE A' },
    { teacherEmail: 'vijay.pawar@university.edu', subjectCode: 'CN', className: 'TYCSE B' },
  ] as const;

  for (const mappingSeed of mappingSeeds) {
    const teacher = teacherProfilesByEmail.get(mappingSeed.teacherEmail);
    const subject = subjectsByCode.get(mappingSeed.subjectCode);
    const classRow = classesByName.get(mappingSeed.className);
    if (!teacher || !subject || !classRow) continue;
    await prisma.teacherClassSubject.create({
      data: {
        teacherId: teacher.id,
        subjectId: subject.id,
        classId: classRow.id,
      },
    });
  }

  const studentSeeds: StudentSeed[] = [
    { name: 'Harry James Potter', email: 'harry.potter@student.edu', password: 'harry123', className: 'SYCSE A', rollNumber: 'SYA001' },
    { name: 'Hermione Jean Granger', email: 'hermione.granger@student.edu', password: 'hermione123', className: 'SYCSE A', rollNumber: 'SYA002' },
    { name: 'Ronald Bilius Weasley', email: 'ronald.weasley@student.edu', password: 'ronald123', className: 'SYCSE A', rollNumber: 'SYA003' },
    { name: 'Albus Percival Wulfric Brian Dumbledore', email: 'albus.dumbledore@student.edu', password: 'albus123', className: 'SYCSE A', rollNumber: 'SYA004' },
    { name: 'Tom Marvolo Riddle', email: 'tom.riddle@student.edu', password: 'tom123', className: 'SYCSE A', rollNumber: 'SYA005' },
    { name: 'Frodo Baggins', email: 'frodo.baggins@student.edu', password: 'frodo123', className: 'SYCSE A', rollNumber: 'SYA006' },
    { name: 'Aragorn II Elessar', email: 'aragorn.elessar@student.edu', password: 'aragorn123', className: 'SYCSE A', rollNumber: 'SYA007' },
    { name: 'Bilbo Baggins', email: 'bilbo.baggins@student.edu', password: 'bilbo123', className: 'SYCSE A', rollNumber: 'SYA008' },
    { name: 'Samwise Gamgee', email: 'samwise.gamgee@student.edu', password: 'samwise123', className: 'SYCSE A', rollNumber: 'SYA009' },
    { name: 'Peregrin Took', email: 'peregrin.took@student.edu', password: 'peregrin123', className: 'SYCSE A', rollNumber: 'SYA010' },

    { name: 'Percy Jackson', email: 'percy.jackson@student.edu', password: 'percy123', className: 'SYCSE B', rollNumber: 'SYB001' },
    { name: 'Annabeth Chase', email: 'annabeth.chase@student.edu', password: 'annabeth123', className: 'SYCSE B', rollNumber: 'SYB002' },
    { name: 'Katniss Everdeen', email: 'katniss.everdeen@student.edu', password: 'katniss123', className: 'SYCSE B', rollNumber: 'SYB003' },
    { name: 'Peeta Mellark', email: 'peeta.mellark@student.edu', password: 'peeta123', className: 'SYCSE B', rollNumber: 'SYB004' },
    { name: 'Tris Prior', email: 'tris.prior@student.edu', password: 'tris123', className: 'SYCSE B', rollNumber: 'SYB005' },
    { name: 'Bruce Wayne', email: 'bruce.wayne@student.edu', password: 'bruce123', className: 'SYCSE B', rollNumber: 'SYB006' },
    { name: 'Clark Joseph Kent', email: 'clark.kent@student.edu', password: 'clark123', className: 'SYCSE B', rollNumber: 'SYB007' },
    { name: 'Diana Prince', email: 'diana.prince@student.edu', password: 'diana123', className: 'SYCSE B', rollNumber: 'SYB008' },
    { name: 'Peter Benjamin Parker', email: 'peter.parker@student.edu', password: 'peter123', className: 'SYCSE B', rollNumber: 'SYB009' },
    { name: 'Anthony Edward Stark', email: 'anthony.stark@student.edu', password: 'anthony123', className: 'SYCSE B', rollNumber: 'SYB010' },

    { name: 'Steven Grant Rogers', email: 'steven.rogers@student.edu', password: 'steven123', className: 'TYCSE A', rollNumber: 'TYA001' },
    { name: 'Natasha Alianovna Romanoff', email: 'natasha.romanoff@student.edu', password: 'natasha123', className: 'TYCSE A', rollNumber: 'TYA002' },
    { name: 'James Buchanan Barnes', email: 'james.barnes@student.edu', password: 'james123', className: 'TYCSE A', rollNumber: 'TYA003' },
    { name: 'Thor Odinson', email: 'thor.odinson@student.edu', password: 'thor123', className: 'TYCSE A', rollNumber: 'TYA004' },
    { name: 'T Challa', email: 't.challa@student.edu', password: 't123', className: 'TYCSE A', rollNumber: 'TYA005' },
    { name: 'Sherlock Holmes', email: 'sherlock.holmes@student.edu', password: 'sherlock123', className: 'TYCSE A', rollNumber: 'TYA006' },
    { name: 'John H Watson', email: 'john.watson@student.edu', password: 'john123', className: 'TYCSE A', rollNumber: 'TYA007' },
    { name: 'James Tiberius Kirk', email: 'james.kirk@student.edu', password: 'james123', className: 'TYCSE A', rollNumber: 'TYA008' },
    { name: 'Jean Luc Picard', email: 'jean.picard@student.edu', password: 'jean123', className: 'TYCSE A', rollNumber: 'TYA009' },
    { name: 'Leia Organa', email: 'leia.organa@student.edu', password: 'leia123', className: 'TYCSE A', rollNumber: 'TYA010' },

    { name: 'Luke Skywalker', email: 'luke.skywalker@student.edu', password: 'luke123', className: 'TYCSE B', rollNumber: 'TYB001' },
    { name: 'Anakin Skywalker', email: 'anakin.skywalker@student.edu', password: 'anakin123', className: 'TYCSE B', rollNumber: 'TYB002' },
    { name: 'Ben Solo', email: 'ben.solo@student.edu', password: 'ben123', className: 'TYCSE B', rollNumber: 'TYB003' },
    { name: 'Tony Montana', email: 'tony.montana@student.edu', password: 'tony123', className: 'TYCSE B', rollNumber: 'TYB004' },
    { name: 'Michael Corleone', email: 'michael.corleone@student.edu', password: 'michael123', className: 'TYCSE B', rollNumber: 'TYB005' },
    { name: 'Jay Gatsby', email: 'jay.gatsby@student.edu', password: 'jay123', className: 'TYCSE B', rollNumber: 'TYB006' },
    { name: 'Atticus Finch', email: 'atticus.finch@student.edu', password: 'atticus123', className: 'TYCSE B', rollNumber: 'TYB007' },
    { name: 'Holden Caulfield', email: 'holden.caulfield@student.edu', password: 'holden123', className: 'TYCSE B', rollNumber: 'TYB008' },
    { name: 'Elizabeth Bennet', email: 'elizabeth.bennet@student.edu', password: 'elizabeth123', className: 'TYCSE B', rollNumber: 'TYB009' },
    { name: 'Fitzwilliam Darcy', email: 'fitzwilliam.darcy@student.edu', password: 'fitzwilliam123', className: 'TYCSE B', rollNumber: 'TYB010' },
  ];

  for (const studentSeed of studentSeeds) {
    const classRow = classesByName.get(studentSeed.className);
    if (!classRow) continue;
    const user = await createUser(
      studentSeed.name,
      studentSeed.email,
      studentSeed.password,
      Role.student,
      department.id,
    );
    await prisma.student.create({
      data: {
        userId: user.id,
        departmentId: department.id,
        classId: classRow.id,
        rollNumber: studentSeed.rollNumber,
      },
    });
  }

  console.log('Seed data created for WAA-100 custom dataset.');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
