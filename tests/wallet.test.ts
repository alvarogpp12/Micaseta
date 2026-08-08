import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import forge from 'node-forge';
import AdmZip from 'adm-zip';
import { buildPass } from '../src/services/wallet.js';
import type { User } from '../src/domain/types.js';

/** Certificado autofirmado de prueba (la estructura del pase no depende de Apple). */
function testCreds() {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  const attrs = [{ name: 'commonName', value: 'Pass Test' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    passTypeId: 'pass.test.micaseta',
    teamId: 'TEAM123456',
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
    wwdrPem: forge.pki.certificateToPem(cert),
  };
}

describe('pase de Apple Wallet', () => {
  it('genera un .pkpass válido: pass.json, iconos, manifest con SHA-1 y firma', () => {
    const user = {
      id: 7, caseta_id: 1, phone: '34611111111', name: 'Juan Pérez',
      role: 'socio', status: 'activo', photo: null, qr_version: 2, created_at: new Date(),
    } as User;
    const pkpass = buildPass(
      { user, casetaName: 'Er Compás', qrToken: 'token-qr-firmado', hostName: null },
      testCreds(),
    );

    const zip = new AdmZip(pkpass);
    const names = zip.getEntries().map((e) => e.entryName).sort();
    expect(names).toEqual(['icon.png', 'icon@2x.png', 'manifest.json', 'pass.json', 'signature']);

    const pass = JSON.parse(zip.readAsText('pass.json'));
    expect(pass.serialNumber).toBe('micaseta-u7-v2');
    expect(pass.barcodes[0].message).toBe('token-qr-firmado');
    expect(pass.eventTicket.primaryFields[0].value).toBe('Juan Pérez');
    expect(pass.eventTicket.primaryFields[0].label).toBe('SOCIO');
    expect(pass.organizationName).toBe('Er Compás');

    // manifest: SHA-1 reales de cada fichero
    const manifest = JSON.parse(zip.readAsText('manifest.json'));
    for (const name of ['pass.json', 'icon.png', 'icon@2x.png']) {
      const hash = crypto.createHash('sha1').update(zip.getEntry(name)!.getData()).digest('hex');
      expect(manifest[name]).toBe(hash);
    }

    // firma PKCS#7 DER no vacía y los iconos son PNG de verdad
    expect(zip.getEntry('signature')!.getData().length).toBeGreaterThan(100);
    expect(zip.getEntry('icon.png')!.getData().subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('el invitado lleva la etiqueta INVITADO y quién le invita', () => {
    const user = {
      id: 9, caseta_id: 1, phone: '34622222222', name: 'Ana López',
      role: 'invitado', status: 'activo', photo: null, qr_version: 1, created_at: new Date(),
    } as User;
    const pkpass = buildPass(
      { user, casetaName: 'Er Compás', qrToken: 'tok', hostName: 'Juan Pérez' },
      testCreds(),
    );
    const pass = JSON.parse(new AdmZip(pkpass).readAsText('pass.json'));
    expect(pass.eventTicket.primaryFields[0].label).toBe('INVITADO');
    expect(pass.eventTicket.secondaryFields.find((f: any) => f.key === 'host').value).toBe('Juan Pérez');
  });
});
