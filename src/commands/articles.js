import { SlashCommandBuilder } from 'discord.js';
import { fetchArticles } from '../services/articles.js';

export const data = new SlashCommandBuilder()
    .setName('articles')
    .setDescription('技術トレンド記事を取得して要約する')
    .addStringOption((option) =>
        option
            .setName('source')
            .setDescription('記事のソース')
            .addChoices(
                { name: '全部', value: 'all' },
                { name: 'はてなブックマーク', value: 'hatena' },
                { name: 'Qiita', value: 'qiita' },
                { name: 'Zenn', value: 'zenn' },
            ),
    )
    .addIntegerOption((option) =>
        option
            .setName('count')
            .setDescription('取得件数 (1-10)')
            .setMinValue(1)
            .setMaxValue(10),
    );

export async function execute(interaction) {
    await interaction.deferReply();

    const source = interaction.options.getString('source') || 'all';
    const count = interaction.options.getInteger('count') || 5;

    const sourceLabel = {
        all: '全ソース',
        hatena: 'はてなブックマーク',
        qiita: 'Qiita',
        zenn: 'Zenn',
    };

    try {
        const embeds = await fetchArticles(source, count);

        if (embeds.length === 0) {
            await interaction.editReply('記事が見つかりませんでした。');
            return;
        }

        await interaction.editReply({
            content: `📚 **${sourceLabel[source]} トレンド記事**`,
            embeds,
        });
    } catch (error) {
        console.error('[articles] Error:', error);
        await interaction.editReply('記事の取得に失敗しました。もう一度試してください。');
    }
}
