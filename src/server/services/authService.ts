import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client';
import { env } from '../config/env';
import type { Role } from '@prisma/client';
import type { SignOptions } from 'jsonwebtoken';

export async function validateUserCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

export function generateToken(userId: string, role: Role) {
  const signOptions: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign({ userId, role }, env.jwtSecret, signOptions);
}
