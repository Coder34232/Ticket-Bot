// ══════════════════════════════════════════════════════
// 📋  MODALS.JS — All modal builders
// ══════════════════════════════════════════════════════

import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

// Helper — builds a single ActionRow containing one TextInput
function field(id, label, placeholder, style = TextInputStyle.Short, required = true, min = 0, max = 1000) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(id).setLabel(label).setPlaceholder(placeholder)
      .setStyle(style).setRequired(required).setMinLength(min).setMaxLength(max),
  );
}

// ─── BAN APPEAL ───────────────────────────────────────
export function banAppealModal() {
  return new ModalBuilder().setCustomId('modal_ban_appeal').setTitle('🔨 Ban Appeal')
    .addComponents(
      field('minecraft_ign',   'Minecraft Username (IGN)',      'Exact username — case sensitive',            TextInputStyle.Short,     true, 2,  32),
      field('ban_reason',      'What were you banned for?',     'e.g. Hacking, Griefing, Chat Abuse...',      TextInputStyle.Short,     true, 5,  200),
      field('unban_reason',    'Why should you be unbanned?',   'Be honest and detailed...',                  TextInputStyle.Paragraph, true, 30, 1000),
      field('staff_involved',  'Staff involved (optional)',     'Username of staff who banned you',           TextInputStyle.Short,     false, 0, 64),
    );
}

// ─── MUTE APPEAL ─────────────────────────────────────
export function muteAppealModal() {
  return new ModalBuilder().setCustomId('modal_mute_appeal').setTitle('🔇 Mute Appeal')
    .addComponents(
      field('minecraft_ign',   'Minecraft Username (IGN)',      'Exact username — case sensitive',            TextInputStyle.Short,     true, 2,  32),
      field('mute_reason',     'Why were you muted?',           'What did you say or do?',                   TextInputStyle.Short,     true, 5,  200),
      field('unmute_reason',   'Why should your mute be removed?', 'Explain clearly and honestly...',        TextInputStyle.Paragraph, true, 30, 1000),
    );
}

// ─── MEDIA APPLICATION ───────────────────────────────
// Platform is already captured via button before this modal
export function mediaAppModal(platform = 'your platform') {
  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
  return new ModalBuilder().setCustomId('modal_media_app').setTitle(`🎥 Media Application — ${platformLabel}`)
    .addComponents(
      field('channel_link',    'Channel / Profile Link',        'https://youtube.com/c/yourhandle',          TextInputStyle.Short,     true, 10, 200),
      field('followers',       'Followers / Subscribers',       'e.g. 5,400',                                TextInputStyle.Short,     true, 1,  20),
      field('avg_views',       'Average Views per Video',       'e.g. 1,200',                                TextInputStyle.Short,     true, 1,  20),
      field('why_accept',      'Why should we accept you?',     'Tell us about your content and plans...',   TextInputStyle.Paragraph, true, 30, 1000),
    );
}

// ─── PLAYER REPORT ───────────────────────────────────
export function playerReportModal() {
  return new ModalBuilder().setCustomId('modal_player_report').setTitle('⚠️ Player Report')
    .addComponents(
      field('reported_player', 'Reported Player IGN',           'Exact Minecraft username',                  TextInputStyle.Short,     true, 2,  32),
      field('rule_broken',     'Rule Broken',                   'e.g. Hacking, Harassment, Griefing...',     TextInputStyle.Short,     true, 5,  100),
      field('evidence',        'Evidence (links)',              'Screenshot/video links (Imgur, YouTube...)', TextInputStyle.Short,     true, 5,  500),
      field('additional',      'Additional Information',        'Any extra context...',                      TextInputStyle.Paragraph, false, 0, 500),
    );
}

// ─── BUG REPORT ──────────────────────────────────────
export function bugReportModal() {
  return new ModalBuilder().setCustomId('modal_bug_report').setTitle('🐞 Bug Report')
    .addComponents(
      field('description',     'Describe the bug',              'What is behaving incorrectly?',             TextInputStyle.Paragraph, true, 20, 1000),
      field('reproduce',       'How to reproduce',              'Step-by-step instructions...',              TextInputStyle.Paragraph, true, 20, 500),
      field('server_affected', 'Server / Gamemode affected',    'e.g. Survival, SkyBlock, Factions...',      TextInputStyle.Short,     true, 2,  100),
      field('screenshots',     'Screenshots / Videos (optional)','Links to evidence (Imgur, YouTube...)',    TextInputStyle.Short,     false, 0, 500),
    );
}

// ─── CONNECTION ISSUES ───────────────────────────────
export function connectionModal() {
  return new ModalBuilder().setCustomId('modal_connection').setTitle('🌐 Connection Issues')
    .addComponents(
      field('error_message',   'Error Message',                 'Exact error you receive in Minecraft',      TextInputStyle.Short,     true, 5,  300),
      field('region',          'Your Region / Country',         'e.g. Europe, USA, Brazil...',               TextInputStyle.Short,     true, 2,  60),
      field('using_vpn',       'Are you using a VPN? (Yes/No)', 'Yes or No',                                 TextInputStyle.Short,     true, 1,  10),
      field('since_when',      'Since when does this happen?',  'e.g. Since today, after the last update...', TextInputStyle.Short,    true, 5,  100),
    );
}

// ─── STORE SUPPORT ───────────────────────────────────
export function storeModal() {
  return new ModalBuilder().setCustomId('modal_store').setTitle('💰 Store Support')
    .addComponents(
      field('purchase_id',     'Purchase / Transaction ID',     'Found in your order confirmation email',    TextInputStyle.Short,     true, 3,  100),
      field('store_username',  'Store Username / IGN',          'Username used during purchase',             TextInputStyle.Short,     true, 2,  64),
      field('problem',         'Describe the problem',          'What went wrong with your purchase?',       TextInputStyle.Paragraph, true, 20, 1000),
      field('payment_method',  'Payment Method',                'e.g. PayPal, Credit Card, Paysafecard...',  TextInputStyle.Short,     true, 3,  60),
    );
}

// ─── GENERAL SUPPORT ─────────────────────────────────
export function generalModal() {
  return new ModalBuilder().setCustomId('modal_general').setTitle('🛠️ General Support')
    .addComponents(
      field('issue',           'Describe your issue',           'As much detail as possible...',             TextInputStyle.Paragraph, true, 20, 1000),
      field('tried',           'What have you already tried?',  'List what you attempted to fix it...',      TextInputStyle.Paragraph, true, 10, 500),
    );
}

// ─── OTHER ───────────────────────────────────────────
export function otherModal() {
  return new ModalBuilder().setCustomId('modal_other').setTitle('❓ Other Request')
    .addComponents(
      field('description',     'Describe your request',         'Be as specific as possible...',             TextInputStyle.Paragraph, true, 20, 1000),
    );
}

// ─── CLOSE MODALS ────────────────────────────────────

export function staffCloseOtherModal() {
  return new ModalBuilder().setCustomId('modal_staff_close_other').setTitle('🔒 Close — Custom Reason')
    .addComponents(
      field('reason', 'Reason for closing', 'Explain clearly...', TextInputStyle.Paragraph, true, 10, 500),
    );
}

export function userCloseModal() {
  return new ModalBuilder().setCustomId('modal_user_close').setTitle('🔒 Close Ticket')
    .addComponents(
      field('reason', 'Why do you want to close this ticket?', 'Explain briefly...', TextInputStyle.Paragraph, true, 10, 500),
    );
}

// ─── MANAGEMENT MODALS ───────────────────────────────

export function addUserModal() {
  return new ModalBuilder().setCustomId('modal_add_user').setTitle('👤 Add User to Ticket')
    .addComponents(field('user_id', 'User ID', '123456789012345678', TextInputStyle.Short, true, 17));
}

export function removeUserModal() {
  return new ModalBuilder().setCustomId('modal_remove_user').setTitle('❌ Remove User from Ticket')
    .addComponents(field('user_id', 'User ID', '123456789012345678', TextInputStyle.Short, true, 17));
}

// ─── Category → modal map ─────────────────────────────
export function getModalForCategory(categoryId, meta = {}) {
  const map = {
    ban_appeal:    banAppealModal,
    mute_appeal:   muteAppealModal,
    media_app:     () => mediaAppModal(meta.platform),
    player_report: playerReportModal,
    bug_report:    bugReportModal,
    connection:    connectionModal,
    store:         storeModal,
    general:       generalModal,
    other:         otherModal,
  };
  return (map[categoryId] ?? otherModal)();
}
