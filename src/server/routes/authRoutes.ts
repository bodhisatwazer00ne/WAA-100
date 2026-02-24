import { Router } from 'express';
import { z } from 'zod';
import { validateUserCredentials, generateToken } from '../services/authService';
import { prisma } from '../db/client';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
  }
  const { email, password } = parse.data;

  const user = await validateUserCredentials(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user.id, user.role);

  const profile =
    user.role === 'student'
      ? await prisma.student.findUnique({ where: { userId: user.id } })
      : user.role === 'teacher' || user.role === 'class_teacher'
      ? await prisma.teacher.findUnique({ where: { userId: user.id } })
      : null;

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile,
    },
  });
});

export default router;

