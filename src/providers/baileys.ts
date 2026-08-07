import path from 'node:path';
import type { MessageHandler, WhatsAppProvider } from './whatsapp.js';
import { config } from '../config.js';

const jid = (phone: string) => `${phone}@s.whatsapp.net`;
const phoneFromJid = (j: string) => j.split('@')[0].split(':')[0];

/**
 * Adaptador para el número personal vía Baileys (vinculación tipo WhatsApp Web).
 * Al arrancar imprime un QR en la terminal: escanéalo desde el móvil en
 * WhatsApp → Dispositivos vinculados. La sesión persiste en data/wa-session.
 *
 * ⚠️ No es la API oficial de Meta: úsalo con volumen bajo (fase provisional).
 */
export class BaileysProvider implements WhatsAppProvider {
  private sock: any = null;
  private handler: MessageHandler | null = null;

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    const baileys = await import('@whiskeysockets/baileys');
    const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage, DisconnectReason } =
      baileys as any;
    const { default: qrTerminal } = await import('qrcode-terminal' as any);
    const { default: pino } = await import('pino');

    const authDir = path.join(config.dataDir, 'wa-session');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const logger = pino({ level: 'warn' });

    const sock = makeWASocket({ auth: state, logger });
    this.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update: any) => {
      if (update.qr) {
        console.log('\n📱 Escanea este QR desde WhatsApp → Dispositivos vinculados:\n');
        qrTerminal.generate(update.qr, { small: true });
      }
      if (update.connection === 'open') console.log('✅ WhatsApp conectado');
      if (update.connection === 'close') {
        const code = update.lastDisconnect?.error?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut) {
          console.log('↩️  Conexión perdida, reintentando...');
          this.start().catch((e) => console.error('Error reconectando:', e));
        } else {
          console.error('❌ Sesión cerrada desde el teléfono. Borra data/wa-session y vincula de nuevo.');
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
      if (type !== 'notify' || !this.handler) return;
      for (const m of messages) {
        try {
          if (m.key.fromMe || !m.key.remoteJid || m.key.remoteJid.endsWith('@g.us')) continue;
          const from = phoneFromJid(m.key.remoteJid);
          const msg = m.message;
          if (!msg) continue;

          const text =
            msg.conversation ?? msg.extendedTextMessage?.text ?? msg.imageMessage?.caption ?? '';

          let imageBuffer: Buffer | undefined;
          if (msg.imageMessage) {
            imageBuffer = (await downloadMediaMessage(m, 'buffer', {})) as Buffer;
          }

          await this.handler({ from, text: text.trim(), imageBuffer });
        } catch (err) {
          console.error('Error procesando mensaje entrante:', err);
        }
      }
    });
  }

  async sendText(to: string, text: string): Promise<void> {
    await this.sock.sendMessage(jid(to), { text });
  }

  async sendImage(to: string, image: Buffer, caption?: string): Promise<void> {
    await this.sock.sendMessage(jid(to), { image, caption });
  }
}
