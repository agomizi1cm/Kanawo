const { Events, EmbedBuilder, Colors } = require('discord.js');

/**
 * 秒数を HH:MM:SS 形式にフォーマットする
 * @param {number} total_seconds -総秒数
 */
function format_duration(total_seconds) {
    const seconds = Math.floor(total_seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 日付を YYYY/MM/DD HH:MM:SS 形式にフォーマットする
 * @param {Date} now -Dateオブジェクト
 */
function format_date(now) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return `${year}/${month}/${day}\n${hours}:${minutes}:${seconds}`;
}

module.exports = {
    name: Events.VoiceStateUpdate,
    
    async execute(oldState, newState, client) {
        const member = newState.member;

        if (member.bot) return;

        const noticeChannelId = process.env.VC_NOTICE_CHANNEL_ID;
        if (!noticeChannelId) {
            console.error('エラー: VC_NOTICE_CHANNEL_ID が .env に設定されていません．');
            return;
        }

        let noticeChannel;
        try {
            noticeChannel = client.channels.cache.get(noticeChannelId);
            if (!noticeChannel) {
                console.log(`エラー: 指定された通知チャンネル(ID: ${noticeChannelId})が見つかりません．`);
                return;
            }
        } catch (error) {
            console.error('通知チャンネルの取得に失敗しました．', error);
            return;
        }

        if (!client.activeVcSessions) {
            console.error('エラー: client.activeVcSessions が初期化されていません．');
            return;
        }

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        // ユーザーがボイスチャネルから退出したとき
        if (oldChannel && oldChannel.id !== newChannel?.id) {
            if (oldChannel.members.size === 0) {
                if (client.activeVcSessions.has(oldChannel.id)) {
                    console.log(`VC終了: ${oldChannel.name}`);

                    const sessionData = client.activeVcSessions.get(oldChannel.id);
                    client.activeVcSessions.delete(oldChannel.id);

                    const startTime = sessionData.startTime;
                    const endTime = new Date();
                    const durationMs = endTime - startTime;
                    const durationSeconds = durationMs / 1000;

                    const embed = new EmbedBuilder()
                        .setTitle('通話終了')
                        .setColor(14391348)
                        .addFields(
                            { name: "`チャンネル`", value: oldChannel.name, inline: true },
                            { name: "`通話時間`", value: format_duration(durationSeconds), inline: true },
                            { name: "`終了時間`", value: format_date(endTime), inline: true }
                        )

                    await noticeChannel.send({ embeds: [embed] });
                }
            }
        }

        // ユーザーがボイスチャネルに参加したとき
        if (newChannel && newChannel.id !== oldChannel?.id) {
            if (newChannel.members.size === 1) {
                if (!client.activeVcSessions.has(newChannel.id)) {
                    console.log(`VC開始: ${newChannel.name} by ${member.displayName}`);
                    const startTime = new Date();

                    const embed = new EmbedBuilder()
                        .setTitle('通話開始')
                        .setColor(10503659)
                        .addFields(
                            { name: "`チャンネル`", value: newChannel.name, inline: true },
                            { name: "`始めた人`", value: member.displayName, inline: true },
                            { name: "`開始時間`", value: format_date(startTime), inline: true }
                        )

                    if (member.displayAvatarURL()) {
                        embed.setThumbnail(member.displayAvatarURL());
                    }

                    const startMessage = await noticeChannel.send({ embeds: [embed] });

                    client.activeVcSessions.set(newChannel.id, {
                        startTime: startTime,
                        messageId: startMessage.id
                    });
                }
            }
        }
    }
};