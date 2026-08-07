import jwt from 'jsonwebtoken';
import type { BotContext } from '../context.js';
import type { User } from '../../domain/types.js';
import { config } from '../../config.js';

/** Link mágico de acceso a la PWA de escaneo (30 días, ligado al usuario). */
export function staffLoginUrl(user: User): string {
  const token = jwt.sign({ s: user.id }, config.jwtSecret, { expiresIn: '30d' });
  return `${config.baseUrl}/staff/login?token=${token}`;
}

export async function sendStaffLink(ctx: BotContext, user: User): Promise<void> {
  const label = user.role === 'puerta' ? 'control de puerta' : 'comandas';
  await ctx.wa.sendText(
    user.phone,
    `👋 Hola ${user.name}. Este es tu acceso al ${label} de Micaseta.\n\n` +
      `Ábrelo en el navegador de tu móvil (vale 30 días):\n${staffLoginUrl(user)}\n\n` +
      `Escribe *link* cuando necesites uno nuevo.`,
  );
}

export async function handleStaff(ctx: BotContext): Promise<void> {
  await sendStaffLink(ctx, ctx.user!);
}
