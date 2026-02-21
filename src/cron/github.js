import cron from 'node-cron';
import { scoldCommit } from '../services/gemini.js';

let lastCommitSha = null;

export function startGithubWatcher(client) {
    // 30分ごとに実行
    cron.schedule('*/30 * * * *', async () => {
        // GITHUB_WATCH_REPO と GITHUB_WATCH_USER どちらでも動くように互換性維持
        const targetUserOrRepo = process.env.GITHUB_WATCH_USER || process.env.GITHUB_WATCH_REPO;
        const targetChannelId = process.env.GITHUB_WATCH_CHANNEL_ID;

        if (!targetUserOrRepo || !targetChannelId) return;

        try {
            // ユーザー名を抽出（"kaguya25/discord" のような repo 指定でも、"kaguya25" のみを抽出）
            const username = targetUserOrRepo.split('/')[0];

            // ユーザー（またはOrganization）のパブリックイベントを取得
            const response = await fetch(`https://api.github.com/users/${username}/events/public?per_page=10`);
            if (!response.ok) return;

            const events = await response.json();

            // PushEvent だけを絞り込み、一番新しいコミットを見つける
            const pushEvents = events.filter(e => e.type === 'PushEvent');
            if (pushEvents.length === 0) return;

            const latestPush = pushEvents[0]; // 最新のプッシュイベント
            if (!latestPush.payload || !latestPush.payload.commits || latestPush.payload.commits.length === 0) return;

            // プッシュされた中の最新（配列の末尾）のコミット
            const latestCommit = latestPush.payload.commits[latestPush.payload.commits.length - 1];
            const currentSha = latestCommit.sha;
            const repoName = latestPush.repo.name;

            // 初回起動時は通知せず、最新のSHAだけ保存
            if (!lastCommitSha) {
                lastCommitSha = currentSha;
                return;
            }

            // 新しいコミットがあれば
            if (currentSha !== lastCommitSha) {
                lastCommitSha = currentSha;

                const commitMessage = latestCommit.message;
                const author = latestCommit.author.name;
                const commitUrl = `https://github.com/${repoName}/commit/${currentSha}`;

                // 仁菜に怒らせる
                const scoldingMessage = await scoldCommit(commitMessage, repoName, author);

                const channel = await client.channels.fetch(targetChannelId);
                if (channel && channel.isTextBased()) {
                    await channel.send(`${scoldingMessage}\n\n🔗 ${commitUrl}`);
                }
            }

        } catch (error) {
            console.error('[github-watcher] エラー:', error);
        }
    });

    console.log('✅ GitHub Watcher started.');
}
