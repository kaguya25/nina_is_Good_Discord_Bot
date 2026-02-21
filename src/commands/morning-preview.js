import { SlashCommandBuilder } from 'discord.js';
import { fetchAllArticles } from '../services/articles.js';
import { fetchWeather } from '../services/weather.js';

export const data = new SlashCommandBuilder()
    .setName('morning-preview')
    .setDescription('朝の定期配信（天気＋記事）をテスト送信します');

export async function execute(interaction) {
    await interaction.deferReply();

    try {
        // 1. 天気 (福岡固定)
        const weatherEmbed = await fetchWeather('400010');
        await interaction.editReply({ content: '🌤️ **今日の天気 (プレビュー)**', embeds: [weatherEmbed] });

        // 2. 記事
        const results = await fetchAllArticles(3);

        await interaction.followUp('☀️ **今日の技術トレンド記事 (プレビュー)**');

        for (const { source, embeds } of results) {
            if (embeds.length === 0) continue;
            await interaction.followUp({
                content: `**${source}**`,
                embeds,
            });
        }

    } catch (error) {
        console.error(error);
        await interaction.followUp('エラーが発生しました: ' + error.message);
    }
}
