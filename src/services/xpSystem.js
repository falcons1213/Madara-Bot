import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData, saveUserLevelData, getLevelFromXp } from './leveling.js';
import { EmbedBuilder } from 'discord.js';

// 🚫 EVITAR TRAMPAS: GUARDAMOS LA ÚLTIMA VEZ QUE ESCRIBIÓ
const userCooldowns = new Map();

export async function addXp(message) {
  try {
    const { guild, member, author, channel } = message;
    const guildId = guild.id;
    const userId = author.id;

    // ⚙️ CARGAMOS LA CONFIGURACIÓN QUE HICIMOS ANTES
    const config = await getLevelingConfig(message.client, guildId);

    // ❌ SI EL SISTEMA ESTÁ APAGADO, NO HACEMOS NADA
    if (!config.enabled) return;

    // ❌ IGNORAMOS BOTS, CANALES PROHIBIDOS O ROLES PROHIBIDOS
    if (
      author.bot ||
      config.ignoredChannels?.includes(channel.id) ||
      member.roles.cache.some(role => config.ignoredRoles?.includes(role.id)) ||
      config.blacklistedUsers?.includes(userId)
    ) return;

    // ⏱️ COMPROBAR TIEMPO DE ESPERA (PARA QUE NO ESCRIVAN RÁPIDO)
    const now = Date.now();
    const cooldownKey = `${guildId}:${userId}`;
    const lastTime = userCooldowns.get(cooldownKey) || 0;

    if (now - lastTime < (config.xpCooldown * 1000)) return;
    userCooldowns.set(cooldownKey, now);

    // ✨ CALCULAR CUÁNTA XP DAR (ENTRE MÍNIMO Y MÁXIMO)
    const xpGain = Math.floor(Math.random() * (config.xpPerMessage.max - config.xpPerMessage.min + 1)) + config.xpPerMessage.min;

    // 📥 OBTENER DATOS DEL USUARIO
    const userData = await getUserLevelData(message.client, guildId, userId);

    // ➕ SUMAR EXPERIENCIA
    userData.xp += xpGain;
    userData.totalXp += xpGain;

    // 📈 COMPROBAR SI SUBIÓ DE NIVEL
    const newLevelData = getLevelFromXp(userData.xp);

    let leveledUp = false;
    let oldLevel = userData.level;

    // ✅ SI SUBIÓ DE NIVEL
    if (newLevelData.level > userData.level) {
      leveledUp = true;
      userData.level = newLevelData.level;
      userData.xp = newLevelData.currentXp;

      // 📢 ENVIAR MENSAJE DE FELICIDADES
      if (config.announceLevelUp) {
        const canalEnvio = config.levelUpChannel ? guild.channels.cache.get(config.levelUpChannel) : channel;
        
        if (canalEnvio) {
          const mensajeFinal = config.levelUpMessage
            .replace('{user}', `${member}`)
            .replace('{level}', userData.level.toString());

          const embed = new EmbedBuilder()
            .setTitle('🚀 ¡SUBISTE DE NIVEL! 🎉')
            .setDescription(mensajeFinal)
            .setColor('#2ECC71')
            .setThumbnail(author.displayAvatarURL({ size: 1024 }))
            .setTimestamp();

          canalEnvio.send({ embeds: [embed] }).catch(e => logger.error('No pude enviar mensaje de nivel:', e));
        }
      }

      // 🎁 PONER ROL DE RECOMPENSA SI LO HAY
      if (config.roleRewards && config.roleRewards[userData.level]) {
        const rolId = config.roleRewards[userData.level];
        const rol = guild.roles.cache.get(rolId);
        if (rol) {
          member.roles.add(rol).catch(e => logger.error('No pude dar el rol:', e));
        }
      }
    }

    // 💾 GUARDAR LOS DATOS ACTUALIZADOS
    await saveUserLevelData(message.client, guildId, userId, userData);

  } catch (error) {
    logger.error('Error en sistema de XP:', error);
  }
}
