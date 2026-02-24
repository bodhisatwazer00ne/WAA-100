import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const csDept = await prisma.department.create({
    data: {
      name: 'Computer Science & Engineering',
      code: 'CSE',
    },
  });

  const hodUser = await prisma.user.create({
    data: {
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh@university.edu',
      passwordHash,
      role: Role.hod,
      departmentId: csDept.id,
    },
  });

  await prisma.department.update({
    where: { id: csDept.id },
    data: { hodId: hodUser.id },
  });

  const classTeacherUser = await prisma.user.create({
    data: {
      name: 'Anita Sharma',
      email: 'anita@university.edu',
      passwordHash,
      role: Role.class_teacher,
      departmentId: csDept.id,
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      name: 'Priya Verma',
      email: 'priya@university.edu',
      passwordHash,
      role: Role.teacher,
      departmentId: csDept.id,
    },
  });

  const teacher = await prisma.teacher.create({
    data: {
      userId: teacherUser.id,
      departmentId: csDept.id,
    },
  });

  const cls = await prisma.class.create({
    data: {
      name: 'CSE-A (Sem 5)',
      semester: 5,
      departmentId: csDept.id,
      classTeacherId: classTeacherUser.id,
    },
  });

  const subj1 = await prisma.subject.create({
    data: {
      code: 'CSE501',
      name: 'Operating Systems',
      semester: 5,
      departmentId: csDept.id,
    },
  });

  const subj2 = await prisma.subject.create({
    data: {
      code: 'CSE502',
      name: 'Database Systems',
      semester: 5,
      departmentId: csDept.id,
    },
  });

  await prisma.teacherClassSubject.createMany({
    data: [
      { teacherId: teacher.id, classId: cls.id, subjectId: subj1.id },
      { teacherId: teacher.id, classId: cls.id, subjectId: subj2.id },
    ],
  });

  for (let i = 1; i <= 30; i++) {
    const studentUser = await prisma.user.create({
      data: {
        name: `Student ${i}`,
        email: `student${i}@student.edu`,
        passwordHash,
        role: Role.student,
        departmentId: csDept.id,
      },
    });
    await prisma.student.create({
      data: {
        userId: studentUser.id,
        departmentId: csDept.id,
        classId: cls.id,
        rollNumber: `CSE${String(i).padStart(3, '0')}`,
      },
    });
  }

  console.log('Seed data created');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

