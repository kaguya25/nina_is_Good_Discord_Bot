import 'dotenv/config';
import { fetchAllArticles } from './src/services/articles.js';
import { fetchWeather } from './src/services/weather.js';

// Qiitaのみテスト
import { EmbedBuilder } from 'discord.js';

async function testMorning() {
    console.log('--- Testing Weather ---');
    try {
        const weather = await fetchWeather('400010');
        console.log('Weather Title:', weather.data.title);
    } catch (e) {
        console.error('Weather Error:', e);
    }

    console.log('\n--- Testing Qiita Articles ---');
    try {
        // Qiitaは index 1
        const results = await fetchAllArticles(3);
        const qiita = results.find(r => r.source.includes('Qiita'));
        if (qiita) {
            console.log(`Source: ${qiita.source}`);
            qiita.embeds.forEach(e => {
                console.log(`- ${e.data.title}`);
            });
        } else {
            console.log('Qiita articles not found in results.');
        }
    } catch (e) {
        console.error('Articles Error:', e);
    }
}

testMorning();
