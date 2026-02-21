import { GoogleGenAI } from '@google/genai';

let ai;

export function getAI() {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return ai;
}
