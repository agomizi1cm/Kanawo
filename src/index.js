// ライブラリの読み込み
const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const dotenv = require('dotenv');

// 環境変数の読み込み
dotenv.config();

// Discordクライアントの作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.serverProcess = null;
client.activeVcSessions = new Map();
client.adminUserIDs = (process.env.ADMIN_USER_IDS || '').split(',');
client.voiceConnections = new Map();

// --- コマンドローダー ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
// .js ファイルのみをフィルタリング
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[LOAD] コマンドを登録: ${command.data.name}`);
    } else {
        console.warn(`[WARN] コマンドの登録に失敗: ${filePath} (data または execute が見つかりません)`);
    }
}

// --- イベントローダー ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[LOAD] イベントを登録: ${event.name}`);
}

client.login(process.env.DISCORD_BOT_TOKEN);
