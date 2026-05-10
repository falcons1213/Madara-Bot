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

    // ⚙️ CARGAMOS CONFIGURACIÓN
    const config = await getLevelingConfig(message.client, guildId);

    // ❌ SI SISTEMA APAGADO -> SALIR
    if (!config || config.enabled === false) return;

    // ❌ IGNORAR BOTS / DM / CANALES PROHIBIDOS
    if (
      author.bot || 
      !message.guild ||
      (config.ignoredChannels && config.ignoredChannels.includes(channel.id)) ||
      (config.ignoredRoles && member.roles.cache.some(r => config.ignoredRoles.includes(r.id))) ||
      (config.blacklistedUsers && config.blacklistedUsers.includes(userId))
    ) return;

    // ⏱️ TIEMPO DE ESPERA (15 SEGUNDOS)
    const ahora = Date.now();
    const claveTiempo = `${guildId}:${userId}`;
    const ultimoEnvio = userCooldowns.get(claveTiempo) || 0;

    if (ahora - ultimoEnvio < (config.xpCooldown * 1000 || 15000)) return;
    userCooldowns.set(claveTiempo, ahora);

    // ✨ CÁLCULO DE XP (entre 15 y 25)
    const xpGanada = Math.floor(Math.random() * ((config.xpPerMessage?.max || 25) - (config.xpPerMessage?.min || 15) + 1)) + (config.xpPerMessage?.min || 15);

    // 📥 DATOS DEL USUARIO
    const datosUsuario = await getUserLevelData(message.client, guildId, userId);

    // ➕ SUMAMOS
    datosUsuario.xp += xpGanada;
    datosUsuario.totalXp += xpGanada;

    // 📈 COMPROBAR SI SUBIÓ DE NIVEL
    const nuevoNivel = getLevelFromXp(datosUsuario.xp);

    let subioDeNivel = false;
    const nivelAnterior = datosUsuario.level;

    if (nuevoNivel.level > datosUsuario.level) {
      subioDeNivel = true;
      datosUsuario.level = nuevoNivel.level;
      datosUsuario.xp = nuevoNivel.currentXp;

      // 📢 MENSAJE DE FELICIDADES -> AHORA SIN ERROR 404
      if (config.announceLevelUp !== false) {
        
        // 💥 ARREGLAMOS EL ERROR 404: SI NO HAY CANAL, USA EL MISMO DEL MENSAJE
        let canalEnvio = channel; 
        
        if (config.levelUpChannel && config.levelUpChannel !== null) {
          const canalExiste = guild.channels.cache.get(config.levelUpChannel);
          if (canalExiste) canalEnvio = canalExiste;
        }

        if (canalEnvio) {
          const texto = (config.levelUpMessage || "🎉 ¡FELICIDADES {user}! Subiste al NIVEL {level} 🚀")
            .replace('{user}', `${member}`)
            .replace('{level}', datosUsuario.level.toString());

          const embed = new EmbedBuilder()
            .setTitle('🚀 ¡NUEVO NIVEL ALCANZADO! 🎉')
            .setDescription(texto)
            .setColor('#2ECC71')
            .setThumbnail(author.displayAvatarURL({ size: 1024 }))
            .setTimestamp();

          canalEnvio.send({ embeds: [embed] }).catch(e => logger.error('No pude enviar mensaje:', e.message));
        }
      }

      // 🎁 ROLES DE RECOMPENSA
      if (config.roleRewards && typeof config.roleRewards === 'object') {
        const rolId = config.roleRewards[datosUsuario.level];
        if (rolId) {
          const rol = guild.roles.cache.get(rolId);
          if (rol) member.roles.add(rol).catch(e => logger.error('No puedo dar rol:', e.message));
        }
      }
    }

    // 💾 GUARDAR DATOS
    await saveUserLevelData(message.client, guildId, userId, datosUsuario);

  } catch (error) {
    // ❌ YA NO MUESTRA ERROR 404, LO AVISA NOMÁS
    logger.error('⚠️ Sistema de niveles:', error.message);
  }
}
