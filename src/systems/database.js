import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '../../../data/tickets.db');

if (!existsSync(path.dirname(DB_PATH))) {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous  = NORMAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id     TEXT    UNIQUE NOT NULL,
    guild_id       TEXT    NOT NULL,
    user_id        TEXT    NOT NULL,
    category       TEXT    NOT NULL,
    sub_type       TEXT,
    priority       TEXT    DEFAULT 'low',
    status         TEXT    DEFAULT 'open',
    claimed_by     TEXT,
    bug_tags       TEXT,
    answers        TEXT,
    created_at     INTEGER DEFAULT (unixepoch()),
    last_activity  INTEGER DEFAULT (unixepoch()),
    closed_at      INTEGER,
    closed_by      TEXT,
    close_reason   TEXT,
    response_time  INTEGER
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id   INTEGER NOT NULL REFERENCES tickets(id),
    user_id     TEXT    NOT NULL,
    username    TEXT    NOT NULL,
    avatar_url  TEXT,
    content     TEXT,
    attachments TEXT,
    timestamp   INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT,
    ticket_id  INTEGER,
    user_id    TEXT,
    staff_id   TEXT,
    action     TEXT    NOT NULL,
    detail     TEXT,
    timestamp  INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS cooldowns (
    user_id    TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    last_try   INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS waitlist (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT    NOT NULL,
    user_id     TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    sub_type    TEXT,
    answers     TEXT,
    bug_tags    TEXT,
    priority    INTEGER DEFAULT 0,
    position    INTEGER NOT NULL,
    created_at  INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id        TEXT PRIMARY KEY,
    tickets_enabled INTEGER DEFAULT 1,
    updated_at      INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS blacklist (
    user_id    TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    reason     TEXT,
    added_by   TEXT,
    added_at   INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
  );
`);

const n = v => (typeof v === 'bigint' ? Number(v) : v);

export function createTicket(data) {
  const r = db.prepare(`
    INSERT INTO tickets (channel_id, guild_id, user_id, category, sub_type, bug_tags, answers)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(data.channelId), String(data.guildId), String(data.userId),
    String(data.category),
    data.subType   != null ? String(data.subType)            : null,
    data.bugTags   != null ? JSON.stringify(data.bugTags)    : null,
    data.answers   != null ? JSON.stringify(data.answers)    : '{}',
  );
  return n(r.lastInsertRowid);
}

export function getTicket(channelId) {
  const t = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
  if (!t) return null;
  try { t.answers = JSON.parse(t.answers); } catch { t.answers = {}; }
  try { t.bugTags = t.bug_tags ? JSON.parse(t.bug_tags) : []; } catch { t.bugTags = []; }
  return t;
}

export function getTicketById(id) {
  const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  if (!t) return null;
  try { t.answers = JSON.parse(t.answers); } catch { t.answers = {}; }
  try { t.bugTags = t.bug_tags ? JSON.parse(t.bug_tags) : []; } catch { t.bugTags = []; }
  return t;
}

export function countAllOpenTickets(guildId) {
  return n(db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE guild_id=? AND status='open'`).get(guildId).c);
}

export function countOpenByCategory(userId, guildId, category) {
  return n(db.prepare(`
    SELECT COUNT(*) as c FROM tickets
    WHERE user_id=? AND guild_id=? AND category=? AND status='open'
  `).get(userId, guildId, category).c);
}

export function getLastAppealTimestamp(userId, guildId, category) {
  const row = db.prepare(`
    SELECT MAX(closed_at) as last FROM tickets
    WHERE user_id=? AND guild_id=? AND category=? AND status='closed'
  `).get(userId, guildId, category);
  return row?.last ?? null;
}

export function closeTicket(channelId, closedBy, reason) {
  const now    = Math.floor(Date.now() / 1000);
  const ticket = getTicket(channelId);
  const elapsed = ticket ? now - ticket.created_at : 0;
  db.prepare(`
    UPDATE tickets
    SET status='closed', closed_at=?, closed_by=?, close_reason=?, response_time=?
    WHERE channel_id=?
  `).run(now, closedBy, reason ?? null, elapsed, channelId);
}

export function claimTicket(channelId, staffId) {
  db.prepare('UPDATE tickets SET claimed_by=? WHERE channel_id=?').run(staffId, channelId);
}

export function setPriority(channelId, priority) {
  db.prepare('UPDATE tickets SET priority=? WHERE channel_id=?').run(priority, channelId);
}

export function touchActivity(channelId) {
  db.prepare('UPDATE tickets SET last_activity=unixepoch() WHERE channel_id=?').run(channelId);
}

export function getInactiveTickets(hours) {
  const cutoff = Math.floor(Date.now() / 1000) - hours * 3600;
  return db.prepare(`SELECT * FROM tickets WHERE status='open' AND last_activity < ?`).all(cutoff);
}

export function getOpenTickets(guildId) {
  return db.prepare(`SELECT * FROM tickets WHERE guild_id=? AND status='open'`).all(guildId);
}

export function forceCloseOrphan(channelId) {
  db.prepare(`
    UPDATE tickets SET status='closed', closed_at=unixepoch(), close_reason='Channel no longer exists'
    WHERE channel_id=? AND status='open'
  `).run(channelId);
}


export function saveMessage(ticketId, data) {
  db.prepare(`
    INSERT INTO ticket_messages (ticket_id, user_id, username, avatar_url, content, attachments, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    ticketId, data.userId, data.username,
    data.avatarUrl ?? null, data.content ?? null,
    data.attachments ?? null,
    Math.floor(Date.now() / 1000),
  );
}

export function getMessages(ticketId) {
  return db.prepare('SELECT * FROM ticket_messages WHERE ticket_id=? ORDER BY timestamp ASC').all(ticketId);
}


export function auditLog(data) {
  db.prepare(`
    INSERT INTO audit_log (guild_id, ticket_id, user_id, staff_id, action, detail)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.guildId ?? null, data.ticketId ?? null,
    data.userId  ?? null, data.staffId  ?? null,
    data.action, data.detail ?? null,
  );
}


export function getCooldown(userId, guildId) {
  return db.prepare('SELECT * FROM cooldowns WHERE user_id=? AND guild_id=?').get(userId, guildId);
}

export function setCooldown(userId, guildId) {
  db.prepare(`INSERT OR REPLACE INTO cooldowns (user_id, guild_id, last_try) VALUES (?, ?, ?)`).run(
    userId, guildId, Math.floor(Date.now() / 1000),
  );
}

export function addToWaitlist(data) {
  const guildId  = String(data.guildId);
  const userId   = String(data.userId);
  const maxPos   = db.prepare(`SELECT MAX(position) as m FROM waitlist WHERE guild_id=?`).get(guildId);
  let   position = n(maxPos?.m ?? 0) + 1;

  const isPriority = !!data.priority;
  if (isPriority) {
    const firstNormal = db.prepare(
      `SELECT MIN(position) as p FROM waitlist WHERE guild_id=? AND priority=0`
    ).get(guildId);
    if (firstNormal?.p != null) {
      db.prepare(`UPDATE waitlist SET position=position+1 WHERE guild_id=? AND priority=0`).run(guildId);
      position = n(firstNormal.p);
    }
  }

  db.prepare(`
    INSERT INTO waitlist (guild_id, user_id, category, sub_type, answers, bug_tags, priority, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId, userId, String(data.category),
    data.subType  != null ? String(data.subType)            : null,
    data.answers  != null ? JSON.stringify(data.answers)    : '{}',
    data.bugTags  != null ? JSON.stringify(data.bugTags)    : null,
    isPriority ? 1 : 0,
    position,
  );
  return position;
}

export function getWaitlistCount(guildId) {
  return n(db.prepare(`SELECT COUNT(*) as c FROM waitlist WHERE guild_id=?`).get(guildId).c);
}

export function getWaitlistPosition(userId, guildId) {
  const row = db.prepare(`SELECT position FROM waitlist WHERE user_id=? AND guild_id=? LIMIT 1`).get(userId, guildId);
  if (!row) return null;
  const ahead = n(db.prepare(`SELECT COUNT(*) as c FROM waitlist WHERE guild_id=? AND position < ?`).get(guildId, row.position).c);
  return ahead + 1;
}

export function isInWaitlist(userId, guildId) {
  return !!db.prepare(`SELECT 1 FROM waitlist WHERE user_id=? AND guild_id=?`).get(userId, guildId);
}

export function getNextInWaitlist(guildId) {
  const row = db.prepare(`SELECT * FROM waitlist WHERE guild_id=? ORDER BY position ASC LIMIT 1`).get(guildId);
  if (!row) return null;
  try { row.answers = JSON.parse(row.answers); } catch { row.answers = {}; }
  try { row.bugTags = row.bug_tags ? JSON.parse(row.bug_tags) : []; } catch { row.bugTags = []; }
  return row;
}

export function removeFromWaitlist(id) {
  db.prepare(`DELETE FROM waitlist WHERE id=?`).run(id);
}

export function removeUserFromWaitlist(userId, guildId) {
  db.prepare(`DELETE FROM waitlist WHERE user_id=? AND guild_id=?`).run(userId, guildId);
}

export function getAllWaitlistEntries(guildId) {
  return db.prepare(`SELECT * FROM waitlist WHERE guild_id=? ORDER BY position ASC`).all(guildId);
}

export function clearWaitlist(guildId) {
  db.prepare(`DELETE FROM waitlist WHERE guild_id=?`).run(guildId);
}

export function isTicketSystemEnabled(guildId) {
  const row = db.prepare(`SELECT tickets_enabled FROM guild_settings WHERE guild_id=?`).get(guildId);
  return row ? !!row.tickets_enabled : true;
}

export function setTicketSystemEnabled(guildId, enabled) {
  db.prepare(`
    INSERT INTO guild_settings (guild_id, tickets_enabled, updated_at) VALUES (?, ?, unixepoch())
    ON CONFLICT(guild_id) DO UPDATE SET tickets_enabled=excluded.tickets_enabled, updated_at=unixepoch()
  `).run(guildId, enabled ? 1 : 0);
}

export function isBlacklisted(userId, guildId) {
  return !!db.prepare(`SELECT 1 FROM blacklist WHERE user_id=? AND guild_id=?`).get(userId, guildId);
}

export function addToBlacklist(userId, guildId, reason, addedBy) {
  db.prepare(`
    INSERT OR REPLACE INTO blacklist (user_id, guild_id, reason, added_by, added_at)
    VALUES (?, ?, ?, ?, unixepoch())
  `).run(userId, guildId, reason ?? null, addedBy ?? null);
}

export function removeFromBlacklist(userId, guildId) {
  db.prepare(`DELETE FROM blacklist WHERE user_id=? AND guild_id=?`).run(userId, guildId);
}

export function getAllBlacklisted(guildId) {
  return db.prepare(`SELECT * FROM blacklist WHERE guild_id=? ORDER BY added_at DESC`).all(guildId);
}
