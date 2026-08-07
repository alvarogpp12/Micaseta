import type { BotContext } from '../context.js';
import type { Invitation, User } from '../../domain/types.js';
import { normalizePhone, formatPhone } from '../../config.js';
import * as users from '../../services/users.js';
import * as invitations from '../../services/invitations.js';
import { signQrToken, qrPng } from '../../services/qr.js';
import { sendInvitationMessage } from './socio.js';

async function sendGuestQr(ctx: BotContext, guest: User): Promise<void> {
  const png = await qrPng(signQrToken(guest));
  await ctx.wa.sendImage(
    guest.phone,
    png,
    `🎟 Este es tu acceso a Micaseta, ${guest.name}.\nPreséntalo en la puerta y al pedir. Escribe *QR* si lo necesitas de nuevo.`,
  );
}

async function askCompanions(ctx: BotContext, inv: Invitation): Promise<void> {
  ctx.session.state = 'companions';
  ctx.session.data.invitationId = inv.id;
  await ctx.reply(
    `Puedes traer hasta *${inv.max_companions}* acompañantes.\n\n` +
      `Envíame sus números de WhatsApp separados por comas (les llegará su propia invitación), o *0* si vienes solo.`,
  );
}

export async function handleInvitado(ctx: BotContext): Promise<void> {
  const text = ctx.msg.text.trim();
  const s = ctx.session;
  const phone = ctx.msg.from;

  switch (s.state) {
    case 'reg_name': {
      if (!text || ctx.msg.imageBuffer) return ctx.reply('¿Cómo te llamas? (escribe tu nombre):');
      await users.setName(ctx.db, ctx.user!.id, text);
      s.state = 'reg_photo';
      return ctx.reply(`Gracias, ${text} 🙌 Ahora envíame una *foto de tu rostro* (selfie, con buena luz):`);
    }

    case 'reg_photo': {
      if (!ctx.msg.imageBuffer) return ctx.reply('Necesito una foto tuya para el registro 🤳 Envíala como imagen:');
      await users.setPhoto(ctx.db, ctx.user!.id, ctx.msg.imageBuffer);
      await users.setStatus(ctx.db, ctx.user!.id, 'activo');

      const guest = (await users.findById(ctx.db, ctx.user!.id))!;
      await ctx.reply('✅ ¡Registro completado!');
      await sendGuestQr(ctx, guest);

      const inv = await invitations.activeForGuest(ctx.db, guest.id);
      if (inv && inv.max_companions > 0 && !inv.parent_id) return askCompanions(ctx, inv);
      ctx.reset();
      return;
    }

    case 'companions': {
      const inv = await invitations.getInvitation(ctx.db, s.data.invitationId);
      ctx.reset();
      if (!inv || inv.status !== 'aceptada') return ctx.reply('Tu invitación ya no está activa.');
      if (text === '0') return ctx.reply('¡Perfecto, te esperamos! 🎉');

      const phones = text
        .split(/[,;\n]+/)
        .map((p) => normalizePhone(p))
        .filter((p): p is string => p !== null && p !== phone);
      if (phones.length === 0) return ctx.reply('No entendí ningún número. Escribe *acompañantes* para intentarlo de nuevo.');

      const toInvite = [...new Set(phones)].slice(0, inv.max_companions);
      for (const companionPhone of toInvite) {
        const child = await invitations.createInvitation(ctx.db, {
          socioId: inv.socio_id,
          guestPhone: companionPhone,
          accessMode: inv.access_mode,
          validDate: inv.valid_date,
          spendLimitCents: inv.spend_limit_cents,
          maxCompanions: 0,
          parentId: inv.id,
        });
        await sendInvitationMessage(ctx, child);
      }
      return ctx.reply(`✅ Invitación enviada a ${toInvite.length} acompañante(s). Cada uno recibirá su propio QR al registrarse.`);
    }

    default: {
      // Sin flujo activo: ¿tiene una invitación pendiente de aceptar?
      const pending = await invitations.pendingForPhone(ctx.db, phone);
      if (pending) {
        if (text === '1') {
          let guest = ctx.user ?? (await users.findByPhone(ctx.db, phone));
          if (!guest) guest = await users.createUser(ctx.db, { phone, role: 'invitado', status: 'pendiente' });
          await invitations.accept(ctx.db, pending.id, guest.id);
          ctx.user = guest;
          if (guest.photo && guest.name) {
            // Ya estaba registrado de una invitación anterior: QR directo.
            await users.setStatus(ctx.db, guest.id, 'activo');
            await ctx.reply('✅ ¡Invitación aceptada! Tu QR sigue siendo válido.');
            await sendGuestQr(ctx, (await users.findById(ctx.db, guest.id))!);
            if (pending.max_companions > 0 && !pending.parent_id) return askCompanions(ctx, pending);
            return;
          }
          s.state = 'reg_name';
          return ctx.reply('🎉 ¡Genial! Vamos a registrarte.\n\n¿Cómo te llamas?');
        }
        if (text === '2') {
          await invitations.reject(ctx.db, pending.id);
          const socio = await users.findById(ctx.db, pending.socio_id);
          if (socio) await ctx.wa.sendText(socio.phone, `ℹ️ ${formatPhone(phone)} ha rechazado tu invitación.`);
          return ctx.reply('Entendido, ¡otra vez será! 👋');
        }
        return ctx.reply('Tienes una invitación pendiente 🎊\n\n1️⃣ Aceptar\n2️⃣ Rechazar');
      }

      // Invitado ya registrado
      if (ctx.user && ctx.user.role === 'invitado') {
        if (/^qr$/i.test(text)) {
          const access = await invitations.checkAccess(ctx.db, ctx.user);
          if (!access.ok) return ctx.reply(`⚠️ ${access.reason}.`);
          return sendGuestQr(ctx, ctx.user);
        }
        if (/^acompañantes$/i.test(text)) {
          const inv = await invitations.activeForGuest(ctx.db, ctx.user.id);
          if (inv && inv.max_companions > 0 && !inv.parent_id) return askCompanions(ctx, inv);
          return ctx.reply('Tu invitación no incluye acompañantes.');
        }
        return ctx.reply('Escribe *QR* para recibir tu acceso, o *acompañantes* para invitar a los tuyos.');
      }

      // Número desconocido sin invitación
      return ctx.reply('👋 Hola, esto es *Micaseta*. El acceso es solo con invitación de un socio.');
    }
  }
}
