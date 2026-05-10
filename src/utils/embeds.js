// ══════════════════════════════════════════════════════
// 🎨  EMBEDS.JS — All embeds and component builders
// ══════════════════════════════════════════════════════

import {
  EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} from 'discord.js';
import cfg from '../../config/config.js';

const { colors, emojis } = cfg;

// ─── Basic helpers ────────────────────────────────────
export const ok   = (t, d) => new EmbedBuilder().setColor(colors.success).setTitle(`✅ ${t}`).setDescription(d).setTimestamp();
export const err  = (t, d) => new EmbedBuilder().setColor(colors.error).setTitle(`❌ ${t}`).setDescription(d).setTimestamp();
export const warn = (t, d) => new EmbedBuilder().setColor(colors.warning).setTitle(`⚠️ ${t}`).setDescription(d).setTimestamp();
export const info = (t, d) => new EmbedBuilder().setColor(colors.info).setTitle(`ℹ️ ${t}`).setDescription(d).setTimestamp();

// ─── Panel ───────────────────────────────────────────
export function panelEmbed(guildName, enabled = true) {
  const statusLine = enabled
    ? '✅ Support is **online** — we\'re here to help!'
    : '🔴 Support is currently **offline** — try again later';

  return new EmbedBuilder()
    .setColor(enabled ? colors.ticket : colors.close)
    .setTitle(`🎫  ${guildName} — Support Center`)
    .setDescription([
      `> ${statusLine}`,
      '',
      '## How to get help',
      '> **1.** Click **Create Ticket** below',
      '> **2.** Select the category that fits your issue',
      '> **3.** Read the rules and fill in the form',
      '> **4.** A staff member will respond shortly',
      '',
      '## Categories',
      cfg.categories.map(c => `> ${c.label} — *${c.description}*`).join('\n'),
      '',
      '-# ⚠️ Abusing the ticket system may result in a **permanent ban** from support.',
    ].join('\n'))
    .setTimestamp()
    .setFooter({ text: 'Click the button below to open a ticket' });
}

export function panelRow(enabled = true) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open').setLabel('Create Ticket').setEmoji('🎫')
      .setStyle(ButtonStyle.Primary).setDisabled(!enabled),
  );
}

// ─── Category select ──────────────────────────────────
export function categorySelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('📁 Choose a category...')
      .addOptions(cfg.categories.map(c =>
        new StringSelectMenuOptionBuilder().setLabel(c.label).setValue(c.id).setDescription(c.description),
      )),
  );
}

// ─── Rules screen ─────────────────────────────────────
export function rulesEmbed(cat) {
  const rules = cat?.rules ?? [];
  return new EmbedBuilder()
    .setColor(cat?.color ?? colors.primary)
    .setTitle(`📋  Rules — ${cat?.label ?? 'Ticket'}`)
    .setDescription(
      '> Read the rules below **carefully** before continuing.\n' +
      '> By clicking **I Agree**, you confirm you have read and accepted them.\n\n' +
      (rules.length ? rules.join('\n') : '*No specific rules.*') +
      '\n\n-# Failure to follow rules may result in your ticket being closed without response.'
    )
    .setTimestamp();
}

export function rulesRow(categoryId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tkt_rules_agree_${categoryId}`).setLabel('I Agree — Continue').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tkt_rules_cancel').setLabel('Cancel').setEmoji('❌').setStyle(ButtonStyle.Secondary),
  );
}

// ─── Media platform picker ────────────────────────────
export function mediaPlatformEmbed() {
  return new EmbedBuilder()
    .setColor(colors.media)
    .setTitle('🎥  Media Application — Select Platform')
    .setDescription('Which platform do you create content on?\n\nSelect the platform that best represents your channel.')
    .setTimestamp();
}

export function mediaPlatformRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('media_platform_youtube').setLabel('YouTube').setEmoji('▶️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('media_platform_tiktok').setLabel('TikTok').setEmoji('🎵').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('media_platform_twitch').setLabel('Twitch').setEmoji('🟣').setStyle(ButtonStyle.Primary),
  );
}

// ─── Connection FAQ ───────────────────────────────────
export function connectionFaqEmbed() {
  const tips = cfg.connectionFaq
    .map(f => `### ${f.emoji} ${f.title}\n${f.fix}`)
    .join('\n\n');

  return new EmbedBuilder()
    .setColor(colors.info)
    .setTitle('🌐  Connection Issues — Quick Fixes')
    .setDescription(
      '> Try the solutions below **before** opening a ticket.\n\n' +
      tips +
      '\n\n> Did one of these fix your issue?'
    )
    .setTimestamp();
}

export function connectionFaqRow(categoryId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`faq_solved_${categoryId}`).setLabel('✅ Yes, fixed!').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`faq_not_solved_${categoryId}`).setLabel('❌ No, still need help').setStyle(ButtonStyle.Danger),
  );
}

// ─── Ticket open ──────────────────────────────────────
export function ticketOpenEmbed(user, ticket, cat) {
  const answers  = ticket.answers ?? {};
  const priority = cfg.priorities.find(p => p.id === ticket.priority) ?? cfg.priorities[0];
  const fields   = Object.entries(answers)
    .filter(([, v]) => v)
    .map(([k, v]) => ({ name: k, value: String(v).slice(0, 1024), inline: false }));

  const embed = new EmbedBuilder()
    .setColor(cat?.color ?? colors.ticket)
    .setTitle(`🎫  Ticket #${ticket.id} — ${cat?.label ?? ticket.category}`)
    .setDescription(`Welcome ${user}!\nA staff member will be with you shortly. Please **do not ping** anyone.`)
    .addFields(
      { name: '👤 User',       value: `${user} \`(${user.id})\``,          inline: true },
      { name: '📁 Category',   value: cat?.label ?? ticket.category,        inline: true },
      { name: '⚠️ Priority',   value: priority.label,                       inline: true },
      { name: '🕐 Created',    value: `<t:${ticket.created_at}:F>`,         inline: true },
      ...(ticket.sub_type ? [{ name: '🔖 Platform', value: `\`${ticket.sub_type}\``, inline: true }] : []),
      ...fields,
    )
    .setThumbnail(user.displayAvatarURL?.({ dynamic: true }) ?? null)
    .setFooter({ text: `Ticket ID: ${ticket.id}` })
    .setTimestamp();

  // Bug tags
  if (ticket.bugTags?.length) {
    embed.addFields({ name: '🏷️ Auto Tags', value: ticket.bugTags.join(' • '), inline: false });
  }

  return embed;
}

// ─── Staff control row ────────────────────────────────
export function ticketStaffRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tkt_claim').setLabel('Claim').setEmoji('📌').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tkt_priority').setLabel('Priority').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tkt_add').setLabel('Add User').setEmoji('👤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tkt_remove').setLabel('Remove User').setEmoji('❌').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tkt_transcript').setLabel('Transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
  );
}

// ─── User control row ─────────────────────────────────
export function ticketUserRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tkt_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );
}

// ─── Staff close reason select ────────────────────────
const FALLBACK_REASONS = [
  { label: '✅ Issue Resolved',      value: 'resolved',  description: 'The issue has been resolved' },
  { label: '💤 User Inactive',        value: 'inactive',  description: 'User did not respond' },
  { label: '🔁 Duplicate',           value: 'duplicate', description: 'Already reported/opened' },
  { label: '❌ Invalid Request',     value: 'invalid',   description: 'Request was not valid' },
  { label: '✏️ Other (type below)',  value: 'other',     description: 'Enter a custom reason' },
];

export function staffCloseReasonRow(category = null) {
  const cat     = category ? cfg.categories.find(c => c.id === category) : null;
  const reasons = cat?.closeReasons ?? FALLBACK_REASONS;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('tkt_staff_close_reason')
      .setPlaceholder('Select a close reason...')
      .addOptions(reasons.map(r =>
        new StringSelectMenuOptionBuilder().setLabel(r.label).setValue(r.value).setDescription(r.description),
      )),
  );
}

// ─── Priority select ──────────────────────────────────
export function prioritySelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('tkt_set_priority')
      .setPlaceholder('Choose priority level...')
      .addOptions(cfg.priorities.map(p =>
        new StringSelectMenuOptionBuilder().setLabel(p.label).setValue(p.id),
      )),
  );
}

// ─── Log embed ────────────────────────────────────────
export function logEmbed(action, ticket, userId, staffId = null, extra = {}) {
  const map = {
    open:          { color: colors.success,  title: '🎫  Ticket Opened' },
    close:         { color: colors.error,    title: '🔒  Ticket Closed by Staff' },
    close_user:    { color: colors.error,    title: '🔒  Ticket Closed by User' },
    claim:         { color: colors.info,     title: '📌  Ticket Claimed' },
    priority:      { color: colors.warning,  title: '⚠️  Priority Changed' },
    add:           { color: colors.success,  title: '👤  User Added' },
    remove:        { color: colors.error,    title: '❌  User Removed' },
    blocked:       { color: colors.error,    title: '⛔  Access Blocked' },
    autoclose:     { color: colors.close,    title: '⏲️  Auto-Closed (Inactivity)' },
    waitlist_add:  { color: colors.warning,  title: '⏳  Added to Waitlist' },
    waitlist_out:  { color: colors.success,  title: '✅  Promoted from Waitlist' },
    system_on:     { color: colors.success,  title: '✅  Ticket System Enabled' },
    system_off:    { color: colors.error,    title: '🔴  Ticket System Disabled' },
    force_close:   { color: colors.error,    title: '🔒  Force Closed by Staff' },
    blacklist_add: { color: colors.critical, title: '⛔  User Blacklisted' },
    blacklist_rem: { color: colors.success,  title: '✅  User Removed from Blacklist' },
    unauthorized:  { color: colors.error,    title: '🚫  Unauthorised Interaction' },
  };

  const a         = map[action] ?? map.open;
  const cat       = ticket?.category ? cfg.categories.find(c => c.id === ticket.category) : null;
  const priority  = ticket?.priority ? cfg.priorities.find(p => p.id === ticket.priority)  : null;
  const ts        = Math.floor(Date.now() / 1000);
  const fields    = [];

  if (ticket?.id)          fields.push({ name: 'Ticket ID',   value: `#${ticket.id}`,            inline: true });
  if (cat)                 fields.push({ name: 'Category',    value: cat.label,                  inline: true });
  if (priority)            fields.push({ name: 'Priority',    value: priority.label,             inline: true });
  if (ticket?.user_id)     fields.push({ name: 'User',        value: `<@${ticket.user_id}>`,     inline: true });
  if (ticket?.claimed_by)  fields.push({ name: 'Claimed by',  value: `<@${ticket.claimed_by}>`,  inline: true });
  if (staffId)             fields.push({ name: 'Staff',       value: `<@${staffId}>`,            inline: true });
  if (userId && userId !== ticket?.user_id) fields.push({ name: 'Target', value: `<@${userId}>`, inline: true });
  if (extra.duration)      fields.push({ name: 'Duration',    value: extra.duration,             inline: true });
  fields.push(               { name: 'Timestamp',             value: `<t:${ts}:F>`,              inline: true });
  if (extra.reason)        fields.push({ name: 'Reason',      value: extra.reason,               inline: false });
  if (extra.oldPriority)   fields.push({ name: 'Old',         value: extra.oldPriority,          inline: true });
  if (extra.newPriority)   fields.push({ name: 'New',         value: extra.newPriority,          inline: true });
  if (extra.detail)        fields.push({ name: 'Detail',      value: extra.detail,               inline: false });
  if (extra.position)      fields.push({ name: 'Queue Pos',   value: extra.position,             inline: true });
  if (ticket?.bugTags?.length) fields.push({ name: '🏷️ Tags', value: ticket.bugTags.join(' • '), inline: false });

  return new EmbedBuilder().setColor(a.color).setTitle(a.title).addFields(fields).setTimestamp();
}

// ─── High priority alert ──────────────────────────────
export function highPriorityAlert(ticket, changedBy, cat) {
  return new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('🚨  HIGH PRIORITY — Immediate Attention Required')
    .setDescription(
      `Ticket **#${ticket.id}** has been escalated.\n\n` +
      `**Category:** ${cat?.label ?? ticket.category}\n` +
      `**User:** <@${ticket.user_id}>\n` +
      `**Channel:** <#${ticket.channel_id}>\n` +
      `**Escalated by:** <@${changedBy}>\n\n` +
      '> Staff must respond **immediately**.'
    )
    .setTimestamp();
}

// ─── Blocked embed ────────────────────────────────────
export function blockedEmbed(reason) {
  return new EmbedBuilder()
    .setColor(colors.error)
    .setTitle('⛔  Access Denied')
    .setDescription(reason)
    .setTimestamp();
}

// ─── System offline ───────────────────────────────────
export function systemOffEmbed() {
  return new EmbedBuilder()
    .setColor(colors.error)
    .setTitle('🔴  Support Offline')
    .setDescription('The ticket system is currently **offline**.\n\nPlease try again later or contact a staff member directly.')
    .setTimestamp();
}

// ─── Waitlist ─────────────────────────────────────────
export function waitlistEmbed(position, total, isPriority = false) {
  const eta = position * 30;
  return new EmbedBuilder()
    .setColor(isPriority ? colors.store : colors.warning)
    .setTitle('⏳  Added to the Waitlist')
    .setDescription(
      (isPriority ? '⭐ **VIP/Donor priority has been applied!**\n\n' : '') +
      'The support system is at capacity. Your spot is saved and your ticket will be **created automatically** when one frees up.\n\n' +
      `**Your position:** \`${position} / ${total}\`\n` +
      `**Estimated wait:** ~${eta} minute(s)\n\n` +
      '> You will receive a **DM** when your ticket is ready.\n' +
      '-# You can only hold one position in the waitlist at a time.'
    )
    .setTimestamp();
}

export function waitlistPromotedEmbed(ticket, cat) {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTitle('🎉  Your Waitlist Spot is Ready!')
    .setDescription(
      `A slot opened up — your ticket has been **automatically created**!\n\n` +
      `**Ticket ID:** \`#${ticket.id}\`\n` +
      `**Category:** ${cat?.label ?? ticket.category}\n\n` +
      'Head to your ticket channel — staff will be with you shortly.'
    )
    .setTimestamp();
}

// ─── Queue list ───────────────────────────────────────
export function queueListEmbed(entries, guildName) {
  const list = entries.length === 0
    ? '*The waitlist is empty.*'
    : entries.map((e, i) => {
        const flag = e.priority ? ' ⭐' : '';
        return `**${i + 1}.** <@${e.user_id}>${flag} — \`${e.category}\` — <t:${e.created_at}:R>`;
      }).join('\n');

  return new EmbedBuilder()
    .setColor(colors.info)
    .setTitle(`⏳  Support Waitlist — ${guildName}`)
    .setDescription(list)
    .setFooter({ text: `${entries.length} user(s) waiting • ⭐ = VIP/Donor priority` })
    .setTimestamp();
}

// ─── DM — ticket opened ───────────────────────────────
export function dmOpenEmbed(ticket, cat) {
  return new EmbedBuilder()
    .setColor(cat?.color ?? colors.ticket)
    .setTitle('🎫  Your Ticket Has Been Created')
    .setDescription(
      'Your support ticket is now open!\n\n' +
      `**Ticket ID:** \`#${ticket.id}\`\n` +
      `**Category:** ${cat?.label ?? ticket.category}\n` +
      `**Priority:** ${cfg.priorities.find(p => p.id === ticket.priority)?.label ?? '🟢 Low'}\n` +
      `**Opened:** <t:${ticket.created_at}:F>\n\n` +
      'A staff member will respond shortly. Please be patient.'
    )
    .setTimestamp();
}

// ─── DM — ticket closed ───────────────────────────────
export function dmCloseEmbed(ticket, closedById, reason, cat, closedByStaff, guildName, channelName) {
  const duration   = ticket.response_time ? formatDuration(ticket.response_time) : 'N/A';
  const closedBy   = closedByStaff ? `<@${closedById}>` : 'You';
  const catLabel   = cat?.label ?? ticket.category ?? 'Unknown';
  const ticketName = channelName ? `\`${channelName}\`` : `\`ticket-${ticket.id}\``;

  return new EmbedBuilder()
    .setColor(colors.close)
    .setTitle('🔒  Your Ticket Has Been Closed')
    .setDescription(`Your ticket has been closed in **${guildName ?? 'the server'}**.`)
    .addFields(
      {
        name: '📋 Ticket Information',
        value: [
          `• **Open Date:** <t:${ticket.created_at}:F>`,
          `• **Category:** ${catLabel}`,
          `• **Ticket Name:** ${ticketName}`,
          ...(ticket.sub_type ? [`• **Platform:** \`${ticket.sub_type}\``] : []),
          ...(ticket.bugTags?.length ? [`• **Tags:** ${ticket.bugTags.join(' • ')}`] : []),
        ].join('\n'),
        inline: false,
      },
      {
        name: '🔒 Close Information',
        value: [
          `• **Closed By:** ${closedBy}`,
          ...(ticket.claimed_by && ticket.claimed_by !== closedById
            ? [`• **Handled By:** <@${ticket.claimed_by}>`] : []),
          `• **Close Date:** <t:${Math.floor(Date.now() / 1000)}:F>`,
          `• **Close Reason:** ${reason ?? 'No reason provided'}`,
          `• **Duration:** ${duration}`,
        ].join('\n'),
        inline: false,
      },
    )
    .setFooter({ text: 'If you have further questions, feel free to open a new ticket.' })
    .setTimestamp();
}

// ─── Staff closing message ────────────────────────────
export function staffClosingEmbed(staff) {
  return new EmbedBuilder()
    .setColor(colors.warning)
    .setTitle('🔒  Closing this Ticket')
    .setDescription(`${staff} is closing this ticket.\nPlease select a reason from the menu below.`)
    .setTimestamp();
}

// ─── User close request ───────────────────────────────
export function userCloseRequestEmbed(user, reason) {
  return new EmbedBuilder()
    .setColor(colors.warning)
    .setTitle('👤  User Requested Closure')
    .setDescription(`${user} has requested this ticket to be closed.\n\n**Reason:** ${reason}\n\nClosing now...`)
    .setTimestamp();
}

// ─── Auto-close warning ───────────────────────────────
export function autoCloseWarningEmbed(hoursLeft) {
  return new EmbedBuilder()
    .setColor(colors.warning)
    .setTitle('⏲️  Inactivity Warning')
    .setDescription(`This ticket has been **inactive** and will be **auto-closed in ${hoursLeft} hour(s)**.\n\nSend a message to reset the inactivity timer.`)
    .setTimestamp();
}

// ─── Blacklisted ─────────────────────────────────────
export function blacklistedEmbed(reason) {
  return new EmbedBuilder()
    .setColor(colors.critical)
    .setTitle('⛔  You are Blacklisted')
    .setDescription(
      'You have been **blacklisted from the ticket system** and cannot open tickets.\n\n' +
      (reason ? `**Reason:** ${reason}\n\n` : '') +
      'If you believe this is a mistake, contact a staff member directly.'
    )
    .setTimestamp();
}

// ─── Utility ──────────────────────────────────────────
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
