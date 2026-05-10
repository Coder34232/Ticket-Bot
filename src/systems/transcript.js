import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { AttachmentBuilder } from 'discord.js';
import cfg from '../../config/config.js';
import { getMessages } from './database.js';

const esc = s => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export async function generateTranscript(ticket, guild) {
  const messages  = getMessages(ticket.id);
  const cat       = cfg.categories.find(c => c.id === ticket.category);
  const priority  = cfg.priorities.find(p => p.id === ticket.priority);
  const folder    = cfg.limits.transcriptFolder;
  const answers   = ticket.answers ?? {};

  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });

  const createdDate = new Date(ticket.created_at * 1000).toLocaleString('en-GB');
  const closedDate  = ticket.closed_at ? new Date(ticket.closed_at * 1000).toLocaleString('en-GB') : 'Still Open';

  const messagesHTML = messages.length === 0
    ? '<p class="no-msg">No messages were recorded in this ticket.</p>'
    : messages.map(m => {
        const time    = new Date(m.timestamp * 1000).toLocaleString('en-GB');
        const avatar  = m.avatar_url
          ? `<img class="avatar" src="${esc(m.avatar_url)}" alt="" onerror="this.style.display='none'">`
          : `<div class="avatar-letter">${esc((m.username[0] ?? '?').toUpperCase())}</div>`;
        const attach  = m.attachments
          ? `<div class="attachment">📎 ${esc(m.attachments)}</div>` : '';
        const content = esc(m.content ?? '').replace(/\n/g, '<br>');
        return `
          <div class="msg">
            ${avatar}
            <div class="body">
              <div class="meta">
                <span class="name">${esc(m.username)}</span>
                <span class="uid">ID: ${esc(m.user_id)}</span>
                <span class="time">${esc(time)}</span>
              </div>
              <div class="content">${content || '<em class="empty">No text content</em>'}</div>
              ${attach}
            </div>
          </div>`;
      }).join('');

  const answersHTML = Object.keys(answers).length === 0 ? '' : `
    <div class="answers-section">
      <h2>📋 Form Answers</h2>
      ${Object.entries(answers).map(([q, a]) => `
        <div class="answer-card">
          <div class="q-label">${esc(q)}</div>
          <div class="a-value">${esc(a || '—').replace(/\n/g,'<br>')}</div>
        </div>`).join('')}
    </div>`;

  const tagsHTML = ticket.bugTags?.length ? `
    <div class="tags-section">
      ${ticket.bugTags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
    </div>` : '';

  const priorityColors = { low: '#57F287', medium: '#FEE75C', high: '#ED4245', critical: '#FF0000' };
  const prioColor = priorityColors[ticket.priority] ?? '#57F287';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transcript #${ticket.id} — ${esc(guild.name)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#0e1117;color:#e2e8f0;min-height:100vh;font-size:14px}

  .header{background:linear-gradient(135deg,#1a7f41,#2ecc71 60%,#1e8449);padding:30px 40px;border-bottom:3px solid #27ae60}
  .header h1{font-size:26px;font-weight:800;margin-bottom:6px;letter-spacing:.5px}
  .header p{font-size:13px;opacity:.8}

  .meta-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;padding:20px 40px;background:#0b0f18}
  .card{background:#161b27;border-radius:10px;padding:12px 16px;border-left:3px solid #2ecc71;transition:transform .1s}
  .card:hover{transform:translateX(2px)}
  .card .label{font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#64748b;margin-bottom:4px}
  .card .value{font-size:14px;font-weight:600;word-break:break-all}
  .badge{display:inline-block;padding:2px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase}
  .badge-open{background:#064e3b;color:#6ee7b7}
  .badge-closed{background:#450a0a;color:#fca5a5}
  .priority-badge{background:${prioColor}22;color:${prioColor};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;border:1px solid ${prioColor}44}

  .answers-section{padding:20px 40px;background:#0d1018;border-top:1px solid #1e293b}
  .answers-section h2{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:12px}
  .answer-card{background:#161b27;border-radius:8px;padding:12px 16px;margin-bottom:8px;border-left:3px solid #2ecc71}
  .q-label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
  .a-value{font-size:14px;line-height:1.6;word-break:break-word}

  .tags-section{padding:0 40px 16px;display:flex;flex-wrap:wrap;gap:8px}
  .tag{background:#1e293b;color:#94a3b8;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #334155}

  .messages-section{padding:20px 40px;max-width:900px;margin:0 auto}
  .messages-section h2{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #1e293b}
  .msg{display:flex;gap:12px;padding:10px 4px;border-bottom:1px solid #0f1623}
  .msg:hover{background:rgba(255,255,255,.015);border-radius:6px;padding:10px 8px;margin:0 -4px}
  .avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #1e293b}
  .avatar-letter{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1a7f41,#2ecc71);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0}
  .body{flex:1;min-width:0}
  .meta{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin-bottom:4px}
  .name{color:#2ecc71;font-weight:700;font-size:13px}
  .uid{color:#334155;font-size:10px;font-family:monospace}
  .time{color:#475569;font-size:11px;margin-left:auto}
  .content{font-size:13px;color:#cbd5e1;line-height:1.7;word-break:break-word}
  .attachment{margin-top:5px;color:#60a5fa;font-size:12px}
  .empty{color:#475569;font-style:italic}
  .no-msg{color:#475569;text-align:center;padding:40px}

  .footer{text-align:center;padding:24px;color:#334155;font-size:11px;border-top:1px solid #1e293b;margin-top:32px}
  .footer a{color:#2ecc71;text-decoration:none}
</style>
</head>
<body>
  <div class="header">
    <h1>📄 Ticket Transcript #${ticket.id}</h1>
    <p>${esc(guild.name)} • Generated on ${new Date().toLocaleString('en-GB')}</p>
  </div>

  <div class="meta-grid">
    <div class="card"><div class="label">🎫 Ticket ID</div><div class="value">#${ticket.id}</div></div>
    <div class="card"><div class="label">📁 Category</div><div class="value">${esc(cat?.label ?? ticket.category)}</div></div>
    <div class="card"><div class="label">📌 Status</div><div class="value"><span class="badge badge-${ticket.status}">${ticket.status}</span></div></div>
    <div class="card"><div class="label">⚠️ Priority</div><div class="value"><span class="priority-badge">${esc(priority?.label ?? ticket.priority)}</span></div></div>
    <div class="card"><div class="label">👤 User ID</div><div class="value" style="font-family:monospace;font-size:11px">${ticket.user_id}</div></div>
    <div class="card"><div class="label">📅 Opened</div><div class="value">${esc(createdDate)}</div></div>
    <div class="card"><div class="label">🔒 Closed</div><div class="value">${esc(closedDate)}</div></div>
    ${ticket.claimed_by ? `<div class="card"><div class="label">📌 Claimed By</div><div class="value" style="font-family:monospace;font-size:11px">${ticket.claimed_by}</div></div>` : ''}
    ${ticket.response_time ? `<div class="card"><div class="label">⏱️ Duration</div><div class="value">${Math.floor(ticket.response_time/3600)}h ${Math.floor((ticket.response_time%3600)/60)}m</div></div>` : ''}
    ${ticket.close_reason ? `<div class="card" style="grid-column:1/-1"><div class="label">📝 Close Reason</div><div class="value">${esc(ticket.close_reason)}</div></div>` : ''}
    ${ticket.sub_type ? `<div class="card"><div class="label">🔖 Platform</div><div class="value">${esc(ticket.sub_type)}</div></div>` : ''}
  </div>

  ${tagsHTML}
  ${answersHTML}

  <div class="messages-section">
    <h2>💬 ${messages.length} Message(s)</h2>
    ${messagesHTML}
  </div>

  <div class="footer">
    🎮 Ticket Bot • ${esc(guild.name)} • Auto-generated transcript
  </div>
</body>
</html>`;

  const filePath = `${folder}ticket-${ticket.id}-${Date.now()}.html`;
  writeFileSync(filePath, html, 'utf8');
  return new AttachmentBuilder(filePath, { name: `transcript-ticket-${ticket.id}.html` });
}
