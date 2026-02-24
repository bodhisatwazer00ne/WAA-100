import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../db/client';

const router = Router();

router.use(authMiddleware);

router.get('/student/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const remaining = Number(req.query.remainingClasses ?? 30);

  const records = await prisma.attendanceRecord.findMany({ where: { studentId } });
  const totalConducted = records.length;
  const totalAttended = records.filter(r => r.status === 'present').length;
  const currentPct = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 100;

  const calcNeeded = (target: number) => {
    const needed = Math.ceil(
      (target / 100) * (totalConducted + remaining) - totalAttended,
    );
    return Math.max(0, needed);
  };

  const needed75 = calcNeeded(75);
  const needed85 = calcNeeded(85);

  res.json({
    totalConducted,
    totalAttended,
    remainingClasses: remaining,
    currentPct: Math.round(currentPct),
    classesNeededFor75: needed75,
    classesNeededFor85: needed85,
    canReach75: needed75 <= remaining,
    canReach85: needed85 <= remaining,
  });
});

export default router;

