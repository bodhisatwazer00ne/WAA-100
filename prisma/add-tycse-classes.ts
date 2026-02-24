import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function toEmail(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '')}@student.edu`;
}

async function main() {
  const dept = await prisma.department.findUnique({ where: { code: 'CSE' } });
  if (!dept) throw new Error('Department CSE not found, run main seed first.');

  const passwordHash = await bcrypt.hash('password123', 10);

  const prakash = await prisma.user.upsert({
    where: { email: 'prakash.mali@university.edu' },
    update: { name: 'Prof. Prakash Mali', role: Role.class_teacher, departmentId: dept.id },
    create: {
      name: 'Prof. Prakash Mali',
      email: 'prakash.mali@university.edu',
      passwordHash,
      role: Role.class_teacher,
      departmentId: dept.id,
    },
  });

  const sonali = await prisma.user.upsert({
    where: { email: 'sonali.matondkar@university.edu' },
    update: { name: 'Prof. Sonali Matondkar', role: Role.class_teacher, departmentId: dept.id },
    create: {
      name: 'Prof. Sonali Matondkar',
      email: 'sonali.matondkar@university.edu',
      passwordHash,
      role: Role.class_teacher,
      departmentId: dept.id,
    },
  });

  const classA = await prisma.class.upsert({
    where: { name: 'TY.CSE A' },
    update: { semester: 5, departmentId: dept.id, classTeacherId: prakash.id },
    create: {
      name: 'TY.CSE A',
      semester: 5,
      departmentId: dept.id,
      classTeacherId: prakash.id,
    },
  });

  const classB = await prisma.class.upsert({
    where: { name: 'TY.CSE B' },
    update: { semester: 5, departmentId: dept.id, classTeacherId: sonali.id },
    create: {
      name: 'TY.CSE B',
      semester: 5,
      departmentId: dept.id,
      classTeacherId: sonali.id,
    },
  });

  const tycseAStudents = [
    'Aarav Patil', 'Rohan Kulkarni', 'Aditya Deshmukh', 'Sarthak Joshi', 'Omkar Jadhav',
    'Kunal Pawar', 'Shubham More', 'Siddharth Gokhale', 'Pranav Chavan', 'Nikhil Bhosale',
    'Akash Shinde', 'Vaibhav Sawant', 'Yash Kulkarni', 'Atharva Patwardhan', 'Tejas Mahajan',
    'Harshad Kale', 'Aniket Patil', 'Abhishek Naik', 'Rohit Shelar', 'Mayur Phadke',
  ];

  const tycseBStudents = [
    'Aditi Kulkarni', 'Sneha Patil', 'Pooja Deshmukh', 'Rutuja Joshi', 'Neha Jadhav',
    'Sakshi Pawar', 'Tanvi More', 'Isha Gokhale', 'Priya Chavan', 'Ankita Bhosale',
    'Shreya Shinde', 'Pallavi Sawant', 'Komal Kulkarni', 'Sayali Patwardhan', 'Nandini Mahajan',
    'Megha Kale', 'Prajakta Patil', 'Riya Naik', 'Kiran Shelar', 'Mitali Phadke',
  ];

  const createStudents = async (names: string[], clsId: string, prefix: string) => {
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const rollNumber = `${prefix}${String(i + 1).padStart(3, '0')}`;
      const email = toEmail(name);

      const user = await prisma.user.upsert({
        where: { email },
        update: { name, role: Role.student, departmentId: dept.id },
        create: {
          name,
          email,
          passwordHash,
          role: Role.student,
          departmentId: dept.id,
        },
      });

      await prisma.student.upsert({
        where: { userId: user.id },
        update: { departmentId: dept.id, classId: clsId, rollNumber },
        create: {
          userId: user.id,
          departmentId: dept.id,
          classId: clsId,
          rollNumber,
        },
      });
    }
  };

  await createStudents(tycseAStudents, classA.id, 'TYCSEA');
  await createStudents(tycseBStudents, classB.id, 'TYCSEB');

  console.log('TY.CSE A and TY.CSE B created/updated with requested students and class teachers.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
