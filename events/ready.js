const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`${client.user.tag} が起動しました！`);

        const guildId = process.env.GUILD_ID;
        if (!guildId) {
            console.log('GUILD_ID が設定されていません．コマンドはグローバルに登録されます．');
            // グローバル登録
            await client.application.commands.set(client.commands.map(cmd => cmd.data));
        } else {
            // ギルド限定登録
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                await guild.commands.set(client.commands.map(cmd => cmd.data));
                console.log('ギルド(ID: ${guildId})にコマンドを同期しました．');
            } else {
                console.log('ギルド(ID: ${guildId}) が見つかりません．');
            }
        }
    }
};