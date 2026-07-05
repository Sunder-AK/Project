const { randomBytes } = require('crypto');
const fs = require('fs');
const forge = require('node-forge');
const pki = forge.pki;

// ============================================================
// STEP 1: Create a Root Certificate Authority (CA)
// ============================================================
console.log('Creating Root Certificate Authority...');

const caKeys = pki.rsa.generateKeyPair(2048);
const caCert = pki.createCertificate();

caCert.publicKey = caKeys.publicKey;
caCert.serialNumber = '01';
caCert.validity.notBefore = new Date();
caCert.validity.notAfter = new Date();
caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 10);

const caAttrs = [
  { name: 'commonName', value: 'RequestTracker Dev Root CA' },
  { name: 'organizationName', value: 'RequestTracker Dev' },
  { name: 'countryName', value: 'US' },
];

caCert.setSubject(caAttrs);
caCert.setIssuer(caAttrs); // Self-signed (issuer = subject)

caCert.setExtensions([
  { name: 'basicConstraints', cA: true, critical: true },
  { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
  {
    name: 'subjectKeyIdentifier',
  },
]);

caCert.sign(caKeys.privateKey, forge.md.sha256.create());

// ============================================================
// STEP 2: Create Server Certificate signed by the CA
// ============================================================
console.log('Creating Server Certificate signed by Root CA...');

const serverKeys = pki.rsa.generateKeyPair(2048);
const serverCert = pki.createCertificate();

serverCert.publicKey = serverKeys.publicKey;
serverCert.serialNumber = '02' + randomBytes(8).toString('hex');
serverCert.validity.notBefore = new Date();
serverCert.validity.notAfter = new Date();
serverCert.validity.notAfter.setFullYear(serverCert.validity.notBefore.getFullYear() + 1);

const serverAttrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'organizationName', value: 'RequestTracker Dev' },
  { name: 'countryName', value: 'US' },
];

serverCert.setSubject(serverAttrs);
serverCert.setIssuer(caAttrs); // Issued BY the CA

serverCert.setExtensions([
  { name: 'basicConstraints', cA: false, critical: true },
  {
    name: 'keyUsage',
    digitalSignature: true,
    keyEncipherment: true,
    critical: true,
  },
  { name: 'extKeyUsage', serverAuth: true },
  {
    name: 'subjectAltName',
    altNames: [
      { type: 2, value: 'localhost' },       // DNS:localhost
      { type: 7, ip: '127.0.0.1' },          // IP:127.0.0.1
      { type: 7, ip: '::1' },                // IP:::1 (IPv6 loopback)
    ],
  },
  {
    name: 'authorityKeyIdentifier',
  },
]);

// Sign the server cert with the CA's private key
serverCert.sign(caKeys.privateKey, forge.md.sha256.create());

// ============================================================
// STEP 3: Write all files
// ============================================================
fs.mkdirSync('certs', { recursive: true });

// Root CA (for trust store installation)
fs.writeFileSync('certs/rootCA.pem', pki.certificateToPem(caCert));
fs.writeFileSync('certs/rootCA.key', pki.privateKeyToPem(caKeys.privateKey));

// Server cert + key (for Express & Vite)
fs.writeFileSync('certs/server.cert', pki.certificateToPem(serverCert));
fs.writeFileSync('certs/server.key', pki.privateKeyToPem(serverKeys.privateKey));

console.log('\n✅ SSL certificates generated in certs/');
console.log('  📁 certs/rootCA.pem   — Root CA certificate (install in trust store)');
console.log('  📁 certs/rootCA.key   — Root CA private key (keep safe)');
console.log('  📁 certs/server.cert  — Server certificate (signed by Root CA)');
console.log('  📁 certs/server.key   — Server private key');
console.log('  📋 CA valid for: 10 years');
console.log('  📋 Server cert valid for: 1 year');
console.log('  📋 SAN: localhost, 127.0.0.1, ::1');
