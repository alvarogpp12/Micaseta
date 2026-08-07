import type { DB } from '../db/index.js';
import type { IncomingMessage, WhatsAppProvider } from '../providers/whatsapp.js';
import type { BotContext } from './context.js';
import { config } from '../config.js';
import { getSession, saveSession, clearSession } from './sessions.js';
import * as users from '../services/users.js';
import { handleAdmin } from './flows/admin.js';
import { handleSocio } from './flows/socio.js';
import { handleInvitado } from './flows/invitado.js';
import { handleStaff } from './flows/staff.js';

/**
 * Un solo número de WhatsApp para todo el club: el rol de quien escribe
 * decide qué flujo ve. Los admin se autoprovisionan desde ADMIN_PHONES.
 */
export function createRouter(db: DB, wa: WhatsAppProvider) {
  return async function route(msg: IncomingMessage): Promise<void> {
    let user = await users.findByPhone(db, msg.from);

    if (!user && config.adminPhones.includes(msg.from)) {
      user = await users.createUser(db, { phone: msg.from, name: 'Admin', role: 'admin' });
    }

    let wasReset = false;
    const ctx: BotContext = {
      db,
      wa,
      msg,
      user,
      session: await getSession(db, msg.from),
      reply: (text) => wa.sendText(msg.from, text),
      replyImage: (image, caption) => wa.sendImage(msg.from, image, caption),
      reset: () => {
        wasReset = true;
      },
    };

    if (user?.status === 'suspendido') {
      return ctx.reply('🚫 Tu acceso está suspendido. Habla con el administrador.');
    }

    switch (user?.role) {
      case 'admin':
        await handleAdmin(ctx);
        break;
      case 'socio':
        await handleSocio(ctx);
        break;
      case 'mesero':
      case 'puerta':
        await handleStaff(ctx);
        break;
      default:
        // invitado registrado, invitado con invitación pendiente, o desconocido
        await handleInvitado(ctx);
    }

    // Persistir la máquina de estados (o limpiarla si el flujo terminó)
    if (wasReset) await clearSession(db, msg.from);
    else await saveSession(db, msg.from, ctx.session);
  };
}
