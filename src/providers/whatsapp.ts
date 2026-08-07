/**
 * Abstracción del canal WhatsApp. Los flujos del bot solo hablan con esta
 * interfaz, así que pasar del número personal (Baileys) a la Cloud API
 * oficial es escribir otro adaptador, sin tocar la lógica.
 */
export interface IncomingMessage {
  from: string; // teléfono normalizado (dígitos con país)
  text: string;
  imageBuffer?: Buffer;
}

export type MessageHandler = (msg: IncomingMessage) => Promise<void>;

export interface WhatsAppProvider {
  start(): Promise<void>;
  sendText(to: string, text: string): Promise<void>;
  sendImage(to: string, image: Buffer, caption?: string): Promise<void>;
  onMessage(handler: MessageHandler): void;
}
