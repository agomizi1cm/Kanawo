const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate, // スラッシュコマンドが実行されたときのイベント
	
    async execute(interaction, client) { // index.js から client を受け取る
		
        // スラッシュコマンド以外の操作 (ボタンなど) は無視
		if (!interaction.isChatInputCommand()) return;

        // 実行されたコマンド名で、client.commands から該当する処理を探す
		const command = client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`[ERROR] コマンド ${interaction.commandName} が見つかりません。`);
			await interaction.reply({ content: 'エラー: そのコマンドは存在しません。', ephemeral: true });
			return;
		}

		try {
            // 探してきたコマンドの .execute() 関数を実行
            // (例: mc_start.js の execute がここで呼ばれる)
			await command.execute(interaction, client);
		} catch (error) {
			console.error(`[ERROR] コマンド ${interaction.commandName} の実行中にエラー:`);
            console.error(error);
			
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'コマンド実行中にエラーが発生しました。', ephemeral: true });
            } else {
                await interaction.reply({ content: 'コマンド実行中にエラーが発生しました。', ephemeral: true });
            }
		}
	}
};