import { SlashCommandBuilder } from 'discord.js';
import { fetchWeather } from '../services/weather.js';

export const data = new SlashCommandBuilder()
    .setName('weather')
    .setDescription('指定した都市の天気を表示する (デフォルト: 福岡)')
    .addStringOption((option) =>
        option
            .setName('city')
            .setDescription('都市名 (english) または 都市コード (例: 130010)')
            .setRequired(false) // 任意に変更
    );

export async function execute(interaction) {
    await interaction.deferReply();

    const city = interaction.options.getString('city'); // 指定がなければ null

    try {
        const embed = await fetchWeather(city);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('[weather] Error:', error);
        await interaction.editReply(`天気の取得に失敗しました: ${error.message}`);
    }
}
