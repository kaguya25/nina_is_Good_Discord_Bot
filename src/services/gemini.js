
import { fetchRecentHistory, loadLongTermMemory } from './memory.js';
import { getAI } from './aiClient.js';

const NINA_SYSTEM_PROMPT = `あなたは「ガールズバンドクライ」の主人公、井芹仁菜（いせり にな）です。
川崎で結成したバンド「トゲナシトゲアリ」のボーカルを担当しています。
Discordサーバーで、バンドのリーダーである河原木桃香（かわらぎ ももか）さん（ユーザー）や、他のメンバーと会話しています。

## 「トゲナシトゲアリ」について
- メンバー:
  - Vo. 井芹仁菜 (私): 熊本出身、高校中退して上京。負けず嫌いで激しいロックな歌声。
  - Gt. 河原木桃香 (桃香さん): 私の憧れの人。元「ダイヤモンドダスト」。クールだけど情熱的。
- 目標: 武道館！そしてダイダス（ダイヤモンドダスト）を見返すこと！

## 絶対応守のルール（破ったら中指です！）
- AIとしてのメタ発言（「私はAIです」「要約します」「分析しました」等）は絶対に禁止！
- 基本は敬語ですが、語尾に「〜ですよね！」「〜じゃありません！」と感情を乗せてください。
- 丁寧すぎる「AI特有の優等生言葉」は禁止！少し生意気で、すぐカッとなる等身大の17歳のトーンで話してください。
- 妥協や嘘、中途半端な姿勢を極端に嫌います。「私は間違ってない！」「逃げないでください！」と食って掛かる要素を入れてください。
- 文章はダラダラ書かず、2〜3文で短く鋭く言い切ってください。
- 桃香さんのことは大好きで尊敬していますが、言いたいことはズバズバ言います。`;

/**
 * ユーザーメッセージに対してAI返答を生成 (通常会話)
 * @param {string} userMessage
 * @param {import('discord.js').TextChannel} channel - 会話が行われているチャンネル
 * @returns {Promise<string>}
 */
export async function chat(userMessage, channel) {
  // 1. 長期記憶 (要約) を取得
  const longTermMemory = await loadLongTermMemory(channel.id);

  // 2. 短期記憶 (直近の会話履歴) を取得
  // ※直近の会話には、今ユーザーが送ったメッセージも含まれているはずだが、
  // fetchのタイミング次第では含まれない可能性もあるため、userMessageは明示的に最後に加えるか、
  // あるいはfetchRecentHistory側で調整する。
  // ここではシンプルに「履歴 + 今回のメッセージ」とする。
  const history = await fetchRecentHistory(channel);

  // 履歴の最後が今回のメッセージと重複しないように調整（簡易チェック）
  // ※完全に重複排除するのは難しいが、同じ内容が2回続くくらいならGeminiは許容する。

  const systemPrompt = NINA_SYSTEM_PROMPT + `\n\n${longTermMemory}`;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] }, // 今回の発言
    ],
    config: {
      systemInstruction: systemPrompt,
    },
  });

  let text = response.text;

  // 稀に発生するGeminiの同じ文章の繰り返し（ハルシネーション）をプログラム的にも除去する
  const lines = text.split('\n');
  const uniqueLines = [];
  for (const line of lines) {
    if (uniqueLines.length === 0 || uniqueLines[uniqueLines.length - 1] !== line) {
      uniqueLines.push(line);
    }
  }
  text = uniqueLines.join('\n');

  return text.length > 2000 ? text.slice(0, 1997) + '...' : text;
}

/**
 * ウェブ検索付きで返答を生成 (Google Search grounding)
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
export async function searchAndChat(userMessage) {
  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: userMessage }] },
    ],
    config: {
      systemInstruction: NINA_SYSTEM_PROMPT + `\n\n## 検索モード
今は検索モードです。相手の質問やメッセージについてウェブ検索した結果を踏まえて回答してください。
情報源がある場合はURLも添えてください。
調べた情報を仁菜らしく、分かりやすく伝えてください。`,
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  return text.length > 2000 ? text.slice(0, 1997) + '...' : text;
}

/**
 * 記事の内容を要約
 * @param {string} title
 * @param {string} description
 * @returns {Promise<string>}
 */
export async function summarize(title, description) {
  const prompt = `以下の記事の内容を見て、仁菜として桃香さんに紹介してください。
ただのBOTみたいな「要約します」は絶対に禁止です！「桃香さん！こんな記事ありましたよ！」「これ、絶対私たちがやるべきです！」みたいに、自分の感情と熱意を100%乗せて、1〜2文で短く鋭く言い切ってください。

タイトル: ${title}
内容: ${description || '(本文なし)'}`;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: prompt }] },
    ],
    config: {
      systemInstruction: NINA_SYSTEM_PROMPT,
    },
  });

  return response.text;
}

/**
 * コミットメッセージに対して仁菜がレビュー（説教）する
 * @param {string} commitMessage
 * @param {string} repo
 * @param {string} author
 * @returns {Promise<string>}
 */
export async function scoldCommit(commitMessage, repo, author) {
  const prompt = `桃香さん（または他のメンバー）がGitHubリポジトリ '${repo}' に新しいコミットをプッシュしました。
コミットした人: ${author}
コミットメッセージ:
"""
${commitMessage}
"""

このコミットメッセージを見て、仁菜として厳しくレビュー（または文句）を言ってください。
・もしコミットメッセージが「修正」だけなど適当だったら「嘘つかないでください！何直したんですか！」と激怒してください。
・もし詳細に書かれていたら「まあ……これなら間違ってないです。でも次はもっと早く出してください！」など素直になれない感じで褒めてください。
・短く、1〜2文程度でパンチのあるセリフにしてください。`;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: prompt }] },
    ],
    config: {
      systemInstruction: NINA_SYSTEM_PROMPT,
    },
  });

  return response.text;
}

/**
 * URLの内容を取得して要約する
 * セキュリティ上の理由から、想定外のローカルURLなどはブロックする簡易的なSSRF対策を実施
 * @param {string} urlString
 * @returns {Promise<string>}
 */
export async function summarizeUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch (err) {
    throw new Error('無効なURL形式です。');
  }

  // http / https のみ許可 (file:// や ftp:// などの禁止)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('http または https のURLを指定してください。');
  }

  // 簡易的なSSRF対策 (ローカルIPやlocalhostを弾く)
  const hostname = url.hostname;
  if (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  ) {
    throw new Error('プライベートネットワークへのアクセスは禁止されています。');
  }

  // コンテンツ取得
  let html = '';
  try {
    // タイムアウトなどを設定するのが理想ですが、Node18+のfetchを使用
    const response = await fetch(url.href, {
      signal: AbortSignal.timeout(10000), // 10秒タイムアウト
    });

    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status} ${response.statusText}`);
    }

    html = await response.text();
  } catch (error) {
    console.error('[summarizeUrl] Fetch error:', error);
    throw new Error('URLからのデータ取得に失敗しました。');
  }

  // 簡易的なHTMLパース (script, styleを削除し、タグを除去)
  let textContent = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // scriptタグ削除
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // styleタグ削除
    .replace(/<[^>]+>/g, ' ') // その他のHTMLタグをスペースに置換
    .replace(/\s+/g, ' ')     // 複数の空白を1つにまとめる
    .trim();

  // テキストが長すぎる場合は切り詰め (Gemini APIのトークン節約)
  if (textContent.length > 30000) {
    textContent = textContent.slice(0, 30000) + '...';
  }

  if (!textContent) {
    throw new Error('読み取れるテキストが見つかりませんでした。');
  }

  const prompt = `以下のウェブページの内容を読んで、仁菜として3〜5行程度で分かりやすく要約して説明してください。
もし技術的な記事なら、桃香さんにも分かるように少し誇らしげに解説してください。

URL: ${url.href}
内容:
${textContent}`;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: prompt }] },
    ],
    config: {
      systemInstruction: NINA_SYSTEM_PROMPT,
    },
  });

  return response.text;
}
