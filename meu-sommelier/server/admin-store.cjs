const { DatabaseSync } = require('node:sqlite');
const { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } = require('node:crypto');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const seed = require('../src/features/catalog/demo-catalog.json');
const STYLES = ['seco', 'meio_seco', 'doce', 'brut', 'demi_sec'];
const TYPES = ['red', 'white', 'rose', 'sparkling', 'fortified'];
class AdminError extends Error {
  constructor(status, code, message, fieldErrors = []) { super(message); Object.assign(this, { status, code, fieldErrors }); }
}
const digest = value => createHash('sha256').update(value).digest('hex');
function hashPassword(password) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function verifyPassword(password, stored) { const [salt, hash] = stored.split(':'); return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex')); }
const dummyHash = hashPassword(randomBytes(32).toString('hex'));
function validateWine(value) {
  const errors = [];
  const fail = (field, message) => errors.push({ field, message });
  for (const field of ['sku', 'name']) if (typeof value?.[field] !== 'string' || !value[field].trim() || value[field].length > (field === 'sku' ? 80 : 160)) fail(field, 'Preencha este campo dentro do limite de caracteres.');
  if (!TYPES.includes(value?.type)) fail('type', 'Selecione um tipo válido.');
  if (!STYLES.includes(value?.style)) fail('style', 'Selecione um estilo válido.');
  if (!Number.isSafeInteger(value?.priceCents) || value.priceCents < 0 || value.priceCents > 10000000) fail('priceCents', 'Informe um preço válido, até R$ 100.000,00.');
  if (value?.currency !== 'BRL') fail('currency', 'A moeda deste piloto é BRL.');
  for (const field of ['active', 'available', 'nonVintage']) if (typeof value?.[field] !== 'boolean') fail(field, 'Informe sim ou não.');
  for (const field of ['body', 'acidity', 'tannin', 'sweetness']) if (!(value?.[field] === null || Number.isInteger(value?.[field]) && value[field] >= 1 && value[field] <= 5)) fail(field, 'Use de 1 a 5, ou deixe sem informação.');
  for (const field of ['producer', 'country', 'region']) if (!(value?.[field] === null || typeof value?.[field] === 'string' && value[field].length <= 160)) fail(field, 'Limite de 160 caracteres.');
  for (const field of ['grapes', 'pairings']) if (!Array.isArray(value?.[field]) || value[field].length > 20 || value[field].some(item => typeof item !== 'string' || item.length > 160)) fail(field, 'Informe até 20 itens de até 160 caracteres.');
  if (!(value?.vintageYear === null || Number.isInteger(value?.vintageYear) && value.vintageYear >= 1800 && value.vintageYear <= new Date().getUTCFullYear() + 1)) fail('vintageYear', 'Safra inválida.');
  if (value?.nonVintage && value?.vintageYear !== null) fail('vintageYear', 'Um vinho não safrado não pode ter safra.');
  if (errors.length) throw new AdminError(400, 'VALIDATION', 'Revise os campos indicados.', errors);
  return Object.fromEntries(['sku', 'name', 'type', 'style', 'priceCents', 'currency', 'active', 'available', 'producer', 'country', 'region', 'vintageYear', 'nonVintage', 'body', 'acidity', 'tannin', 'sweetness', 'grapes', 'pairings'].map(key => [key, typeof value[key] === 'string' ? value[key].trim() : value[key]]));
}
function openStore(filename = path.join(__dirname, 'data', 'sommelier.sqlite')) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS establishments(slug TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS wines(id TEXT PRIMARY KEY, tenant TEXT NOT NULL REFERENCES establishments(slug), sku TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, UNIQUE(tenant,sku));
    CREATE TABLE IF NOT EXISTS admins(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,tenant TEXT NOT NULL REFERENCES establishments(slug),password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'admin');
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,admin TEXT NOT NULL REFERENCES admins(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS resets(token TEXT PRIMARY KEY,admin TEXT NOT NULL REFERENCES admins(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS imports(id TEXT PRIMARY KEY,tenant TEXT NOT NULL REFERENCES establishments(slug),data TEXT NOT NULL);
  `);
  if (!db.prepare('SELECT 1 FROM establishments LIMIT 1').get()) {
    db.exec('BEGIN');
    try {
      for (const establishment of seed.establishments) {
        const { wines, ...data } = establishment;
        db.prepare('INSERT INTO establishments(slug,data) VALUES(?,?)').run(data.slug, JSON.stringify({ ...data, demo: true, active: true, currency: 'BRL', notice: '18+ · Beba com moderação.', priceBands: [10000,15000,20000] }));
        for (const wine of wines) db.prepare('INSERT INTO wines(id,tenant,sku,data) VALUES(?,?,?,?)').run(wine.wineId, data.slug, wine.wineId, JSON.stringify({ ...wine, sku: wine.wineId, style: wine.type === 'sparkling' ? wine.sweetness >= 4 ? 'doce' : 'brut' : wine.sweetness >= 4 ? 'doce' : 'seco' }));
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const mapWine = row => row ? { ...JSON.parse(row.data), wineId: row.id, version: row.version } : null;
  function establishment(slug, publicOnly = false) {
    const row = db.prepare('SELECT * FROM establishments WHERE slug=?').get(slug);
    if (!row) return null;
    const stored = JSON.parse(row.data);
    const data = { ...stored, demo: stored.demo ?? ['casa-da-uva','mesa-do-vale'].includes(slug), version: row.version };
    if (publicOnly && !data.active) return null;
    return { ...data, wines: db.prepare('SELECT * FROM wines WHERE tenant=? ORDER BY rowid').all(slug).map(mapWine).filter(wine => !publicOnly || wine.active) };
  }
  function listEstablishments() { return db.prepare('SELECT slug FROM establishments ORDER BY rowid').all().map(row => establishment(row.slug, true)).filter(Boolean); }
  function saveWine(tenant, value, id) {
    const wine = validateWine(value);
    const current = id ? db.prepare('SELECT * FROM wines WHERE id=? AND tenant=?').get(id, tenant) : null;
    if (id && !current) throw new AdminError(404, 'NOT_FOUND', 'Vinho não encontrado neste estabelecimento.');
    if (current && current.version !== value.version) throw new AdminError(409, 'VERSION_CONFLICT', 'Este vinho foi alterado em outra sessão. Recarregue a ficha antes de salvar.');
    const duplicate = db.prepare('SELECT id FROM wines WHERE tenant=? AND sku=?').get(tenant, wine.sku);
    if (duplicate && duplicate.id !== id) throw new AdminError(409, 'SKU_CONFLICT', 'Este SKU já está em uso.', [{ field: 'sku', message: 'Use um SKU único nesta carta.' }]);
    const wineId = id || randomUUID();
    if (current) db.prepare('UPDATE wines SET sku=?, data=?, version=version+1 WHERE id=? AND tenant=?').run(wine.sku, JSON.stringify(wine), id, tenant);
    else db.prepare('INSERT INTO wines(id,tenant,sku,data) VALUES(?,?,?,?)').run(wineId, tenant, wine.sku, JSON.stringify(wine));
    db.prepare('UPDATE establishments SET version=version+1 WHERE slug=?').run(tenant);
    return mapWine(db.prepare('SELECT * FROM wines WHERE id=? AND tenant=?').get(wineId, tenant));
  }
  function provision({ email, name, slug, establishmentName, password }) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !name?.trim()) throw new AdminError(400, 'VALIDATION', 'E-mail, nome ou identificador inválido.');
    if (password.length < 12 || password.length > 128) throw new AdminError(400, 'VALIDATION', 'Use uma senha de 12 a 128 caracteres.');
    if (db.prepare('SELECT id FROM admins WHERE email=?').get(email.toLowerCase())) throw new AdminError(409, 'EXISTS', 'Já existe acesso para este e-mail.');
    db.exec('BEGIN IMMEDIATE');
    try {
      if (!establishment(slug)) {
        if (!establishmentName?.trim()) throw new AdminError(400, 'VALIDATION', 'Informe o nome do novo estabelecimento.');
        db.prepare('INSERT INTO establishments(slug,data) VALUES(?,?)').run(slug, JSON.stringify({ slug, name: establishmentName.trim(), demo: false, welcome: 'Encontre o vinho do seu momento.', active: true, currency: 'BRL', notice: '18+ · Beba com moderação.', priceBands: [10000,15000,20000] }));
      }
      const id = randomUUID();
      db.prepare('INSERT INTO admins(id,email,name,tenant,password) VALUES(?,?,?,?,?)').run(id, email.toLowerCase(), name.trim(), slug, hashPassword(password));
      db.exec('COMMIT'); return { id, email, slug };
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function login(email, password, now = Date.now()) {
    const user = db.prepare('SELECT * FROM admins WHERE email=?').get(String(email || '').toLowerCase().trim());
    const valid = verifyPassword(String(password || '').slice(0,128), user?.password || dummyHash);
    if (!user || !valid) throw new AdminError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
    const token = randomBytes(32).toString('hex');
    const csrf = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token), user.id, csrf, now + 8 * 3600000);
    return { token, csrf, expiresAt: new Date(now + 8 * 3600000).toISOString() };
  }
  function authenticate(token, csrf, mutation = false, now = Date.now()) {
    const row = token && db.prepare('SELECT a.id,a.email,a.name,a.tenant,a.role,s.csrf,s.expires FROM sessions s JOIN admins a ON a.id=s.admin WHERE s.token=? AND s.expires>?').get(digest(token), now);
    if (!row) throw new AdminError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.');
    if (row.role !== 'admin') throw new AdminError(403, 'FORBIDDEN', 'Este perfil não tem permissão administrativa.');
    if (mutation && (typeof csrf !== 'string' || Buffer.byteLength(csrf) !== Buffer.byteLength(row.csrf) || !timingSafeEqual(Buffer.from(csrf), Buffer.from(row.csrf)))) throw new AdminError(403, 'CSRF', 'Não foi possível validar esta operação. Atualize a página.');
    return { user: { id: row.id, email: row.email, name: row.name, role: row.role }, tenant: row.tenant, csrfToken: row.csrf, expiresAt: new Date(row.expires).toISOString() };
  }
  function logout(token) { if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token)); }
  function requestReset(email, now = Date.now()) {
    const user = db.prepare('SELECT id FROM admins WHERE email=?').get(String(email || '').toLowerCase().trim());
    if (!user) return null;
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM resets WHERE admin=? OR expires<=?').run(user.id, now);
    db.prepare('INSERT INTO resets VALUES(?,?,?)').run(digest(token), user.id, now+1800000);
    return { token, expiresAt: new Date(now+1800000).toISOString() };
  }
  function confirmReset(token, password, now = Date.now()) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new AdminError(400, 'VALIDATION', 'Use uma senha de 12 a 128 caracteres.', [{ field: 'password', message: 'A senha deve ter entre 12 e 128 caracteres.' }]);
    const reset = typeof token === 'string' && db.prepare('SELECT * FROM resets WHERE token=? AND expires>?').get(digest(token), now);
    if (!reset) throw new AdminError(400, 'INVALID_RESET', 'Link inválido ou expirado. Solicite uma nova recuperação.');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE admins SET password=? WHERE id=?').run(hashPassword(password), reset.admin);
      db.prepare('DELETE FROM sessions WHERE admin=?').run(reset.admin);
      db.prepare('DELETE FROM resets WHERE admin=?').run(reset.admin);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return { db, establishment, listEstablishments, saveWine, provision, login, authenticate, logout, requestReset, confirmReset, close: () => db.close() };
}
module.exports = { openStore, AdminError, validateWine, STYLES, TYPES };
