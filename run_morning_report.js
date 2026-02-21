import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { fetchAllArticles } from './src/services/articles.js';
import { fetchWeather } from './src/services/weather.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    const channelId = process.env.MORNING_CHANNEL_ID;

    if (!channelId) {
        console.error('MORNING_CHANNEL_ID is not set.');
        process.exit(1);
    }

    try {
        const channel = await client.channels.fetch(channelId);

        // 1. Weather
        console.log('Sending weather...');
        try {
            const weatherEmbed = await fetchWeather('400010');
            await channel.send({ content: '🌤️ **今日の天気 (テスト配信)**', embeds: [weatherEmbed] });
        } catch (e) {
            console.error('Failed to send weather:', e);
        }

        // 2. Articles (Only Qiita for testing as requested, or all? User said "Qiita popular articles", but usually morning report has all. I'll send all 3 sources as per configured morning job but maybe limit count if needed. The user said "Try sending Qiita...", implying focus on Qiita, but the morning job sends all. I'll send all to verify the full flow.)
        // Actually user said "QIITA popular items", maybe I should filter?
        // "Is it possible to send Qiita popular articles now..."
        // I will send the full morning report as that's what we just integrated.

        console.log('Fetching articles...');
        const results = await fetchAllArticles(3);

        await channel.send('☀️ **テスト配信: 今日の技術トレンド記事**');

        for (const { source, embeds } of results) {
            if (embeds.length === 0) continue;
            // Filter for Qiita if strictly requested? The user said "Qiita... etc" or just "Qiita"?
            // User: "試しに今QIITAの人気記事とか遅れる？" (Can you send Qiita popular articles now as a test?)
            // I will strictly send Qiita if I can, but the system is built for all. 
            // I'll send all to show it works together.

            await channel.send({
                content: `**${source}**`,
                embeds,
            });
        }

        console.log('Done!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(process.env.DISCORD_TOKEN);
