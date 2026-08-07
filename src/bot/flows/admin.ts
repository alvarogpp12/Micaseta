import type { BotContext } from '../context.js';
import { normalizePhone, formatPhone } from '../../config.js';
import { parseEuros, euros } from '../../domain/types.js';
import type { Role } from '../../domain/types.js';
import * as users from '../../services/users.js';
import * as orders from '../../services/orders.js';
import { adminReport } from '../../services/reports.js';
import { sendSocioWelcome } from './socio.js';
import { sendStaffLink } from './staff.js';

const HELP = `👑 *Comandos de admin*

• *alta socio* +34XXXXXXXXX Nombre
• *alta mesero* +34XXXXXXXXX Nombre
• *alta puerta* +34XXXXXXXXX Nombre
• *baja* +34XXXXXXXXX — suspende a cualquiera
• *producto* Nombre Precio Categoría — ej: producto Cerveza 3,50 bebida
• *carta* — lista los productos
• *reporte* — consumo global`;

export async function handleAdmin(ctx: BotContext): Promise<void> {
  const text = ctx.msg.text.trim();

  const alta = text.match(/^alta\s+(socio|mesero|puerta)\s+(\+?[\d\s.-]{9,})\s+(.+)$/i);
  if (alta) {
    const role = alta[1].toLowerCase() as Role;
    const phone = normalizePhone(alta[2]);
    const name = alta[3].trim();
    if (!phone) return ctx.reply('⚠️ Ese teléfono no parece válido.');
    const user = await users.upsertByAdmin(ctx.db, phone, name, role);
    await ctx.reply(`✅ ${name} dado de alta como *${role}* (${formatPhone(phone)}).`);
    if (role === 'socio') await sendSocioWelcome(ctx, user);
    else await sendStaffLink(ctx, user);
    return;
  }

  const baja = text.match(/^baja\s+(\+?[\d\s.-]{9,})$/i);
  if (baja) {
    const phone = normalizePhone(baja[1]);
    const user = phone ? await users.findByPhone(ctx.db, phone) : null;
    if (!user) return ctx.reply('⚠️ No encuentro a nadie con ese número.');
    await users.setStatus(ctx.db, user.id, 'suspendido');
    return ctx.reply(`🚫 ${user.name ?? formatPhone(user.phone)} suspendido. Su QR ya no vale.`);
  }

  const producto = text.match(/^producto\s+(.+)\s+([\d.,]+)\s*€?\s+(\S+)$/i);
  if (producto) {
    const price = parseEuros(producto[2]);
    if (price === null) return ctx.reply('⚠️ Precio inválido. Ej: producto Cerveza 3,50 bebida');
    const p = await orders.addProduct(ctx.db, producto[1].trim(), price, producto[3].toLowerCase());
    return ctx.reply(`✅ Producto añadido: ${p.name} — ${euros(p.price_cents)} (${p.category})`);
  }

  if (/^carta$/i.test(text)) {
    const list = await orders.listProducts(ctx.db);
    if (list.length === 0) return ctx.reply('La carta está vacía. Añade con: producto Nombre Precio Categoría');
    return ctx.reply('🍽 *Carta*\n' + list.map((p) => `• ${p.name} — ${euros(p.price_cents)} (${p.category})`).join('\n'));
  }

  if (/^reporte$/i.test(text)) return ctx.reply(await adminReport(ctx.db));

  return ctx.reply(HELP);
}
