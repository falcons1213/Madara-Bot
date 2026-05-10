import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { addXp } from '../services/xpSystem.js';

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      // Llamada principal
      await addXp(message);

    } catch (error) {
      logger.error('❌ Error evento mensaje:', error.message);
    }
  }
};
