import type { IncomingMessage, MessageHandler, WhatsAppProvider } from './whatsapp.js';

export interface MockEntry {
  dir: 'in' | 'out';
  text?: string;
  imageBase64?: string;
  caption?: string;
  at: number;
}

/**
 * Proveedor de desarrollo: no toca WhatsApp. Guarda las conversaciones en
 * memoria y se maneja desde el simulador web en /dev.
 */
export class MockProvider implements WhatsAppProvider {
  private handler: MessageHandler | null = null;
  private logs = new Map<string, MockEntry[]>();

  async start(): Promise<void> {}

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async sendText(to: string, text: string): Promise<void> {
    this.push(to, { dir: 'out', text, at: Date.now() });
  }

  async sendImage(to: string, image: Buffer, caption?: string): Promise<void> {
    this.push(to, { dir: 'out', imageBase64: image.toString('base64'), caption, at: Date.now() });
  }

  /** Simula un mensaje entrante (lo usa el chat de /dev). */
  async simulateIncoming(msg: IncomingMessage): Promise<void> {
    this.push(msg.from, {
      dir: 'in',
      text: msg.text,
      imageBase64: msg.imageBuffer?.toString('base64'),
      at: Date.now(),
    });
    if (this.handler) await this.handler(msg);
  }

  getLog(phone: string): MockEntry[] {
    return this.logs.get(phone) ?? [];
  }

  private push(phone: string, entry: MockEntry): void {
    const log = this.logs.get(phone) ?? [];
    log.push(entry);
    this.logs.set(phone, log);
  }
}
