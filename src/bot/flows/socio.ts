import type { BotContext } from '../context.js';
import type { Invitation, User } from '../../domain/types.js';
import { euros, parseEuros, todayStr } from '../../domain/types.js';
import { normalizePhone, formatPhone } from '../../config.js';
import * as invitations from '../../services/invitations.js';
import * as users from '../../services/users.js';
import { socioReport } from '../../services/reports.js';

const MENU = `¿Qué quieres hacer?

1️⃣ Invitar
2️⃣ Reporte
3️⃣ Cancelar una invitación

Responde con el número.`;

export async function sendSocioWelcome(ctx: BotContext, socio: User): Promise<void> {
  await ctx.wa.sendText(socio.phone, `🎉 ¡Bienvenido a Micaseta, ${socio.name}!\n\n${MENU}`);
}

function describeInvitation(inv: Invitation): string {
  const parts: string[] = [];
  parts.push(inv.access_mode === 'siempre' ? 'Acceso: cualquier día' : `Acceso: solo el ${inv.valid_date}`);
  parts.push(inv.spend_limit_cents === null ? 'Consumo: abierto' : `Consumo: hasta ${euros(inv.spend_limit_cents)}`);
  parts.push(`Acompañantes: ${inv.max_companions}`);
  return parts.join('\n');
}

/** Envía la invitación por WhatsApp al invitado (o acompañante). */
export async function sendInvitationMessage(ctx: BotContext, inv: Invitation): Promise<void> {
  const socio = users.findById(ctx.db, inv.socio_id)!;
  await ctx.wa.sendText(
    inv.guest_phone,
    `🎊 *${socio.name}* te invita a *Micaseta*.\n\n${describeInvitation(inv)}\n\n` +
      `¿Aceptas la invitación?\n1️⃣ Sí, acepto\n2️⃣ No, gracias`,
  );
}

export async function handleSocio(ctx: BotContext): Promise<void> {
  const text = ctx.msg.text.trim();
  const s = ctx.session;

  switch (s.state) {
    case 'idle':
    case 'menu': {
      if (text === '1') {
        s.state = 'invite_phone';
        return ctx.reply('📱 Escribe el número de WhatsApp de tu invitado (ej: 612345678):');
      }
      if (text === '2') {
        ctx.reset();
        return ctx.reply(socioReport(ctx.db, ctx.user!.id));
      }
      if (text === '3') {
        const list = invitations.listActiveBySocio(ctx.db, ctx.user!.id).filter((i) => !i.parent_id);
        if (list.length === 0) {
          ctx.reset();
          return ctx.reply('No tienes invitaciones activas.\n\n' + MENU);
        }
        s.state = 'cancel_pick';
        s.data.cancelList = list.map((i) => i.id);
        const lines = list.map((inv, idx) => {
          const guest = inv.guest_id ? users.findById(ctx.db, inv.guest_id) : null;
          const who = guest?.name ?? formatPhone(inv.guest_phone);
          return `${idx + 1}️⃣ ${who} (${inv.status})`;
        });
        return ctx.reply(`¿Cuál cancelo?\n\n${lines.join('\n')}\n\n0️⃣ Volver`);
      }
      s.state = 'menu';
      return ctx.reply(MENU);
    }

    case 'invite_phone': {
      const phone = normalizePhone(text);
      if (!phone) return ctx.reply('⚠️ No entendí el número. Prueba de nuevo (ej: 612345678):');
      if (phone === ctx.user!.phone) return ctx.reply('😄 No puedes invitarte a ti mismo. Otro número:');
      const existing = users.findByPhone(ctx.db, phone);
      if (existing && existing.role !== 'invitado') {
        return ctx.reply(`⚠️ Ese número ya es ${existing.role} del club. Otro número:`);
      }
      s.data.guestPhone = phone;
      s.state = 'invite_mode';
      return ctx.reply('¿Qué tipo de invitación?\n\n1️⃣ Acceso abierto (cualquier día, sin límite)\n2️⃣ Personalizar');
    }

    case 'invite_mode': {
      if (text === '1') {
        s.data.accessMode = 'siempre';
        s.data.spendLimitCents = null;
        s.state = 'invite_companions';
        return ctx.reply('¿Cuántos acompañantes puede traer? (0-10):');
      }
      if (text === '2') {
        s.state = 'invite_days';
        return ctx.reply('¿Qué días puede entrar?\n\n1️⃣ Solo hoy\n2️⃣ Una fecha concreta\n3️⃣ Cualquier día');
      }
      return ctx.reply('Responde 1 o 2 🙂');
    }

    case 'invite_days': {
      if (text === '1') {
        s.data.accessMode = 'fecha';
        s.data.validDate = todayStr();
        s.state = 'invite_limit';
        return ctx.reply('¿Límite de consumo? Escribe el importe (ej: 50) o *abierto*:');
      }
      if (text === '2') {
        s.state = 'invite_date';
        return ctx.reply('Escribe la fecha (DD/MM/AAAA):');
      }
      if (text === '3') {
        s.data.accessMode = 'siempre';
        s.state = 'invite_limit';
        return ctx.reply('¿Límite de consumo? Escribe el importe (ej: 50) o *abierto*:');
      }
      return ctx.reply('Responde 1, 2 o 3 🙂');
    }

    case 'invite_date': {
      const m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (!m) return ctx.reply('⚠️ Formato DD/MM/AAAA, por ejemplo 15/08/2026:');
      const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      if (iso < todayStr()) return ctx.reply('⚠️ Esa fecha ya pasó. Otra fecha:');
      s.data.accessMode = 'fecha';
      s.data.validDate = iso;
      s.state = 'invite_limit';
      return ctx.reply('¿Límite de consumo? Escribe el importe (ej: 50) o *abierto*:');
    }

    case 'invite_limit': {
      if (/^abierto$/i.test(text)) {
        s.data.spendLimitCents = null;
      } else {
        const cents = parseEuros(text);
        if (cents === null) return ctx.reply('⚠️ Escribe un importe (ej: 50) o *abierto*:');
        s.data.spendLimitCents = cents;
      }
      s.state = 'invite_companions';
      return ctx.reply('¿Cuántos acompañantes puede traer? (0-10):');
    }

    case 'invite_companions': {
      const n = parseInt(text, 10);
      if (isNaN(n) || n < 0 || n > 10) return ctx.reply('⚠️ Un número entre 0 y 10:');
      s.data.maxCompanions = n;
      s.state = 'invite_confirm';
      const preview: Invitation = {
        access_mode: s.data.accessMode,
        valid_date: s.data.validDate ?? null,
        spend_limit_cents: s.data.spendLimitCents ?? null,
        max_companions: n,
      } as Invitation;
      return ctx.reply(
        `📋 *Resumen de la invitación*\nInvitado: ${formatPhone(s.data.guestPhone)}\n${describeInvitation(preview)}\n\n1️⃣ Confirmar y enviar\n2️⃣ Descartar`,
      );
    }

    case 'invite_confirm': {
      if (text === '1') {
        const inv = invitations.createInvitation(ctx.db, {
          socioId: ctx.user!.id,
          guestPhone: s.data.guestPhone,
          accessMode: s.data.accessMode ?? 'siempre',
          validDate: s.data.validDate ?? null,
          spendLimitCents: s.data.spendLimitCents ?? null,
          maxCompanions: s.data.maxCompanions ?? 0,
        });
        await sendInvitationMessage(ctx, inv);
        ctx.reset();
        return ctx.reply(`✅ Invitación enviada a ${formatPhone(inv.guest_phone)}.\n\n${MENU}`);
      }
      ctx.reset();
      return ctx.reply('Invitación descartada.\n\n' + MENU);
    }

    case 'cancel_pick': {
      if (text === '0') {
        ctx.reset();
        return ctx.reply(MENU);
      }
      const idx = parseInt(text, 10) - 1;
      const ids: number[] = s.data.cancelList ?? [];
      if (isNaN(idx) || idx < 0 || idx >= ids.length) return ctx.reply('⚠️ Elige un número de la lista (o 0 para volver):');
      const inv = invitations.getInvitation(ctx.db, ids[idx])!;
      invitations.cancel(ctx.db, inv.id);
      if (inv.guest_phone) {
        await ctx.wa.sendText(inv.guest_phone, '😔 Tu invitación a Micaseta ha sido cancelada. Tu QR ya no es válido.');
      }
      ctx.reset();
      return ctx.reply('✅ Invitación cancelada (incluidos sus acompañantes). Su QR deja de funcionar ya.\n\n' + MENU);
    }

    default: {
      ctx.reset();
      return ctx.reply(MENU);
    }
  }
}
