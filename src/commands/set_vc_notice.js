const { SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_vc_notice_channel')
        .setDescription('VCの入退室通知を行うチャンネルを設定します．')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('通知を送信するテキストチャンネル')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),
    
    async execute(interaction, client) {
        if (!client.adminUserIDs.includes(interaction.user.id)) {
            return interaction.reply({ content: 'このコマンドを実行する権限がありません．', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');

        process.env.VC_NOTICE_CHANNEL_ID = channel.id;

        console.log(`VC通知チャンネルを変更しました: ${channel.name} (ID: ${channel.id})`);

        await interaction.reply({ content: `VCの入退室通知チャンネルを ${channel.name} に設定しました．`, ephemeral: true });
    }
};