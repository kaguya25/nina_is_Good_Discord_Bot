import { EmbedBuilder } from 'discord.js';

const BASE_URL = 'https://weather.tsukumijima.net/api/forecast/city';

// 主要都市のIDマッピング
const CITY_MAP = {
    'tokyo': '130010',
    'osaka': '270000',
    'nagoya': '230010',
    'fukuoka': '400010',
    'sapporo': '016010',
    'sendai': '040010',
    'hiroshima': '340010',
    'naha': '471010',
};

/**
 * 天気予報を取得してEmbedを返す
 * @param {string} cityInput 都市名(ローマ字) または 都市コード
 * @returns {Promise<EmbedBuilder>}
 */
export async function fetchWeather(cityInput) {
    // デフォルトは福岡 (400010)
    let cityCode = '400010';

    if (cityInput) {
        const input = cityInput.toLowerCase();
        if (CITY_MAP[input]) {
            cityCode = CITY_MAP[input];
        } else if (/^\d{6}$/.test(input)) {
            cityCode = input;
        }
    }

    const url = `${BASE_URL}/${cityCode}`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`天気予報の取得に失敗しました (${res.status})`);
    }

    const data = await res.json();

    // 当日(今日)の予報を取得
    const todayForecast = data.forecasts[0];
    const location = data.location.city;
    const dateLabel = todayForecast.dateLabel; // "今日"
    const telop = todayForecast.telop; // "晴れ"

    // 気温（nullの場合は --- 表示）
    const tempMax = todayForecast.temperature.max.celsius || '---';
    const tempMin = todayForecast.temperature.min.celsius || '---';

    // 降水確率
    const rain = todayForecast.chanceOfRain;
    const rainStr = `06-12時: ${rain.T06_12}\n12-18時: ${rain.T12_18}\n18-24時: ${rain.T18_24}`;

    // 概況文の整形
    const description = data.description.text.replace(/\n\n/g, '\n');

    const embed = new EmbedBuilder()
        .setTitle(`🌤️ ${location} の天気 (${dateLabel})`)
        .setDescription(telop)
        .setColor(0x87ceeb)
        .setThumbnail(todayForecast.image.url) // アイコンを追加
        .addFields(
            { name: '🌡️ 最高 / 最低 気温', value: `${tempMax}°C / ${tempMin}°C`, inline: true },
            { name: '☔ 降水確率', value: rainStr, inline: true },
            { name: '📝 概況', value: description.length > 200 ? description.slice(0, 200) + '...' : description },
        )
        .setFooter({ text: '出典: 気象庁 / weather.tsukumijima.net' })
        .setTimestamp();

    return embed;
}
