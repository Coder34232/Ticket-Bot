// ══════════════════════════════════════════════════════
// 🛡️  PERMISSIONS.JS — Role & permission helpers
// ══════════════════════════════════════════════════════

import { PermissionFlagsBits } from 'discord.js';

/**
 * Returns true if the member has the staff role or ManageGuild permission.
 * @param {GuildMember} member
 */
export function isStaff(member) {
  const roleId = process.env.ROLE_STAFF;
  return (roleId && member.roles.cache.has(roleId))
    || member.permissions.has(PermissionFlagsBits.ManageGuild);
}

/**
 * Returns true if the member has a moderator role.
 * Falls back to isStaff if no specific mod role is set.
 */
export function isModerator(member) {
  const modId = process.env.ROLE_MODERATORS;
  return (modId && member.roles.cache.has(modId)) || isStaff(member);
}

/**
 * Returns true if the member has a developer role.
 * Falls back to isStaff if no specific dev role is set.
 */
export function isDeveloper(member) {
  const devId = process.env.ROLE_DEVELOPERS;
  return (devId && member.roles.cache.has(devId)) || isStaff(member);
}

/**
 * Returns true if the member qualifies for queue priority (VIP or Donor).
 */
export function hasPriority(member) {
  const vipId   = process.env.ROLE_VIP;
  const donorId = process.env.ROLE_DONOR;
  return (vipId && member.roles.cache.has(vipId))
    || (donorId && member.roles.cache.has(donorId));
}

/**
 * Validates role access for a category.
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkCategoryAccess(member, catConfig) {
  // Must have role (e.g. Banned role for ban appeals)
  if (catConfig.requireRole) {
    const reqId = process.env[catConfig.requireRole];
    if (reqId && !member.roles.cache.has(reqId)) {
      const reasons = {
        ROLE_BANNED: 'You need the **Banned** role to open a ban appeal.\nIf you are banned, please contact a staff member.',
        ROLE_MUTED:  'You need the **Muted** role to open a mute appeal.\nIf you are muted, please contact a staff member.',
      };
      return {
        allowed: false,
        reason:  reasons[catConfig.requireRole]
          ?? `You do not have the required role to access **${catConfig.label}**.`,
      };
    }
  }

  // Must NOT have role (e.g. Media rank for media applications)
  if (catConfig.blockRole) {
    const blockId = process.env[catConfig.blockRole];
    if (blockId && member.roles.cache.has(blockId)) {
      const reasons = {
        ROLE_MEDIA: 'You already have the **Media** rank and cannot apply again.\nIf you need support, open a General Support ticket.',
      };
      return {
        allowed: false,
        reason:  reasons[catConfig.blockRole]
          ?? `You cannot access **${catConfig.label}** with your current roles.`,
      };
    }
  }

  return { allowed: true };
}
