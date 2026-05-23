// GitHub Trending 代理服务器
// 使用 github-trending skill 推荐的网页抓取方式获取数据

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
const CACHE_FILE = path.join(__dirname, 'cache.json');
const CACHE_DURATION = 60 * 60 * 1000; // 1小时

// 简单的 HTML 解析器（无需外部依赖）
function parseTrendingHTML(html) {
    const repos = [];

    // 检查是否有仓库数据
    if (!html.includes('Box-row')) {
        console.error('❌ 未找到仓库数据 (Box-row)');
        return repos;
    }

    // 使用正则表达式解析 GitHub Trending 页面
    // 匹配每个仓库卡片
    const repoRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
    let match;

    while ((match = repoRegex.exec(html)) !== null) {
        const repoHtml = match[1];

        // 提取仓库链接和名称 - 新的 HTML 结构
        // 格式: <a href="/owner/repo" ...>owner / repo</a>
        const linkMatch = repoHtml.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/);
        if (!linkMatch) {
            console.log('未找到仓库链接');
            continue;
        }

        const repoPath = linkMatch[1].trim();
        // 从链接文本中提取仓库名称
        const linkText = linkMatch[2].replace(/<[^>]+>/g, ' ').trim();
        // 提取格式: "owner / repo"
        const nameMatch = linkText.match(/(\S+)\s*\/\s*(\S+)/);
        if (!nameMatch) {
            console.log('无法解析仓库名称:', linkText);
            continue;
        }
        
        const owner = nameMatch[1];
        const name = nameMatch[2];
        const fullName = `${owner}/${name}`;

        // 提取描述 - 新的 class 名称
        const descMatch = repoHtml.match(/<p[^>]*class="[^"]*color-fg-muted[^"]*"[^>]*>([\s\S]*?)<\/p>/);
        const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // 提取编程语言
        const langMatch = repoHtml.match(/itemprop="programmingLanguage"[^>]*>([^<]*)</);
        const language = langMatch ? langMatch[1].trim() : '';

        // 提取语言颜色
        const langColorMatch = repoHtml.match(/background-color:\s*([^;]+)/);
        const languageColor = langColorMatch ? langColorMatch[1].trim() : '';

        // 提取 Stars 数 - 新的 HTML 结构
        // 格式: <a href=".../stargazers">...svg...</a>\n        17,399</a>
        const starsMatch = repoHtml.match(/\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/);
        const starsText = starsMatch ? starsMatch[1].replace(/,/g, '').trim() : '0';
        const stars = parseNumber(starsText);

        // 提取 Forks 数
        const forksMatch = repoHtml.match(/\/forks"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/);
        const forksText = forksMatch ? forksMatch[1].replace(/,/g, '').trim() : '0';
        const forks = parseNumber(forksText);

        // 提取今日/本周新增 Stars - 新的格式
        // 格式: "14,072 stars this week"
        const starsTodayMatch = repoHtml.match(/([\d,]+)\s*stars?\s*(today|this week|this month)/i);
        let starsToday = 0;
        if (starsTodayMatch) {
            starsToday = parseNumber(starsTodayMatch[1]);
        }

        if (owner && name) {
            repos.push({
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
                id: repos.length + 1
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
                // 不发送 Accept-Encoding，让服务器返回未压缩的内容
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

// 获取缓存数据
function getCachedData() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            if (Date.now() - cache.timestamp < CACHE_DURATION) {
                return cache.data;
            }
        }
    } catch (error) {
        console.error('读取缓存失败:', error);
    }
    return null;
}

// 保存缓存数据
function saveCache(data) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
    } catch (error) {
        console.error('保存缓存失败:', error);
    }
}

// 合并多种语言的数据
async function fetchAllTrending() {
    const languages = ['', 'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'cpp', 'c'];
    const allRepos = [];
    const seenRepos = new Set();

    for (const lang of languages) {
        try {
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

    // 按今日新增 Stars 排序
    return allRepos.sort((a, b) => b.starsToday - a.starsToday);
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    // API 路由
    if (url.pathname === '/api/trending') {
        try {
            // 检查缓存
            const cached = getCachedData();
            if (cached) {
                console.log('返回缓存数据');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: cached,
                    cached: true,
                    timestamp: new Date().toISOString()
                }));
                return;
            }

            // 获取新数据
            console.log('从 GitHub 获取 trending 数据...');
            const repos = await fetchAllTrending();

            // 保存缓存
            saveCache(repos);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: repos,
                cached: false,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error('获取数据失败:', error);

            // 如果有缓存，返回过期缓存
            const cached = getCachedData();
            if (cached) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: cached,
                    cached: true,
                    stale: true,
                    timestamp: new Date().toISOString()
                }));
                return;
            }

            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
        return;
    }

    // 刷新缓存路由
    if (url.pathname === '/api/refresh') {
        try {
            console.log('强制刷新数据...');
            const repos = await fetchAllTrending();
            saveCache(repos);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: repos,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
        return;
    }

    // 静态文件服务
    let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);

    // 防止目录遍历
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }

        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('API 端点:');
    console.log(`  - GET http://localhost:${PORT}/api/trending  (获取 trending 数据)`);
    console.log(`  - GET http://localhost:${PORT}/api/refresh   (强制刷新数据)`);
});
