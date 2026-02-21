import { fetchAllArticles } from './src/services/articles.js';

async function run() {
    console.log('Fetching only Qiita and Zenn...');
    try {
        const results = await fetchAllArticles(3);
        const targets = results.filter(r => r.source.includes('Qiita') || r.source.includes('Zenn'));

        for (const res of targets) {
            console.log(`Source: ${res.source}, Embeds: ${res.embeds.length}`);
            if (res.embeds.length === 0) {
                console.log('  -> No embeds found!');
            } else {
                res.embeds.forEach(e => console.log(`  - ${e.data.title}`));
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
