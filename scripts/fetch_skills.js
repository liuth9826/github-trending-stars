#!/usr/bin/env node
/**
 * AI Skills 数据抓取脚本
 * 专门抓取与 skills、agents、plugins 相关的项目
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'skills.json');

// Skills 相关的搜索关键词和仓库
const SKILLS_KEYWORDS = [
  'skill', 'skills', 'agent', 'agents', 'plugin', 'plugins',
  'claude-code', 'codex', 'cursor', 'ai-agent', 'agentic',
  'knowledge-graph', 'memory', 'tool', 'tools'
];

// 已知的优质 skills 仓库（owner/repo）
const KNOWN_SKILLS_REPOS = [
  'colbymchenry/codegraph',
  'Imbad0202/academic-research-skills',
  'obra/superpowers',
  'anthropics/claude-plugins-official',
  'K-Dense-AI/scientific-agent-skills',
  'rohitg00/agentmemory',
  'humanlayer/12-factor-agents',
  'farion1231/cc-switch',
  'HKUDS/CLI-Anything',
  'can1357/oh-my-pi'
];

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
      continue;
    }

    const repoPath = linkMatch[1].trim();
    const linkText = linkMatch[2].replace(/<[^>]+>/g, ' ').trim();
    const nameMatch = linkText.match(/(\S+)\s*\/\s*(\S+)/);
    if (!nameMatch) {
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

    // 提取语言颜色 - 只提取颜色值，不包含其他HTML
    let languageColor = '';
    const langColorSection = repoHtml.match(/<span[^>]*style="[^"]*background-color:\s*([^"]+)"[^>]*>/);
    if (langColorSection) {
      languageColor = langColorSection[1].replace(/[;"']/g, '').trim();
    }

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

    // 判断是否是 skills 相关项目
    const isSkillsRelated = checkIfSkillsRelated(fullName, description, name);

    if (owner && name && isSkillsRelated) {
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
        weeklyTrend: generateTrendData(starsToday),
        category: categorizeSkills(fullName, description)
      });
    }
  }

  console.log(`✅ 成功解析 ${repos.length} 个 skills 相关仓库`);
  return repos;
}

// 检查是否是 skills 相关项目
function checkIfSkillsRelated(fullName, description, name) {
  const text = `${fullName} ${description} ${name}`.toLowerCase();
  
  // 检查是否在已知列表中
  if (KNOWN_SKILLS_REPOS.includes(fullName)) {
    return true;
  }
  
  // 检查关键词
  return SKILLS_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

// 分类 skills
function categorizeSkills(fullName, description) {
  const text = `${fullName} ${description}`.toLowerCase();
  
  if (text.includes('claude')) return 'claude';
  if (text.includes('codex')) return 'codex';
  if (text.includes('cursor')) return 'cursor';
  if (text.includes('plugin')) return 'plugin';
  if (text.includes('memory')) return 'memory';
  if (text.includes('knowledge') || text.includes('graph')) return 'knowledge';
  if (text.includes('research') || text.includes('academic')) return 'research';
  if (text.includes('agent')) return 'agent';
  return 'general';
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

// 获取已知仓库的详细信息
async function fetchRepoDetails(owner, repo) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}`,
      method: 'GET',
      headers: {
        'User-Agent': 'GitHub-Trending-Skills-Fetcher',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          if (response.statusCode === 200) {
            const repo = JSON.parse(data);
            resolve({
              id: 0,
              owner: repo.owner.login,
              name: repo.name,
              fullName: repo.full_name,
              url: repo.html_url,
              description: repo.description || '',
              language: repo.language || '',
              languageColor: '',
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              starsToday: 0,
              weeklyTrend: generateTrendData(0),
              category: categorizeSkills(repo.full_name, repo.description || '')
            });
          } else {
            reject(new Error(`API 返回错误: ${response.statusCode}`));
          }
        } catch (error) {
          reject(new Error(`解析 JSON 失败: ${error.message}`));
        }
      });
    });

    request.on('error', (error) => {
      reject(new Error(`请求失败: ${error.message}`));
    });

    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('请求超时'));
    });

    request.end();
  });
}

// 合并多种语言的数据
async function fetchAllSkills() {
  const languages = ['', 'javascript', 'typescript', 'python', 'go', 'rust', 'java'];
  const allRepos = [];
  const seenRepos = new Set();

  // 从 trending 页面获取
  for (const lang of languages) {
    try {
      console.log(`正在获取 ${lang || 'all'} 的 skills 数据...`);
      const repos = await fetchTrendingFromGitHub(lang, 'weekly');
      repos.forEach(repo => {
        if (!seenRepos.has(repo.fullName)) {
          seenRepos.add(repo.fullName);
          allRepos.push(repo);
        }
      });
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
  console.log('🚀 开始抓取 AI Skills 数据...');
  console.log(`📅 时间: ${new Date().toISOString()}`);
  console.log('');

  try {
    const repos = await fetchAllSkills();

    // 确保输出目录存在
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 保存数据
    const data = {
      timestamp: new Date().toISOString(),
      total: repos.length,
      data: repos
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));

    console.log('');
    console.log('✅ Skills 数据抓取完成！');
    console.log(`📊 共 ${repos.length} 个 skills 相关仓库`);
    console.log(`💾 已保存到: ${OUTPUT_FILE}`);
    console.log(`📅 更新时间: ${data.timestamp}`);
    console.log('');
    console.log('🏆 Top Skills 项目:');
    repos.slice(0, 10).forEach((repo, index) => {
      console.log(`  ${index + 1}. ${repo.fullName} (+${repo.starsToday} stars) [${repo.category}]`);
    });

  } catch (error) {
    console.error('❌ 抓取失败:', error.message);
    process.exit(1);
  }
}

main();
