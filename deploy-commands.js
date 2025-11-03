const fs = require('node:fs');
const path = require('node:path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// 1. .env ファイルから設定を読み込む
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// 2. コマンドを格納する配列
const commands = [];

// 3. /src/commands フォルダから .js ファイルを読み込む
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // コマンド定義の .data を JSON 形式で配列に追加
    commands.push(command.data.toJSON());
}

// 4. REST クライアントを作成
const rest = new REST({ version: '10' }).setToken(token);

// 5. コマンドをDiscordに登録 (即時実行関数)
(async () => {
    try {
        console.log(`(${commands.length}個) のスラッシュコマンドの登録を開始します...`);

        // PUT メソッドでコマンドをギルド（サーバー）に登録
        // Python版の tree.sync(guild=GUILD) と同じ
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`ギルド (ID: ${guildId}) へのコマンドの登録が完了しました．`);
    } catch (error) {
        console.error('エラーが発生しました:');
        console.error(error);
    }
})();