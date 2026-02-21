import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
    try {
        const response = await ai.models.list();
        console.log('Response type:', typeof response);

        // 中身を少し見てみる
        if (Array.isArray(response)) {
            console.log('Response is Array. Length:', response.length);
            response.slice(0, 3).forEach(m => console.log(JSON.stringify(m, null, 2)));
        } else {
            console.log('Response keys:', Object.keys(response));
            if (response.models) {
                console.log('Found models property. Type:', typeof response.models);
                if (Array.isArray(response.models)) {
                    response.models.forEach(m => console.log(`- ${m.name}`));
                } else {
                    console.log('models property is not an array:', response.models);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
