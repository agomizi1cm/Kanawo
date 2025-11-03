const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('あなたのいるVCに参加し、このチャンネルの読み上げを開始します。'),
    
    async execute(interaction, client) {
        // 1. ユーザーがVCにいるか確認
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({ content: 'このコマンドを使うには、まずボイスチャンネルに参加してください。', ephemeral: true });
        }

        // 2. 既に接続していないか確認
        if (client.voiceConnections.has(interaction.guildId)) {
            return interaction.reply({ content: '既に他のチャンネルで読み上げ中です。', ephemeral: true });
        }

        try {
            // 3. ボイスチャンネルに接続
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: interaction.guildId,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false, // 自分の音声をミュートしない (trueにすると聞こえなくなる)
            });

            // 接続状態の監視 (デバッグ用)
            connection.on(VoiceConnectionStatus.Ready, () => {
                console.log(`[TTS] ${channel.name} への接続準備完了。`);
            });
            connection.on(VoiceConnectionStatus.Destroyed, () => {
                console.log(`[TTS] ${channel.name} への接続が破棄されました。`);
                client.voiceConnections.delete(interaction.guildId);
            });

            // 4. 接続情報と「読み上げるテキストチャンネル」を保存
            const settings = {
                connection: connection,
                textChannelId: interaction.channelId, // このコマンドが使われたチャンネルを記憶
                audioPlayer: null // AudioPlayerはmessageCreateで作成する
            };
            client.voiceConnections.set(interaction.guildId, settings);

            await interaction.reply(`ボイスチャンネル \`${channel.name}\` に参加しました。\nこのチャンネル \`#${interaction.channel.name}\` のメッセージを読み上げます。`);

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'VCへの接続に失敗しました。権限などを確認してください。', ephemeral: true });
        }
    },
};