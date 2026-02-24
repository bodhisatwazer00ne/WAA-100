import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { prisma } from '../db/client';

const router = Router();

router.use(authMiddleware);

router.get('/me', async (req, res) => {
  if (req.auth!.role !== 'student') {
    return res.status(403).json({ error: 'Only students can view their notifications' });
  }

  const student = await prisma.student.findUnique({
    where: { userId: req.auth!.userId },
  });
  if (!student) return res.json([]);

  const notifications = await prisma.notification.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: 'desc' },
  });

  res.json(notifications);
});

router.get('/all', requireRole('hod', 'class_teacher'), async (_req, res) => {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { student: { include: { user: true } } },
  });
  res.json(
    notifications.map(n => ({
      id: n.id,
      type: n.type,
      message: n.message,
      createdAt: n.createdAt,
      student: {
        id: n.studentId,
        name: n.student.user.name,
        rollNumber: n.student.rollNumber,
      },
    })),
  );
});

export default router;

