const { Events } = require('discord.js');
const { createAudioPlayer, createAudioResource, NoSubscriberBehavior, AudioPlayerStatus } = require('@discordjs/voice');
const axios = require('axios');

// --- VOICEBOX 設定 ---
const VOICEBOX_ENGINE_URL = 'http://127.0.0.1:50021';
const SPEAKER_ID = 3;


// 読み上げキュー (サーバーIDごと)
const queues = new Map();

/**
 * VOICEVOX Engineから音声ストリームを生成する
 */
async function generateVoicevoxAudio(text, speakerId) {
    try {
        // 1. audio_query (音声合成用のクエリ) を作成
        const queryResponse = await axios.post(
            `${VOICEBOX_ENGINE_URL}/audio_query?speaker=${speakerId}&text=${encodeURIComponent(text)}`
        );
        
        // 2. synthesis (音声合成) を実行し、音声ストリームを取得
        const audioResponse = await axios.post(
            `${VOICEBOX_ENGINE_URL}/synthesis?speaker=${speakerId}`,
            queryResponse.data, // audio_query の結果 (JSON) を送信
            { responseType: 'stream' } // -> ここが重要！ 音声をストリームとして受け取る
        );

        return audioResponse.data; // 音声ストリームを返す

    } catch (error) {
        console.error(`[VOICEVOX Error] ${error.message}`);
        return null;
    }
}

/**
 * キューから次の音声を再生する
 */
async function playNext(guildId, settings) {
    const queue = queues.get(guildId);
    if (!queue || queue.length === 0) {
        // 再生するものがなくなったらPlayerを破棄
        if (settings.audioPlayer) {
            settings.audioPlayer.stop();
            settings.audioPlayer = null;
        }
        return;
    }

    // キューの先頭からテキストを取得
    const text = queue.shift();

    // Playerがなければ作成
    if (!settings.audioPlayer) {
        settings.audioPlayer = createAudioPlayer({
            behaviors: {
                // VCに誰もいなくなってもエラーで停止しないようにする
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });
        
        // PlayerをVCの接続にサブスクライブ（接続）
        settings.connection.subscribe(settings.audioPlayer);

        // 再生がアイドル状態（終了）になったら、次の曲を再生
        settings.audioPlayer.on(AudioPlayerStatus.Idle, () => {
            playNext(guildId, settings);
        });

        // エラーハンドリング
        settings.audioPlayer.on('error', error => {
            console.error(`[TTS Player Error] ${error.message}`);
            playNext(guildId, settings); // エラーが起きても次へ
        });
    }

    try {
        const audioStream = await generateVoicevoxAudio(text, SPEAKER_ID);
        
        if (audioStream) {
            // 音声リソースを作成
            const resource = createAudioResource(audioStream);
            // 再生
            settings.audioPlayer.play(resource);
        } else {
            // 生成に失敗したら次のキューへ
            playNext(guildId, settings);
        }
    } catch (error) {
        console.error(`[TTS Resource Error] ${error.message}`);
        playNext(guildId, settings); // エラーが起きても次へ
    }
}


module.exports = {
	name: Events.MessageCreate, // メッセージが作成されたときのイベント
	
    async execute(message, client) {
        // 1. Botのメッセージは無視
        if (message.author.bot) return;

        // 2. 読み上げ設定を取得
        const settings = client.voiceConnections.get(message.guild.id);
        
        // 3. 読み上げ設定がない (BotがVCにいない) 場合は無視
        if (!settings) return;

        // 4. 登録されたテキストチャンネル以外のメッセージは無視
        if (message.channel.id !== settings.textChannelId) return;

        // 5. メッセージ内容を取得 (200文字制限)
        let text = message.content;
        if (text.length > 200) {
            text = text.substring(0, 200) + "...以下略";
        }
        // URLやメンションなどは読み上げない (簡易版)
        text = text.replace(/<@!?\d+>/g, ''); // メンション
        text = text.replace(/<#\d+>/g, '');  // チャンネル
        text = text.replace(/<:\w+:\d+>/g, ''); // 絵文字
        text = text.replace(/https?:\/\/\S+/g, 'URL省略'); // URL
        
        if (text.trim().length === 0) return; // 中身がなくなったら無視

        if (!queues.has(message.guild.id)) {
            queues.set(message.guild.id, []);
        }
        queues.get(message.guild.id).push(text);

        if (!settings.audioPlayer || settings.audioPlayer.state.status === AudioPlayerStatus.Idle) {
            playNext(message.guild.id, settings);
        }
	}
};