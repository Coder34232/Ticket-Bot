import * as E    from '../utils/embeds.js';
import * as flow from '../systems/ticket-flow.js';

export async function handleInteraction(interaction, client) {
  try {
    if      (interaction.isChatInputCommand()) await handleCommand(interaction, client);
    else if (interaction.isButton())           await handleButton(interaction, client);
    else if (interaction.isStringSelectMenu()) await handleSelect(interaction, client);
    else if (interaction.isModalSubmit())      await handleModal(interaction, client);
  } catch (err) {
    console.error(`[INTERACTION ERROR] ${interaction.customId ?? interaction.commandName}`, err);
    const payload = { embeds: [E.err('Internal Error', `Something went wrong.\n\`\`\`${err.message}\`\`\``)], ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
      else                                              await interaction.reply(payload);
    } catch {}
  }
}

async function handleCommand(interaction, client) {
  console.log(`[CMD] /${interaction.commandName} — ${interaction.user.tag}`);
  const cmd = client.commands?.get(interaction.commandName);
  if (cmd) await cmd.execute(interaction, client);
}

async function handleButton(interaction, client) {
  const id = interaction.customId;
  console.log(`[BTN] ${id} — ${interaction.user.tag}`);

  if (id === 'ticket_open')          return flow.onOpenButton(interaction);

  if (id === 'tkt_close')            return flow.onClose(interaction);

  if (id === 'tkt_claim')            return flow.onClaim(interaction);
  if (id === 'tkt_priority')         return flow.onPriority(interaction);
  if (id === 'tkt_transcript')       return flow.onTranscript(interaction);
  if (id === 'tkt_add')              return flow.onAdd(interaction);
  if (id === 'tkt_remove')           return flow.onRemove(interaction);

  if (id.startsWith('tkt_rules_agree_')) {
    const categoryId = id.replace('tkt_rules_agree_', '');
    return flow.onRulesAgree(interaction, categoryId);
  }
  if (id === 'tkt_rules_cancel')     return flow.onRulesCancel(interaction);

  if (id.startsWith('media_platform_')) {
    const platform = id.replace('media_platform_', '');
    return flow.onMediaPlatform(interaction, platform);
  }

  if (id.startsWith('faq_solved_'))     return flow.onFaqSolved(interaction);
  if (id.startsWith('faq_not_solved_')) {
    const categoryId = id.replace('faq_not_solved_', '');
    return flow.onFaqNotSolved(interaction, categoryId);
  }
}

async function handleSelect(interaction, client) {
  const id = interaction.customId;
  console.log(`[SEL] ${id} — ${interaction.user.tag}`);

  if (id === 'ticket_category')        return flow.onCategorySelect(interaction);
  if (id === 'tkt_set_priority')       return flow.onSetPriority(interaction);
  if (id === 'tkt_staff_close_reason') return flow.onStaffCloseReason(interaction);
}

async function handleModal(interaction, client) {
  const id = interaction.customId;
  console.log(`[MOD] ${id} — ${interaction.user.tag}`);

  const creationModals = new Set([
    'modal_ban_appeal', 'modal_mute_appeal', 'modal_media_app',
    'modal_player_report', 'modal_bug_report', 'modal_connection',
    'modal_store', 'modal_general', 'modal_other',
  ]);
  if (creationModals.has(id)) return flow.onModalSubmit(interaction);

  if (id === 'modal_staff_close_other') return flow.onStaffCloseOtherModal(interaction);
  if (id === 'modal_user_close')        return flow.onUserCloseModal(interaction);

  if (id === 'modal_add_user')          return flow.onAddModal(interaction);
  if (id === 'modal_remove_user')       return flow.onRemoveModal(interaction);
}
