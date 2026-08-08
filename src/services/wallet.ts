import crypto from 'node:crypto';
import zlib from 'node:zlib';
import forge from 'node-forge';
import AdmZip from 'adm-zip';
import { config } from '../config.js';
import type { User } from '../domain/types.js';

/**
 * Pases de Apple Wallet (.pkpass): tarjeta tipo entrada con el nombre, la
 * caseta y el MISMO QR firmado que usa la puerta/barra. Apple exige firmar
 * el pase con un certificado "Pass Type ID" (cuenta de Apple Developer) +
 * el certificado WWDR; se cargan desde variables de entorno (PEM directo o
 * en base64).
 */

export interface WalletCreds {
  passTypeId: string;
  teamId: string;
  certPem: string;
  keyPem: string;
  keyPassword?: string;
  wwdrPem: string;
}

const asPem = (v: string) => (v.includes('-----BEGIN') ? v : Buffer.from(v, 'base64').toString('utf8'));

export function walletEnabled(): boolean {
  const w = config.wallet;
  return !!(w.passTypeId && w.teamId && w.certPem && w.keyPem && w.wwdrPem);
}

export interface PassInput {
  user: User;
  casetaName: string;
  qrToken: string;
  hostName?: string | null;
}

export function buildPass(input: PassInput, creds: WalletCreds = config.wallet): Buffer {
  const esSocio = input.user.role === 'socio' || input.user.role === 'admin';
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: creds.passTypeId,
    teamIdentifier: creds.teamId,
    serialNumber: `micaseta-u${input.user.id}-v${input.user.qr_version}`,
    organizationName: input.casetaName,
    description: `Acceso a ${input.casetaName}`,
    logoText: input.casetaName,
    foregroundColor: 'rgb(255,255,255)',
    backgroundColor: 'rgb(67,83,255)',
    labelColor: 'rgb(214,219,255)',
    barcodes: [{ format: 'PKBarcodeFormatQR', message: input.qrToken, messageEncoding: 'iso-8859-1' }],
    barcode: { format: 'PKBarcodeFormatQR', message: input.qrToken, messageEncoding: 'iso-8859-1' },
    eventTicket: {
      primaryFields: [{ key: 'name', label: esSocio ? 'SOCIO' : 'INVITADO', value: input.user.name ?? '' }],
      secondaryFields: [
        { key: 'caseta', label: 'CASETA', value: input.casetaName },
        ...(input.hostName ? [{ key: 'host', label: 'INVITA', value: input.hostName }] : []),
      ],
      backFields: [
        {
          key: 'info',
          label: 'Micaseta',
          value: 'Presenta este código en la puerta y al pedir en barra. Si tu invitación se cancela, el código deja de funcionar.',
        },
      ],
    },
  };

  const files: Record<string, Buffer> = {
    'pass.json': Buffer.from(JSON.stringify(passJson)),
    'icon.png': solidPng(29, 29, [67, 83, 255]),
    'icon@2x.png': solidPng(58, 58, [67, 83, 255]),
  };

  // manifest.json: SHA-1 de cada fichero (lo exige el formato)
  const manifest: Record<string, string> = {};
  for (const [name, buf] of Object.entries(files)) {
    manifest[name] = crypto.createHash('sha1').update(buf).digest('hex');
  }
  const manifestBuf = Buffer.from(JSON.stringify(manifest));

  // Firma PKCS#7 detached del manifest con el certificado del Pass Type ID
  const cert = forge.pki.certificateFromPem(asPem(creds.certPem));
  const wwdr = forge.pki.certificateFromPem(asPem(creds.wwdrPem));
  const keyPem = asPem(creds.keyPem);
  const key = creds.keyPassword
    ? forge.pki.decryptRsaPrivateKey(keyPem, creds.keyPassword)
    : forge.pki.privateKeyFromPem(keyPem);
  if (!key) throw new Error('Clave privada del pase no válida');

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestBuf.toString('binary'));
  p7.addCertificate(wwdr);
  p7.addCertificate(cert);
  p7.addSigner({
    key: key as any,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as any },
    ],
  });
  p7.sign({ detached: true });
  const signature = Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');

  const zip = new AdmZip();
  for (const [name, buf] of Object.entries(files)) zip.addFile(name, buf);
  zip.addFile('manifest.json', manifestBuf);
  zip.addFile('signature', signature);
  return zip.toBuffer();
}

// ── PNG mínimo (icono del pase): color sólido, sin dependencias ──

function crc32(data: Buffer): number {
  let crc = ~0;
  for (const b of data) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function solidPng(w: number, h: number, [r, g, b]: number[]): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0; // sin filtro
    for (let x = 0; x < w; x++) {
      const px = row + 1 + x * 4;
      raw[px] = r; raw[px + 1] = g; raw[px + 2] = b; raw[px + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
