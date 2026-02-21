import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { songs } from '../data/songs.js';

export const data = new SlashCommandBuilder()
    .setName('music')
    .setDescription('トゲナシトゲアリの楽曲を紹介します')
    .addSubcommand((subcommand) =>
        subcommand
            .setName('recommend')
            .setDescription('おすすめの曲をランダムに紹介します')
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName('list')
            .setDescription('楽曲リストを表示します')
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'recommend') {
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        const videoId = randomSong.url.split('v=')[1];
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        const embed = new EmbedBuilder()
            .setTitle(`🎵 ${randomSong.title}`)
            .setDescription(randomSong.description)
            .setColor(0xe60033) // Togeari Red (approx)
            .addFields(
                { name: 'Artist', value: randomSong.artist, inline: true },
                { name: 'Link', value: randomSong.url, inline: true }
            )
            .setImage(thumbnailUrl)
            .setFooter({ text: 'Produced by 仁菜' });

        await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'list') {
        const songList = songs.map((s) => `- [${s.title}](${s.url})`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🎸 トゲナシトゲアリ 楽曲リスト')
            .setDescription(songList)
            .setColor(0x000000);

        await interaction.reply({ embeds: [embed] });
    }
}
