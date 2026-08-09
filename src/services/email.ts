import { config } from '../config.js';

/**
 * Correo transaccional vía Resend (HTTPS, sin SMTP). Sin RESEND_API_KEY
 * configurada no se envía nada y el registro sigue funcionando igual.
 */
export function emailEnabled(): boolean {
  return !!config.resendApiKey;
}

export async function sendWelcomeEmail(to: string, ownerName: string, casetaName: string, baseUrl: string): Promise<void> {
  if (!emailEnabled()) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.emailFrom,
        to: [to],
        subject: `Tu caseta "${casetaName}" ya está en Micaseta 🎪`,
        html: `
<div style="background:#06110B;padding:32px 16px;font-family:-apple-system,Segoe UI,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#0B1D13;border-radius:22px;overflow:hidden">
    <div style="height:8px;background:repeating-linear-gradient(135deg,#1E7A46 0 12px,#F6F5EF 12px 24px)"></div>
    <div style="padding:32px 28px;color:#EFF5EE">
      <p style="margin:0;color:#2FD573;font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase">Bienvenido a Micaseta</p>
      <h1 style="margin:14px 0 0;font-size:28px;font-weight:900;letter-spacing:-.03em;line-height:1.05">Hola, ${escapeHtml(ownerName)}.<br>“${escapeHtml(casetaName)}” ya está lista.</h1>
      <p style="margin:18px 0 0;color:#A9B5A9;font-size:15px;line-height:1.65">Tu caseta tiene la carta cargada y tú ya eres su primer socio, con tu carnet QR. Desde tu app puedes pedir, invitar (con barra o solo entrada), dar de alta socios y equipo, y ver las cuentas al día.</p>
      <a href="${baseUrl}/app/" style="display:inline-block;margin-top:26px;background:#2FD573;color:#05130B;font-weight:800;font-size:15px;padding:14px 28px;border-radius:999px;text-decoration:none">Abrir mi caseta</a>
      <p style="margin:26px 0 0;color:#7E9384;font-size:12.5px;line-height:1.6">Consejo: entra en la pestaña Caseta, da de alta a tus socios y envíales su carnet por WhatsApp con un toque.</p>
    </div>
  </div>
</div>`,
      }),
    });
  } catch {
    // El correo nunca debe romper un registro
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
