import 'dotenv/config';
import { REST, Routes } from 'discord.js';

import * as talkCommand from './commands/talk.js';
import * as articlesCommand from './commands/articles.js';
import * as weatherCommand from './commands/weather.js';
import * as morningPreviewCommand from './commands/morning-preview.js';
import * as musicCommand from './commands/music.js';
import * as summarizeCommand from './commands/summarize.js';

const commands = [talkCommand, articlesCommand, weatherCommand, morningPreviewCommand, musicCommand, summarizeCommand].map((c) =>
    c.data.toJSON(),
);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function main() {
    try {
        console.log(`🔄 ${commands.length} 個のスラッシュコマンドを登録中...`);

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.DISCORD_CLIENT_ID,
                process.env.DISCORD_GUILD_ID,
            ),
            { body: commands },
        );

        console.log('✅ スラッシュコマンドの登録が完了しました。');
    } catch (error) {
        console.error('❌ コマンド登録エラー:', error);
    }
}

main();
