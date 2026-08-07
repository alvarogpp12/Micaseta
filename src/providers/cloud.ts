import type { IncomingMessage, MessageHandler, WhatsAppProvider } from './whatsapp.js';
import { config } from '../config.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

/**
 * Adaptador de la WhatsApp Business Cloud API oficial (Meta).
 * Sin proceso permanente: los mensajes entrantes llegan por webhook
 * (ver rutas /webhook en http/server.ts) — perfecto para serverless.
 *
 * Env necesarias: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN.
 */
export class CloudProvider implements WhatsAppProvider {
  private handler: MessageHandler | null = null;

  async start(): Promise<void> {
    if (!config.whatsappToken || !config.whatsappPhoneId) {
      console.warn('⚠️ WHATSAPP_TOKEN / WHATSAPP_PHONE_ID sin configurar: el bot no podrá enviar mensajes.');
    }
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  private async graphPost(path: string, body: any): Promise<any> {
    const res = await fetch(`${GRAPH}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Cloud API ${res.status}: ${JSON.stringify(json.error ?? json)}`);
    }
    return json;
  }

  async sendText(to: string, text: string): Promise<void> {
    await this.graphPost(`${config.whatsappPhoneId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    });
  }

  async sendImage(to: string, image: Buffer, caption?: string): Promise<void> {
    // 1) subir el binario a Meta, 2) enviar el mensaje con el media id
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'image/png');
    form.append('file', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'qr.png');
    const res = await fetch(`${GRAPH}/${config.whatsappPhoneId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.whatsappToken}` },
      body: form,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Cloud API media ${res.status}: ${JSON.stringify(json.error ?? json)}`);

    await this.graphPost(`${config.whatsappPhoneId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { id: json.id, caption },
    });
  }

  /** Descarga una imagen entrante (media id → URL temporal → binario). */
  private async downloadMedia(mediaId: string): Promise<Buffer> {
    const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${config.whatsappToken}` },
    });
    const meta: any = await metaRes.json();
    const binRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${config.whatsappToken}` },
    });
    return Buffer.from(await binRes.arrayBuffer());
  }

  /**
   * Procesa el body del webhook de Meta y despacha cada mensaje al bot.
   * Lo llama la ruta POST /webhook.
   */
  async handleWebhook(body: any): Promise<void> {
    if (!this.handler || body?.object !== 'whatsapp_business_account') return;
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const m of change.value?.messages ?? []) {
          try {
            const msg: IncomingMessage = {
              from: m.from,
              text: (m.text?.body ?? m.image?.caption ?? '').trim(),
            };
            if (m.type === 'image' && m.image?.id) {
              msg.imageBuffer = await this.downloadMedia(m.image.id);
            }
            await this.handler(msg);
          } catch (err) {
            console.error('Error procesando mensaje del webhook:', err);
          }
        }
      }
    }
  }
}
