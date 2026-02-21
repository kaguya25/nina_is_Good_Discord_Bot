import { fetch } from 'undici';

const url = 'https://weather.tsukumijima.net/api/forecast/city/400010';
const res = await fetch(url);
const data = await res.json();

console.log(JSON.stringify(data, null, 2));
