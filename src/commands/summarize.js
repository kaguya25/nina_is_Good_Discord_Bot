import { SlashCommandBuilder } from 'discord.js';
import { summarizeUrl } from '../services/gemini.js';

export const data = new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('指定されたURLの内容を仁菜が少し誇らしげに要約します')
    .addStringOption((option) =>
        option
            .setName('url')
            .setDescription('要約したいウェブサイトのURL')
            .setRequired(true),
    );

export async function execute(interaction) {
    const url = interaction.options.getString('url');

    await interaction.deferReply();

    try {
        const text = await summarizeUrl(url);
        await interaction.editReply(text);
    } catch (error) {
        console.error('[summarize] Error:', error);

        let errorMessage = 'なんだかよく分からないエラーが起きました。桃香さーん！';
        if (error.message.includes('無効なURL')) {
            errorMessage = 'ちょっと！それ適当なURLじゃないですか！？ちゃんと開けるやつを教えてください！';
        } else if (error.message.includes('http または https')) {
            errorMessage = '変なスキームのURLは読み込めません！普通にhttpかhttpsで始まるやつにしてください！';
        } else if (error.message.includes('プライベートネットワーク')) {
            errorMessage = '……ローカルのURLなんて読めるわけないじゃないですか。私をからかってるんですか！？';
        } else if (error.message.includes('HTTPエラー')) {
            errorMessage = `サイトが見つからないか、アクセスを拒否されました！(${error.message})`;
        } else if (error.message.includes('読み取れるテキストが見つかりませんでした')) {
            errorMessage = 'ページを開きましたけど、中身がスッカラカンでしたよ！？';
        }

        await interaction.editReply(errorMessage);
    }
}
