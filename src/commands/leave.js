const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('VCから退出します。'),
    
    async execute(interaction, client) {
        // Botの接続情報を取得
        const settings = client.voiceConnections.get(interaction.guildId);

        if (!settings) {
            return interaction.reply({ content: '現在、読み上げ用のVCに参加していません。', ephemeral: true });
        }

        try {
            // 接続を破棄
            settings.connection.destroy();
            
            // Playerも停止 (念のため)
            if (settings.audioPlayer) {
                settings.audioPlayer.stop();
            }

            // Mapから削除 (destroyイベントでも削除されるが、即時反映のため)
            client.voiceConnections.delete(interaction.guildId);

            const embed = new EmbedBuilder()
                .setTitle('切断しました')
                .setColor(14941566)
                .setDescription(`<#${interaction.channelId}> から切断しました．`);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '退出処理中にエラーが発生しました。', ephemeral: true });
        }
    },
};