const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {

        // 👇 AQUÍ PONES EL ID DE TU CANAL DE BIENVENIDA 👇
        const canalId = '1502830822573736058'; 

        // Busca el canal en el servidor
        const canal = member.guild.channels.cache.get(canalId);
        if (!canal) return console.log('❌ No encontré el canal de bienvenida');

        // 🎉 MENSAJE DE BIENVENIDA (EDITA LO QUE QUIERAS AQUÍ)
        const mensaje = new EmbedBuilder()
            .setColor('#2ECC71') // Color del borde (verde, puedes cambiarlo)
            .setTitle('🎉 ¡NUEVO MIEMBRO! 🎉')
            .setDescription(`
👋 **¡Bienvenido/a ${member} al servidor!**

Qué alegría que te hayas unido a nosotros 🥳
✅ Recuerda leer las reglas
✅ Disfruta y habla con todos

📊 Ya somos **${member.guild.memberCount} personas** aquí 🚀
            `)
            .setThumbnail(member.user.displayAvatarURL({ size: 1024 })) // Foto de perfil del usuario
            .setTimestamp(); // Hora exacta

        // Enviar el mensaje
        canal.send({ embeds: [mensaje] });

        // 🛡️ SI QUIERES PONER ROL AUTOMÁTICO, DESCOMENTA Y PON TU ID
        /*
        const rolId = '876543210987654321'; // ID DE TU ROL
        const rol = member.guild.roles.cache.get(rolId);
        if (rol) await member.roles.add(rol).catch(e => console.log('Error al poner rol:', e));
        */

    },
};
