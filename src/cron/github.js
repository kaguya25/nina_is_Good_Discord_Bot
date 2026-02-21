import cron from 'node-cron';
import { scoldCommit } from '../services/gemini.js';

let lastCommitSha = null;

export function startGithubWatcher(client) {
    // 30分ごとに実行
    cron.schedule('*/30 * * * *', async () => {
        const repo = process.env.GITHUB_WATCH_REPO;
        const targetChannelId = process.env.GITHUB_WATCH_CHANNEL_ID;

        if (!repo || !targetChannelId) return;

        try {
            const response = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`);
            if (!response.ok) return;

            const commits = await response.json();
            if (commits.length === 0) return;

            const latestCommit = commits[0];
            const currentSha = latestCommit.sha;

            // 初回起動時は通知せず、最新のSHAだけ保存
            if (!lastCommitSha) {
                lastCommitSha = currentSha;
                return;
            }

            // 新しいコミットがあれば
            if (currentSha !== lastCommitSha) {
                lastCommitSha = currentSha;

                const commitMessage = latestCommit.commit.message;
                const author = latestCommit.commit.author.name;
                const commitUrl = latestCommit.html_url;

                // 仁菜に怒らせる
                const scoldingMessage = await scoldCommit(commitMessage, repo, author);

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
