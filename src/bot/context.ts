import type { DB } from '../db/index.js';
import type { WhatsAppProvider, IncomingMessage } from '../providers/whatsapp.js';
import type { User } from '../domain/types.js';
import type { Session } from './sessions.js';

export interface BotContext {
  db: DB;
  wa: WhatsAppProvider;
  msg: IncomingMessage;
  user: User | null;
  session: Session;
  reply(text: string): Promise<void>;
  replyImage(image: Buffer, caption?: string): Promise<void>;
  reset(): void;
}
