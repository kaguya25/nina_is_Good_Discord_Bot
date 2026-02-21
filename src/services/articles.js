import RssParser from 'rss-parser';
import { EmbedBuilder } from 'discord.js';
import { summarize } from './gemini.js';

const parser = new RssParser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
});

const FEEDS = [
    {
        name: 'はてなブックマーク',
        url: 'https://b.hatena.ne.jp/hotentry/it.rss',
        color: 0x00a4de,
        emoji: '📘',
    },
    {
        name: 'Qiita',
        url: 'https://qiita.com/popular-items/feed',
        color: 0x55c500,
        emoji: '📗',
    },
    {
        name: 'Zenn',
        url: 'https://zenn.dev/feed',
        color: 0x3ea8ff,
        emoji: '📙',
    },
];

/**
 * 指定フィードから記事を取得してEmbed化
 * @param {{ name: string, url: string, color: number, emoji: string }} feedConfig
 * @param {number} count
 * @returns {Promise<EmbedBuilder[]>}
 */
async function fetchFromFeed(feedConfig, count) {
    const feed = await parser.parseURL(feedConfig.url);
    const articles = feed.items.slice(0, count);
    const embeds = [];

    for (const article of articles) {
        let summary;
        try {
            summary = await summarize(article.title, article.contentSnippet || '');
        } catch {
            summary = article.contentSnippet?.slice(0, 200) || 'ー';
        }

        const embed = new EmbedBuilder()
            .setTitle(article.title)
            .setURL(article.link)
            .setDescription(summary)
            .setColor(feedConfig.color)
            .setFooter({ text: feedConfig.name })
            .setTimestamp(new Date(article.pubDate || article.isoDate || Date.now()));

        embeds.push(embed);
    }

    return embeds;
}

/**
 * 全ソースから記事を取得してEmbed配列を返す (朝の配信用)
 * @param {number} countPerFeed 各フィードの取得件数 (default: 3)
 * @returns {Promise<{ source: string, embeds: EmbedBuilder[] }[]>}
 */
export async function fetchAllArticles(countPerFeed = 3) {
    const results = [];

    for (const feedConfig of FEEDS) {
        try {
            const embeds = await fetchFromFeed(feedConfig, countPerFeed);
            results.push({ source: `${feedConfig.emoji} ${feedConfig.name}`, embeds });
        } catch (error) {
            console.error(`[articles] ${feedConfig.name} の取得に失敗:`, error.message);
            results.push({ source: `${feedConfig.emoji} ${feedConfig.name}`, embeds: [] });
        }
    }

    return results;
}

/**
 * 指定ソースの記事を取得 (コマンド用)
 * @param {'hatena' | 'qiita' | 'zenn' | 'all'} source
 * @param {number} count
 * @returns {Promise<EmbedBuilder[]>}
 */
export async function fetchArticles(source = 'all', count = 5) {
    if (source === 'all') {
        const results = await fetchAllArticles(Math.ceil(count / FEEDS.length));
        return results.flatMap((r) => r.embeds).slice(0, count);
    }

    const feedMap = {
        hatena: FEEDS[0],
        qiita: FEEDS[1],
        zenn: FEEDS[2],
    };

    const feedConfig = feedMap[source];
    if (!feedConfig) throw new Error(`不明なソース: ${source}`);

    return fetchFromFeed(feedConfig, count);
}
