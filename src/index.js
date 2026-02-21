import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { startMorningJob } from './cron/morning.js';
import { startGithubWatcher } from './cron/github.js';
import { chat, searchAndChat } from './services/gemini.js';
import { summarizeAndSave } from './services/memory.js';

import * as talkCommand from './commands/talk.js';
import * as articlesCommand from './commands/articles.js';
import * as weatherCommand from './commands/weather.js';
import * as morningPreviewCommand from './commands/morning-preview.js';
import * as musicCommand from './commands/music.js';
import * as summarizeCommand from './commands/summarize.js';

// Client 初期化
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// コマンド登録
client.commands = new Collection();
const commands = [talkCommand, articlesCommand, weatherCommand, morningPreviewCommand, musicCommand, summarizeCommand];
for (const command of commands) {
    client.commands.set(command.data.name, command);
}

// Ready イベント
client.once('ready', (c) => {
    console.log(`✅ Ready! ${c.user.tag} としてログインしました。`);
    startMorningJob(client);
    startGithubWatcher(client);
});

// interactionCreate イベント (スラッシュコマンド)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`[command] 不明なコマンド: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`[command] ${interaction.commandName} エラー:`, error);
        const reply = {
            content: 'コマンドの実行中にエラーが発生しました。',
            ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

// messageCreate イベント (リプライ検知 → 検索して返答)
client.on('messageCreate', async (message) => {
    // BOT自身のメッセージは無視
    if (message.author.bot) return;

    const isMentioned = message.mentions.has(client.user);
    const isReplyToBot = message.reference
        ? await (async () => {
            try {
                const referenced = await message.channel.messages.fetch(message.reference.messageId);
                return referenced.author.id === client.user.id;
            } catch {
                return false;
            }
        })()
        : false;

    // BOTへのメンションまたはリプライでなければ無視
    if (!isMentioned && !isReplyToBot) return;

    // メンションテキストを除去して本文を取得
    const content = message.content
        .replace(/<@!?\d+>/g, '')
        .trim();

    if (!content) return;

    try {
        await message.channel.sendTyping();

        // リプライの場合は検索モード、メンションの場合は通常会話
        // ※ searchAndChatはまだメモリ対応していないので、chatのみメモリ対応
        const reply = (isReplyToBot && isReplyToBot !== false) // isReplyToBot is boolean
            ? await searchAndChat(content) // 検索モードはまだメモリ未対応
            : await chat(content, message.channel); // 通常会話はメモリ対応

        await message.reply(reply);

        // --- 長期記憶の保存トリガー ---
        // 毎回保存するとAPIコストがかかるので、1/10の確率で保存、または文字数などで判断
        // ここではデモとして「会話が盛り上がったら（ランダム）」保存する
        if (Math.random() < 0.1) {
            const messages = await message.channel.messages.fetch({ limit: 20 });
            const textToSummarize = messages.reverse().map(m => `${m.author.username}: ${m.content}`).join('\n');
            summarizeAndSave(message.channel.id, textToSummarize);
        }

    } catch (error) {
        console.error('[message] 返信エラー:', error);
        await message.reply('ごめんなさい、エラーが起きちゃいました……もう一回言ってもらえますか？');
    }
});

// BOT 起動
client.login(process.env.DISCORD_TOKEN);
