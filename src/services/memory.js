import { createClient } from '@supabase/supabase-js';
import { getAI } from './aiClient.js';

// Supabaseクライアントの初期化 (環境変数がない場合はnull)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * 短期記憶: Discordチャンネルから直近のメッセージを取得
 * @param {import('discord.js').TextChannel} channel
 * @param {number} limit
 * @returns {Promise<{ role: string, parts: { text: string }[] }[]>}
 */
export async function fetchRecentHistory(channel, limit = 15) {
    try {
        // 直近のメッセージを取得 (Bot自身のメッセージも含む)
        const messages = await channel.messages.fetch({ limit });
        const history = [];

        messages.reverse().forEach((msg) => {
            // テキストがないメッセージ（画像のみ等）はスキップ
            if (!msg.content) return;

            // ユーザーかモデルかでロールを割り当て
            const role = msg.author.bot ? 'model' : 'user';

            // "Name: Content" 形式で誰の発言か分かるようにする
            const content = `${msg.member?.displayName || msg.author.username}: ${msg.content}`;

            history.push({
                role: 'user', // Gemini APIの仕様上、historyは user/model の交互が望ましいが、ここでは文脈としてまとめて渡すため一旦全て 'user' として扱うか、あるいはプロンプトに埋め込む
                parts: [{ text: content }],
            });
        });

        return history;
    } catch (error) {
        console.error('[Memory] Failed to fetch history:', error);
        return [];
    }
}

/**
 * 長期記憶: 会話の要約を生成して保存 (非同期で実行)
 * @param {string} channelId
 * @param {string} textToSummarize
 */
export async function summarizeAndSave(channelId, textToSummarize) {
    if (!supabase) return; // DB未設定なら何もしない

    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
                role: 'user',
                parts: [{ text: `以下の会話ログを、第三者にも分かるように日本語で3行以内で要約してください。重要な決定事項や、仁菜（私）の感情の動きを含めてください。\n\n${textToSummarize}` }]
            }],
        });

        const summary = response.text;
        if (!summary) return;

        // Supabaseに保存
        const { error } = await supabase
            .from('memories')
            .insert({ channel_id: channelId, summary });

        if (error) throw error;
        console.log(`[Memory] Saved summary for channel ${channelId}`);

    } catch (error) {
        console.error('[Memory] Failed to summarize and save:', error);
    }
}

/**
 * 長期記憶: 過去の要約を取得
 * @param {string} channelId
 * @returns {Promise<string>}
 */
export async function loadLongTermMemory(channelId) {
    if (!supabase) return '';

    try {
        // 最新の要約を3件取得
        const { data, error } = await supabase
            .from('memories')
            .select('summary')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) throw error;
        if (!data || data.length === 0) return '';

        // 古い順に並べ替え
        const summaries = data.reverse().map(d => d.summary).join('\n');
        return `## 過去の記憶（これまでのあらすじ）\n${summaries}\n\n`;

    } catch (error) {
        console.error('[Memory] Failed to load memories:', error);
        return '';
    }
}
