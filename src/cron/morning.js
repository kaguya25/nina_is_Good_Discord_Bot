import cron from 'node-cron';
import { fetchAllArticles } from '../services/articles.js';
import { fetchWeather } from '../services/weather.js';

/**
 * 朝の定期配信ジョブを開始
 * @param {import('discord.js').Client} client
 */
export function startMorningJob(client) {
    const channelId = process.env.MORNING_CHANNEL_ID;

    if (!channelId) {
        console.warn('[cron] MORNING_CHANNEL_ID が未設定のため、朝の定期配信をスキップします。');
        return;
    }

    // 毎日 JST 8:00 に実行
    cron.schedule('0 8 * * *', async () => {
        console.log('[cron] 朝の定期配信を開始...');

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                console.error('[cron] チャンネルが見つかりません:', channelId);
                return;
            }

            // 1. 天気予報
            try {
                const weatherEmbed = await fetchWeather('400010'); // 福岡
                await channel.send({ content: '🌤️ **今日の天気**', embeds: [weatherEmbed] });
            } catch (err) {
                console.error('[cron] 天気予報の取得失敗:', err);
                await channel.send('😵 天気予報の取得に失敗しました...');
            }

            const results = await fetchAllArticles(3);

            await channel.send('☀️ **おはようございます！今日の技術トレンド記事です**');

            for (const { source, embeds } of results) {
                if (embeds.length === 0) continue;
                await channel.send({
                    content: `**${source}**`,
                    embeds,
                });
            }

            console.log('[cron] 朝の定期配信が完了しました。');
        } catch (error) {
            console.error('[cron] 朝の定期配信エラー:', error);
        }
    }, {
        timezone: 'Asia/Tokyo',
    });

    console.log('[cron] 朝の定期配信ジョブを登録しました (毎日 JST 8:00)');
}
