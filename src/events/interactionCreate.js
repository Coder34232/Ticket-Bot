import { handleInteraction } from '../handlers/interaction-handler.js';
export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    await handleInteraction(interaction, client);
  },
};
