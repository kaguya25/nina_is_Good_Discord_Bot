import { SlashCommandBuilder } from 'discord.js';
import { chat } from '../services/gemini.js';

export const data = new SlashCommandBuilder()
    .setName('talk')
    .setDescription('AIとトークする')
    .addStringOption((option) =>
        option
            .setName('message')
            .setDescription('話しかけたい内容')
            .setRequired(true),
    );

export async function execute(interaction) {
    await interaction.deferReply();

    const userMessage = interaction.options.getString('message');

    try {
        const reply = await chat(userMessage, interaction.channel);
        await interaction.editReply(reply);
    } catch (error) {
        console.error('[talk] Error:', error);
        await interaction.editReply('エラーが発生しました。もう一度試してください。');
    }
}
