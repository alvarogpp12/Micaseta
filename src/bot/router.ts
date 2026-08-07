import type { DB } from '../db/index.js';
import type { IncomingMessage, WhatsAppProvider } from '../providers/whatsapp.js';
import type { BotContext } from './context.js';
import { config } from '../config.js';
import { getSession, clearSession } from './sessions.js';
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
    let user = users.findByPhone(db, msg.from);

    if (!user && config.adminPhones.includes(msg.from)) {
      user = users.createUser(db, { phone: msg.from, name: 'Admin', role: 'admin' });
    }

    const ctx: BotContext = {
      db,
      wa,
      msg,
      user,
      session: getSession(msg.from),
      reply: (text) => wa.sendText(msg.from, text),
      replyImage: (image, caption) => wa.sendImage(msg.from, image, caption),
      reset: () => clearSession(msg.from),
    };

    if (user?.status === 'suspendido') {
      return ctx.reply('🚫 Tu acceso está suspendido. Habla con el administrador.');
    }

    switch (user?.role) {
      case 'admin':
        return handleAdmin(ctx);
      case 'socio':
        return handleSocio(ctx);
      case 'mesero':
      case 'puerta':
        return handleStaff(ctx);
      default:
        // invitado registrado, invitado con invitación pendiente, o desconocido
        return handleInvitado(ctx);
    }
  };
}
