import { ChannelType, PermissionFlagsBits } from 'discord.js';
import cfg                    from '../../config/config.js';
import * as db                from './database.js';
import { generateTranscript } from './transcript.js';
import * as E                 from '../utils/embeds.js';
import * as M                 from '../utils/modals.js';
import { isStaff, hasPriority, checkCategoryAccess } from '../utils/permissions.js';

const MAX_TICKETS = () => Number(process.env.MAX_TICKETS ?? 50);

const SHORT_FIELDS = new Set([
  'minecraft_ign', 'ban_reason', 'mute_reason', 'staff_involved',
  'followers', 'avg_views', 'channel_link', 'reported_player', 'rule_broken',
  'evidence', 'screenshots', 'server_affected', 'purchase_id', 'store_username',
  'payment_method', 'error_message', 'region', 'using_vpn', 'since_when',
  'additional', 'user_id',
]);

export async function onOpenButton(interaction) {
  if (!db.isTicketSystemEnabled(interaction.guild.id)) {
    return interaction.reply({ embeds: [E.systemOffEmbed()], ephemeral: true });
  }

  if (db.isBlacklisted(interaction.user.id, interaction.guild.id)) {
    const bl = null;
    return interaction.reply({ embeds: [E.blacklistedEmbed(null)], ephemeral: true });
  }

  const cd  = db.getCooldown(interaction.user.id, interaction.guild.id);
  const now = Math.floor(Date.now() / 1000);
  if (cd && (now - cd.last_try) < cfg.limits.cooldownSeconds) {
    const left = cfg.limits.cooldownSeconds - (now - cd.last_try);
    return interaction.reply({
      embeds: [E.warn('Cooldown Active', `You must wait **${left}s** before trying again.`)],
      ephemeral: true,
    });
  }

  await interaction.reply({
    embeds:     [E.info('📁 Select Category', 'Choose the category that best fits your issue:')],
    components: [E.categorySelectRow()],
    ephemeral:  true,
  });
}

export async function onCategorySelect(interaction) {
  const categoryId = interaction.values[0];
  const cat        = cfg.categories.find(c => c.id === categoryId);
  if (!cat) return interaction.update({ embeds: [E.err('Unknown Category', 'Please try again.')], components: [] });

  const access = checkCategoryAccess(interaction.member, cat);
  if (!access.allowed) {
    db.auditLog({ guildId: interaction.guild.id, userId: interaction.user.id, action: 'blocked', detail: `${categoryId} — ${access.reason}` });
    await sendLog(interaction.client, 'blocked', { id: 0, channel_id: 'N/A', user_id: interaction.user.id, category: categoryId, priority: 'low' }, interaction.user.id, null, {
      detail: `<@${interaction.user.id}> was blocked from **${cat.label}**: ${access.reason}`,
    });
    return interaction.update({ embeds: [E.blockedEmbed(access.reason)], components: [] });
  }

  if (db.countOpenByCategory(interaction.user.id, interaction.guild.id, categoryId) >= cfg.limits.maxOpenPerCategory) {
    return interaction.update({
      embeds: [E.err('Ticket Already Open', `You already have an open **${cat.label}** ticket.\nPlease close it before opening a new one.`)],
      components: [],
    });
  }

  if (categoryId === 'ban_appeal' || categoryId === 'mute_appeal') {
    const lastAppeal = db.getLastAppealTimestamp(interaction.user.id, interaction.guild.id, categoryId);
    if (lastAppeal) {
      const cooldownSecs = cfg.limits.appealCooldownDays * 86400;
      const elapsed      = Math.floor(Date.now() / 1000) - lastAppeal;
      if (elapsed < cooldownSecs) {
        const nextAppeal = lastAppeal + cooldownSecs;
        return interaction.update({
          embeds: [E.err('Appeal Cooldown', `You have recently submitted an appeal for this category.\nYou can appeal again <t:${nextAppeal}:R>.`)],
          components: [],
        });
      }
    }
  }

  db.setCooldown(interaction.user.id, interaction.guild.id);

  return interaction.update({
    embeds:     [E.rulesEmbed(cat)],
    components: [E.rulesRow(categoryId)],
  });
}

export async function onRulesAgree(interaction, categoryId) {
  if (categoryId === 'media_app') {
    return interaction.update({
      embeds:     [E.mediaPlatformEmbed()],
      components: [E.mediaPlatformRow()],
    });
  }

  if (categoryId === 'connection') {
    return interaction.update({
      embeds:     [E.connectionFaqEmbed()],
      components: [E.connectionFaqRow(categoryId)],
    });
  }

  await interaction.showModal(M.getModalForCategory(categoryId));
}

export async function onRulesCancel(interaction) {
  return interaction.update({
    embeds: [E.info('Cancelled', 'No problem. Click **Create Ticket** again anytime.')],
    components: [],
  });
}

export async function onMediaPlatform(interaction, platform) {
  interaction.client._pending ??= new Map();
  interaction.client._pending.set(`media_${interaction.user.id}`, { platform });

  await interaction.showModal(M.getModalForCategory('media_app', { platform }));
}

export async function onFaqSolved(interaction) {
  return interaction.update({
    embeds: [E.ok('Glad it worked!', 'Your issue has been resolved.\n\nFeel free to open a new ticket if anything else comes up.')],
    components: [],
  });
}

export async function onFaqNotSolved(interaction, categoryId) {
  await interaction.showModal(M.getModalForCategory(categoryId));
}


export async function onModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const customId   = interaction.customId;
  const categoryId = modalToCategoryId(customId);
  const cat        = cfg.categories.find(c => c.id === categoryId);
  const answers    = extractAnswers(interaction);

  const mediaPending = interaction.client._pending?.get(`media_${interaction.user.id}`);
  const platform     = mediaPending?.platform ?? null;
  if (platform) interaction.client._pending?.delete(`media_${interaction.user.id}`);

  const tooShort = Object.entries(answers).find(
    ([k, v]) => v && v.trim().length < cfg.limits.minAnswerLength && !SHORT_FIELDS.has(k),
  );
  if (tooShort) {
    const label = labelAnswers(categoryId, { [tooShort[0]]: tooShort[1] });
    return interaction.editReply({
      embeds: [E.warn('Answer Too Short',
        `Your answer for **"${Object.keys(label)[0] ?? tooShort[0]}"** is too short.\n` +
        `Please provide at least **${cfg.limits.minAnswerLength} characters**.`)],
    });
  }

  const bugTags = categoryId === 'bug_report' ? detectBugTags(answers) : [];

  if (db.countAllOpenTickets(interaction.guild.id) >= MAX_TICKETS()) {
    return addToWaitlist(interaction, { categoryId, subType: platform, answers, bugTags });
  }

  await createTicketChannel(interaction, { categoryId, subType: platform, answers, bugTags });
}

async function addToWaitlist(interaction, data) {
  if (db.isInWaitlist(interaction.user.id, interaction.guild.id)) {
    const pos   = db.getWaitlistPosition(interaction.user.id, interaction.guild.id);
    const total = db.getWaitlistCount(interaction.guild.id);
    return interaction.editReply({
      embeds: [E.warn('Already in Waitlist', `You are already at position **${pos} / ${total}**.\nYou will be notified when your ticket is ready.`)],
    });
  }

  const isPriority = hasPriority(interaction.member);
  const position   = db.addToWaitlist({
    guildId:  interaction.guild.id,
    userId:   interaction.user.id,
    category: data.categoryId,
    subType:  data.subType ?? null,
    answers:  data.answers ?? {},
    bugTags:  data.bugTags ?? [],
    priority: isPriority,
  });
  const total = db.getWaitlistCount(interaction.guild.id);

  await interaction.editReply({ embeds: [E.waitlistEmbed(position, total, isPriority)] });

  db.auditLog({ guildId: interaction.guild.id, userId: interaction.user.id, action: 'waitlist_add', detail: `${position}/${total}` });
  await sendQueueLog(interaction.client, 'waitlist_add',
    { id: 0, channel_id: 'N/A', user_id: interaction.user.id, category: data.categoryId, priority: 'low' },
    interaction.user.id, null, { position: `${position} / ${total}` });
}

export async function promoteFromWaitlist(client, guild) {
  if (db.countAllOpenTickets(guild.id) >= MAX_TICKETS()) return;
  const next = db.getNextInWaitlist(guild.id);
  if (!next) return;

  db.removeFromWaitlist(next.id);
  try {
    const member = await guild.members.fetch(next.user_id).catch(() => null);
    if (!member) return;

    const fakeCtx = { guild, user: member.user, client, member, editReply: async () => {}, update: async () => {}, followUp: async () => {} };
    await createTicketChannel(fakeCtx, { categoryId: next.category, subType: next.sub_type, answers: next.answers, bugTags: next.bugTags ?? [] });

    const cat = cfg.categories.find(c => c.id === next.category);
    try { await member.user.send({ embeds: [E.waitlistPromotedEmbed({ id: '?', category: next.category }, cat)] }); } catch {}

    db.auditLog({ guildId: guild.id, userId: next.user_id, action: 'waitlist_out' });
    await sendQueueLog(client, 'waitlist_out',
      { id: 0, channel_id: 'N/A', user_id: next.user_id, category: next.category, priority: 'low' },
      next.user_id, null, { detail: `Promoted from waitlist. Remaining: ${db.getWaitlistCount(guild.id)}` });
  } catch (e) {
    console.error('[WAITLIST PROMOTE]', e.message);
  }
}

export async function createTicketChannel(interaction, { categoryId, subType, answers, bugTags }) {
  const guild        = interaction.guild;
  const user         = interaction.user;
  const cat          = cfg.categories.find(c => c.id === categoryId);
  const staffRoleId  = process.env.ROLE_STAFF;
  const pingRoleId   = process.env[cat?.pingEnv] || staffRoleId;
  const discordCatId = process.env[cat?.categoryEnv];

  try {
    const safeName    = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';
    const channelName = `ticket-${safeName}-${categoryId.replace(/_/g, '-')}`;

    const channel = await guild.channels.create({
      name:   channelName,
      type:   ChannelType.GuildText,
      parent: discordCatId || null,
      permissionOverwrites: [
        { id: guild.id,                   deny:  [PermissionFlagsBits.ViewChannel] },
        { id: user.id,                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] },
        ...(staffRoleId ? [{ id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] }] : []),
      ],
    });

    const labeled = labelAnswers(categoryId, answers);
    db.createTicket({ channelId: channel.id, guildId: guild.id, userId: user.id, category: categoryId, subType, answers: labeled, bugTags });
    const ticket = db.getTicket(channel.id);
    ticket.bugTags = bugTags;

    await channel.setTopic(`Ticket #${ticket.id} | ${user.tag} | ${categoryId}`).catch(() => {});

    let autoPriority = 'low';
    if (bugTags.includes('🚨 Critical') || bugTags.includes('💀 Exploit')) autoPriority = 'critical';
    else if (bugTags.length)                                                autoPriority = 'high';
    else {
      const text = Object.values(answers).join(' ').toLowerCase();
      if (/urgent|critical|exploit|dupe|hacked/i.test(text)) autoPriority = 'high';
      else if (/broken|not working|error|bug/i.test(text))   autoPriority = 'medium';
    }
    if (autoPriority !== 'low') { db.setPriority(channel.id, autoPriority); ticket.priority = autoPriority; }

    const mention = pingRoleId ? `${user} <@&${pingRoleId}>` : `${user}`;
    await channel.send({
      content:    mention,
      embeds:     [E.ticketOpenEmbed(user, ticket, cat)],
      components: [E.ticketStaffRow(), E.ticketUserRow()],
    });

    if (autoPriority === 'high' || autoPriority === 'critical') {
      await sendHighPriorityAlert(interaction.client, ticket, interaction.client.user.id, cat);
    }

    const editFn = interaction.editReply?.bind(interaction) ?? interaction.update?.bind(interaction);
    await editFn?.({ embeds: [E.ok('Ticket Created!', `Your ticket is open in ${channel}!\nA staff member will respond shortly.`)], components: [] });

    try { await user.send({ embeds: [E.dmOpenEmbed(ticket, cat)] }); } catch {}

    db.auditLog({ guildId: guild.id, ticketId: ticket.id, userId: user.id, action: 'open', detail: categoryId });
    await sendLog(interaction.client, 'open', ticket, user.id);

  } catch (error) {
    console.error('[TICKET CREATE]', error);
    const fn = interaction.editReply?.bind(interaction) ?? interaction.followUp?.bind(interaction);
    await fn?.({ embeds: [E.err('Error', `Could not create ticket channel.\n\`\`\`${error.message}\`\`\``)], components: [] });
  }
}

export async function onClose(interaction) {
  const ticket = db.getTicket(interaction.channel.id);
  if (!ticket)                    return interaction.reply({ embeds: [E.err('Error', 'This channel is not a ticket.')], ephemeral: true });
  if (ticket.status === 'closed') return interaction.reply({ embeds: [E.err('Error', 'This ticket is already closed.')], ephemeral: true });

  if (isStaff(interaction.member)) {
    await interaction.reply({
      embeds:     [E.staffClosingEmbed(interaction.user)],
      components: [E.staffCloseReasonRow(ticket.category)],
      ephemeral:  true,
    });
  } else {
    await interaction.showModal(M.userCloseModal());
  }
}

export async function onStaffCloseReason(interaction) {
  const value = interaction.values[0];
  if (value === 'other') {
    return interaction.showModal(M.staffCloseOtherModal());
  }

  const ticket      = db.getTicket(interaction.channel.id);
  const cat         = cfg.categories.find(c => c.id === ticket?.category);
  const entry       = cat?.closeReasons?.find(r => r.value === value);
  const reasonLabel = entry?.label ?? value;

  await interaction.deferUpdate();
  await executeClose(interaction.channel, interaction.user, interaction.guild, interaction.client, reasonLabel, true, async () => {});
}

export async function onStaffCloseOtherModal(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const reason = interaction.fields.getTextInputValue('reason');
  await executeClose(interaction.channel, interaction.user, interaction.guild, interaction.client, reason, true,
    async embed => interaction.editReply({ embeds: [embed] }));
}

export async function onUserCloseModal(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const reason = interaction.fields.getTextInputValue('reason');
  await interaction.channel.send({ embeds: [E.userCloseRequestEmbed(interaction.user, reason)] }).catch(() => {});
  await executeClose(interaction.channel, interaction.user, interaction.guild, interaction.client, reason, false,
    async embed => interaction.editReply({ embeds: [embed] }));
}

async function executeClose(channel, closedBy, guild, client, reason, closedByStaff, replyFn) {
  const ticket = db.getTicket(channel.id);
  if (!ticket) return replyFn(E.err('Error', 'Ticket not found.'));
  if (ticket.status === 'closed') return replyFn(E.warn('Already Closed', 'This ticket is already closed.'));

  db.closeTicket(channel.id, closedBy.id, reason);
  const updated = db.getTicketById(ticket.id);
  const cat     = cfg.categories.find(c => c.id === ticket.category);
  const file    = await generateTranscript(updated, guild);

  try {
    const msgs = await channel.messages.fetch({ limit: 50 });
    for (const msg of msgs.filter(m => m.author.id === client.user.id && m.components?.length > 0).values()) {
      await msg.edit({ components: [] }).catch(() => {});
    }
  } catch {}

  await channel.send({
    embeds: [E.warn('🔒 Ticket Closed', [
      `Closed by ${closedByStaff ? `Staff ${closedBy}` : closedBy}`,
      `**Reason:** ${reason ?? 'No reason provided'}`,
      `**Duration:** ${E.formatDuration(updated.response_time ?? 0)}`,
      '',
      '🗑️ *This channel will be deleted in **5 seconds**...*',
    ].join('\n'))],
  }).catch(() => {});

  setTimeout(() => channel.delete(`Ticket #${ticket.id} closed`).catch(() => {}), 5000);

  try {
    const owner = await client.users.fetch(ticket.user_id);
    await owner.send({
      embeds: [E.dmCloseEmbed(updated, closedBy.id, reason, cat, closedByStaff, guild.name, channel.name)],
      files:  [file],
    });
  } catch {}

  await sendCloseLogs(client, updated, ticket.user_id, closedBy.id, reason, file, closedByStaff);
  db.auditLog({ guildId: guild.id, ticketId: ticket.id, userId: ticket.user_id, staffId: closedBy.id,
    action: closedByStaff ? 'close' : 'close_user', detail: reason });

  await promoteFromWaitlist(client, guild);
  await replyFn(E.ok('Ticket Closed', 'Transcript sent to logs and user DM.'));
}

export async function forceClose(interaction) {
  const ticket = db.getTicket(interaction.channel.id);
  if (!ticket)                    return interaction.reply({ embeds: [E.err('Error', 'Not a ticket channel.')], ephemeral: true });
  if (ticket.status === 'closed') return interaction.reply({ embeds: [E.err('Error', 'Already closed.')], ephemeral: true });

  await interaction.deferReply({ ephemeral: true });
  await executeClose(interaction.channel, interaction.user, interaction.guild, interaction.client,
    `Force closed by ${interaction.user.tag}`, true,
    async embed => interaction.editReply({ embeds: [embed] }));
}

export async function onClaim(interaction) {
  if (!isStaff(interaction.member)) return sendUnauthorised(interaction);
  const ticket = db.getTicket(interaction.channel.id);
  if (!ticket) return interaction.reply({ embeds: [E.err('Error', 'Ticket not found.')], ephemeral: true });

  db.claimTicket(interaction.channel.id, interaction.user.id);
  await interaction.reply({ embeds: [E.ok('Ticket Claimed', `${interaction.user} is now handling this ticket!`)] });
  db.auditLog({ guildId: interaction.guild.id, ticketId: ticket.id, staffId: interaction.user.id, action: 'claim' });
  await sendLog(interaction.client, 'claim', db.getTicket(interaction.channel.id), ticket.user_id, interaction.user.id);
}

export async function onPriority(interaction) {
  if (!isStaff(interaction.member)) return sendUnauthorised(interaction);
  await interaction.reply({ embeds: [E.info('⚠️ Set Priority', 'Select a new priority level:')], components: [E.prioritySelectRow()], ephemeral: true });
}

export async function onSetPriority(interaction) {
  const newId  = interaction.values[0];
  const ticket = db.getTicket(interaction.channel.id);
  if (!ticket) return interaction.update({ embeds: [E.err('Error', 'Ticket not found.')], components: [] });

  const oldP = cfg.priorities.find(p => p.id === ticket.priority);
  const newP = cfg.priorities.find(p => p.id === newId);
  db.setPriority(interaction.channel.id, newId);
  const updated = db.getTicket(interaction.channel.id);
  const cat     = cfg.categories.find(c => c.id === ticket.category);

  await interaction.update({ embeds: [E.ok('Priority Updated', `Set to **${newP?.label}**.`)], components: [] });
  await interaction.channel.send({ embeds: [E.warn('Priority Changed', `**${oldP?.label}** → **${newP?.label}** by ${interaction.user}`)] });

  if (newP?.pingStaff) await sendHighPriorityAlert(interaction.client, updated, interaction.user.id, cat);

  db.auditLog({ guildId: interaction.guild.id, ticketId: ticket.id, staffId: interaction.user.id, action: 'priority', detail: `${ticket.priority} → ${newId}` });
  await sendLog(interaction.client, 'priority', updated, ticket.user_id, interaction.user.id, { oldPriority: oldP?.label, newPriority: newP?.label });
}

export async function onTranscript(interaction) {
  if (!isStaff(interaction.member)) return sendUnauthorised(interaction);
  await interaction.deferReply({ ephemeral: true });
  const ticket = db.getTicket(interaction.channel.id);
  if (!ticket) return interaction.editReply({ embeds: [E.err('Error', 'Ticket not found.')] });
  const file = await generateTranscript(ticket, interaction.guild);
  db.auditLog({ guildId: interaction.guild.id, ticketId: ticket.id, staffId: interaction.user.id, action: 'transcript' });
  await interaction.editReply({ embeds: [E.ok('Transcript Ready', 'HTML transcript is attached.')], files: [file] });
}

export async function onAdd(interaction) {
  if (!isStaff(interaction.member)) return sendUnauthorised(interaction);
  await interaction.showModal(M.addUserModal());
}

export async function onRemove(interaction) {
  if (!isStaff(interaction.member)) return sendUnauthorised(interaction);
  await interaction.showModal(M.removeUserModal());
}

export async function onAddModal(interaction) {
  const userId = interaction.fields.getTextInputValue('user_id').replace(/\D/g, '');
  try {
    const member = await interaction.guild.members.fetch(userId);
    await interaction.channel.permissionOverwrites.edit(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await interaction.reply({ embeds: [E.ok('User Added', `${member} has been added to the ticket.`)] });
    const t = db.getTicket(interaction.channel.id);
    db.auditLog({ guildId: interaction.guild.id, ticketId: t?.id, staffId: interaction.user.id, userId, action: 'add' });
    await sendLog(interaction.client, 'add', t, userId, interaction.user.id);
  } catch {
    await interaction.reply({ embeds: [E.err('Not Found', 'Could not find that user. Check the ID.')], ephemeral: true });
  }
}

export async function onRemoveModal(interaction) {
  const userId = interaction.fields.getTextInputValue('user_id').replace(/\D/g, '');
  const ticket = db.getTicket(interaction.channel.id);
  if (userId === ticket?.user_id) {
    return interaction.reply({ embeds: [E.err('Error', 'You cannot remove the ticket owner.')], ephemeral: true });
  }
  try {
    await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: false });
    await interaction.reply({ embeds: [E.ok('User Removed', `<@${userId}> has been removed from the ticket.`)] });
    db.auditLog({ guildId: interaction.guild.id, ticketId: ticket?.id, staffId: interaction.user.id, userId, action: 'remove' });
    await sendLog(interaction.client, 'remove', ticket, userId, interaction.user.id);
  } catch {
    await interaction.reply({ embeds: [E.err('Error', 'Could not remove that user.')], ephemeral: true });
  }
}

export async function setSystemEnabled(interaction, enabled) {
  db.setTicketSystemEnabled(interaction.guild.id, enabled);
  const embed = enabled
    ? E.ok('System Enabled', 'Members can now open tickets.')
    : E.warn('System Disabled', 'Members can no longer open tickets.');
  await interaction.reply({ embeds: [embed], ephemeral: true });
  db.auditLog({ guildId: interaction.guild.id, staffId: interaction.user.id, action: enabled ? 'system_on' : 'system_off' });
  await sendLog(interaction.client, enabled ? 'system_on' : 'system_off', null, null, interaction.user.id, {
    detail: `System ${enabled ? 'enabled' : 'disabled'} by ${interaction.user.tag}`,
  });
}

export function startAutoClose(client) {
  const hours = Number(process.env.AUTO_CLOSE_HOURS ?? cfg.limits.autoCloseHours);
  if (!hours) return console.log('  ⏲️  Auto-close disabled.');

  const intervalMs = cfg.limits.autoCloseCheckMins * 60 * 1000;
  setInterval(async () => {
    for (const ticket of db.getInactiveTickets(hours)) {
      try {
        const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
        if (!channel) continue;
        await executeClose(channel, client.user, channel.guild, client, '⏲️ Auto-closed (inactivity)', true, async () => {});
      } catch (e) {
        console.error('[AUTO-CLOSE]', ticket.id, e.message);
      }
    }
  }, intervalMs);

  console.log(`  ⏲️  Auto-close: ${hours}h inactivity, checked every ${cfg.limits.autoCloseCheckMins}min`);
}


async function sendLog(client, action, ticket, userId, staffId = null, extra = {}) {
  const id = process.env.TICKET_LOG_CHANNEL_ID;
  if (!id) return;
  try {
    const ch = await client.channels.fetch(id).catch(() => null);
    if (ch) await ch.send({ embeds: [E.logEmbed(action, ticket, userId, staffId, extra)] });
  } catch {}
}

async function sendQueueLog(client, action, ticket, userId, staffId = null, extra = {}) {
  const id = process.env.QUEUE_LOG_CHANNEL_ID || process.env.TICKET_LOG_CHANNEL_ID;
  if (!id) return;
  try {
    const ch = await client.channels.fetch(id).catch(() => null);
    if (ch) await ch.send({ embeds: [E.logEmbed(action, ticket, userId, staffId, extra)] });
  } catch {}
}

async function sendCloseLogs(client, ticket, userId, staffId, reason, file, byStaff) {
  const id = process.env.TICKET_LOG_CHANNEL_ID;
  if (!id) return;
  try {
    const ch = await client.channels.fetch(id).catch(() => null);
    if (!ch) return;
    await ch.send({
      embeds: [E.logEmbed(byStaff ? 'close' : 'close_user', ticket, userId, staffId, {
        reason, duration: E.formatDuration(ticket.response_time ?? 0),
      })],
      files: [file],
    });
  } catch (e) { console.error('[CLOSE LOG]', e.message); }
}

async function sendHighPriorityAlert(client, ticket, changedBy, cat) {
  const logId  = process.env.TICKET_LOG_CHANNEL_ID;
  const roleId = process.env.ROLE_STAFF;
  if (logId) {
    const ch = await client.channels.fetch(logId).catch(() => null);
    if (ch) await ch.send({ content: roleId ? `<@&${roleId}> 🚨` : '🚨', embeds: [E.highPriorityAlert(ticket, changedBy, cat)] }).catch(() => {});
  }
  const tch = await client.channels.fetch(ticket.channel_id).catch(() => null);
  if (tch) await tch.send({ content: roleId ? `<@&${roleId}>` : '', embeds: [E.highPriorityAlert(ticket, changedBy, cat)] }).catch(() => {});
}

async function sendUnauthorised(interaction) {
  db.auditLog({ guildId: interaction.guild.id, userId: interaction.user.id, action: 'unauthorized',
    detail: `Tried to use ${interaction.customId}` });
  await sendLog(interaction.client, 'unauthorized', null, interaction.user.id, null, {
    detail: `<@${interaction.user.id}> tried to use \`${interaction.customId}\` without permission.`,
  });
  return interaction.reply({
    embeds: [E.err('Access Denied', 'You do not have permission to use this action.\nOnly **staff members** can perform this.')],
    ephemeral: true,
  });
}

function detectBugTags(answers) {
  const text = Object.values(answers).join(' ');
  const tags = [];
  for (const [, tag] of Object.entries(cfg.bugTags)) {
    if (tag.pattern.test(text)) tags.push(tag.label);
  }
  return tags.length ? tags : ['📦 General'];
}

function modalToCategoryId(id) {
  return {
    modal_ban_appeal:    'ban_appeal',
    modal_mute_appeal:   'mute_appeal',
    modal_media_app:     'media_app',
    modal_player_report: 'player_report',
    modal_bug_report:    'bug_report',
    modal_connection:    'connection',
    modal_store:         'store',
    modal_general:       'general',
    modal_other:         'other',
  }[id] ?? 'other';
}

function extractAnswers(interaction) {
  const out = {};
  for (const row of interaction.components)
    for (const c of row.components)
      out[c.customId] = c.value ?? '';
  return out;
}

function labelAnswers(categoryId, raw) {
  const maps = {
    ban_appeal:    { minecraft_ign:'IGN', ban_reason:'Ban Reason', unban_reason:'Why Unban', staff_involved:'Staff Involved' },
    mute_appeal:   { minecraft_ign:'IGN', mute_reason:'Mute Reason', unmute_reason:'Why Unmute' },
    media_app:     { channel_link:'Channel Link', followers:'Followers', avg_views:'Avg Views', why_accept:'Why Accept' },
    player_report: { reported_player:'Reported Player', rule_broken:'Rule Broken', evidence:'Evidence', additional:'Additional Info' },
    bug_report:    { description:'Bug Description', reproduce:'How to Reproduce', server_affected:'Server Affected', screenshots:'Screenshots' },
    connection:    { error_message:'Error Message', region:'Region', using_vpn:'Using VPN', since_when:'Since When' },
    store:         { purchase_id:'Purchase ID', store_username:'Store Username', problem:'Problem', payment_method:'Payment Method' },
    general:       { issue:'Issue', tried:'Already Tried' },
    other:         { description:'Description' },
  };
  const map = maps[categoryId] ?? maps.other;
  const out = {};
  for (const [k, label] of Object.entries(map))
    if (raw[k] !== undefined) out[label] = raw[k];
  return out;
}
