#!/usr/bin/env node
/**
 * GitHub Trending 数据抓取脚本
 * 用于 GitHub Actions 定时任务，生成静态 JSON 数据文件
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'trending.json');

// 简单的 HTML 解析器
function parseTrendingHTML(html) {
    const repos = [];

    if (!html.includes('Box-row')) {
        console.error('❌ 未找到仓库数据 (Box-row)');
        return repos;
    }

    // 匹配每个仓库卡片
    const repoRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
    let match;

    while ((match = repoRegex.exec(html)) !== null) {
        const repoHtml = match[1];

        // 提取仓库链接和名称
        const linkMatch = repoHtml.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/);
        if (!linkMatch) {
            console.log('未找到仓库链接');
            continue;
        }

        const repoPath = linkMatch[1].trim();
        const linkText = linkMatch[2].replace(/<[^>]+>/g, ' ').trim();
        const nameMatch = linkText.match(/(\S+)\s*\/\s*(\S+)/);
        if (!nameMatch) {
            console.log('无法解析仓库名称:', linkText);
            continue;
        }

        const owner = nameMatch[1];
        const name = nameMatch[2];
        const fullName = `${owner}/${name}`;

        // 提取描述
        const descMatch = repoHtml.match(/<p[^>]*class="[^"]*color-fg-muted[^"]*"[^>]*>([\s\S]*?)<\/p>/);
        const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // 提取编程语言
        const langMatch = repoHtml.match(/itemprop="programmingLanguage"[^>]*>([^<]*)</);
        const language = langMatch ? langMatch[1].trim() : '';

        // 提取语言颜色
        const langColorMatch = repoHtml.match(/background-color:\s*([^;]+)/);
        const languageColor = langColorMatch ? langColorMatch[1].trim() : '';

        // 提取 Stars 数
        const starsMatch = repoHtml.match(/\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/);
        const starsText = starsMatch ? starsMatch[1].replace(/,/g, '').trim() : '0';
        const stars = parseNumber(starsText);

        // 提取 Forks 数
        const forksMatch = repoHtml.match(/\/forks"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/);
        const forksText = forksMatch ? forksMatch[1].replace(/,/g, '').trim() : '0';
        const forks = parseNumber(forksText);

        // 提取今日/本周新增 Stars
        const starsTodayMatch = repoHtml.match(/([\d,]+)\s*stars?\s*(today|this week|this month)/i);
        let starsToday = 0;
        if (starsTodayMatch) {
            starsToday = parseNumber(starsTodayMatch[1]);
        }

        if (owner && name) {
            repos.push({
                id: repos.length + 1,
                owner,
                name,
                fullName,
                url: `https://github.com${repoPath}`,
                description,
                language,
                languageColor,
                stars,
                forks,
                starsToday,
                // 生成模拟的 7 天趋势数据（基于 weeklyStars）
                weeklyTrend: generateTrendData(starsToday)
            });
        }
    }

    console.log(`✅ 成功解析 ${repos.length} 个仓库`);
    return repos;
}

function parseNumber(text) {
    if (!text) return 0;
    const clean = text.toString().replace(/,/g, '').trim();
    if (clean.includes('k')) {
        return Math.round(parseFloat(clean) * 1000);
    }
    if (clean.includes('m')) {
        return Math.round(parseFloat(clean) * 1000000);
    }
    return parseInt(clean) || 0;
}

// 生成趋势数据
function generateTrendData(weeklyStars) {
    const dailyAvg = Math.round(weeklyStars / 7);
    return Array.from({ length: 7 }, (_, i) => {
        const variation = 0.5 + Math.random();
        return Math.max(0, Math.round(dailyAvg * variation));
    });
}

// 从 GitHub Trending 页面获取数据
async function fetchTrendingFromGitHub(language = '', since = 'weekly') {
    return new Promise((resolve, reject) => {
        let url = 'https://github.com/trending';
        if (language) {
            url += `/${encodeURIComponent(language)}`;
        }
        url += `?since=${since}`;

        const options = {
            hostname: 'github.com',
            path: url.replace('https://github.com', ''),
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        };

        const request = https.request(options, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const repos = parseTrendingHTML(data);
                    resolve(repos);
                } catch (error) {
                    reject(new Error(`解析 HTML 失败: ${error.message}`));
                }
            });
        });

        request.on('error', (error) => {
            reject(new Error(`请求失败: ${error.message}`));
        });

        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('请求超时'));
        });

        request.end();
    });
}

// 合并多种语言的数据
async function fetchAllTrending() {
    const languages = ['', 'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'cpp', 'c'];
    const allRepos = [];
    const seenRepos = new Set();

    for (const lang of languages) {
        try {
            console.log(`正在获取 ${lang || 'all'} 的 trending 数据...`);
            const repos = await fetchTrendingFromGitHub(lang, 'weekly');
            repos.forEach(repo => {
                if (!seenRepos.has(repo.fullName)) {
                    seenRepos.add(repo.fullName);
                    allRepos.push(repo);
                }
            });
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.warn(`获取 ${lang || 'all'} 失败:`, error.message);
        }
    }

    // 按本周新增 Stars 排序
    return allRepos.sort((a, b) => b.starsToday - a.starsToday);
}

// 主函数
async function main() {
    try {
        console.log('🚀 开始抓取 GitHub Trending 数据...');
        console.log(`📅 时间: ${new Date().toISOString()}`);
        console.log('');

        const repos = await fetchAllTrending();

        if (repos.length === 0) {
            throw new Error('未获取到任何仓库数据');
        }

        // 构建输出数据结构
        const output = {
            timestamp: new Date().toISOString(),
            total: repos.length,
            data: repos
        };

        // 确保输出目录存在
        const outputDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 写入文件
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

        console.log('');
        console.log('✅ 数据抓取完成！');
        console.log(`📊 共 ${repos.length} 个仓库`);
        console.log(`💾 已保存到: ${OUTPUT_FILE}`);
        console.log(`📅 更新时间: ${output.timestamp}`);

        // 输出前 10 个项目
        console.log('');
        console.log('🏆 Top 10 项目:');
        repos.slice(0, 10).forEach((repo, index) => {
            console.log(`  ${index + 1}. ${repo.fullName} (+${repo.starsToday} stars)`);
        });

    } catch (error) {
        console.error('');
        console.error('❌ 数据抓取失败:', error.message);
        process.exit(1);
    }
}

main();
