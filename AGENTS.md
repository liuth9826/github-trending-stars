# AGENTS.md

GitHub Trending Stars - 一个展示 GitHub 热门开源项目的 Web 应用，具有赛博朋克风格 UI 和实时数据展示。

## 项目结构

```
/Users/liuth/github-trending-stars/
├── index.html      # 前端页面（赛博朋克风格 UI）
├── server.js       # Node.js 代理服务器
├── cache.json      # 数据缓存文件
├── AGENTS.md       # 本文件
├── feature_list.json # 功能状态追踪
├── progress.md     # 会话进度日志
└── init.sh         # 初始化脚本
```

## 技术栈

- **前端**: 原生 HTML5 + CSS3 + JavaScript (Chart.js 用于图表)
- **后端**: Node.js (原生 http/https 模块，无外部依赖)
- **数据来源**: GitHub Trending 页面爬虫

## Startup Workflow

开始编码前：

1. **确认工作目录** - 使用 `pwd` 确认在 `/Users/liuth/github-trending-stars`
2. **阅读本文件** - 了解项目结构和规则
3. **运行 `./init.sh`** - 验证环境健康
4. **阅读 `feature_list.json`** - 查看当前功能状态
5. **查看 `server.js` 和 `index.html`** - 了解现有实现

如果基线验证失败，请先修复再添加新功能。

## Working Rules

- **一次一个功能**: 从 `feature_list.json` 中选择一个未完成的功能
- **需要验证**: 修改后必须测试服务器能正常启动
- **更新文档**: 会话结束前更新 `progress.md` 和 `feature_list.json`
- **保持范围**: 不要修改与当前功能无关的文件
- **保持整洁**: 确保下次会话能立即运行 `./init.sh`

## Required Artifacts

- `feature_list.json` — 功能状态追踪（唯一真相源）
- `progress.md` — 会话连续性日志
- `init.sh` — 标准启动和验证脚本
- `AGENTS.md` — 本文件

## Definition of Done

功能完成的标准：

- [ ] 目标行为已实现
- [ ] 服务器能正常启动 (`node server.js`)
- [ ] 前端页面能正常访问 (`http://localhost:3000`)
- [ ] 证据记录在 `feature_list.json` 或 `progress.md`
- [ ] 代码整洁，无遗留调试代码

## End of Session

会话结束前：

1. 更新 `progress.md` 记录当前状态
2. 更新 `feature_list.json` 的功能状态
3. 记录未解决的风险或阻塞
4. 确保代码处于可运行状态
5. 保持仓库整洁，下次能立即运行 `./init.sh`

## Verification Commands

```bash
# 完整验证（推荐）
./init.sh

# 单独检查
node server.js          # 启动服务器
curl http://localhost:3000/api/trending  # 测试 API
```

## 开发注意事项

### 后端 (server.js)
- 使用原生 Node.js 模块，无 npm 依赖
- 通过爬虫获取 GitHub Trending 数据
- 缓存数据保存在 `cache.json`
- 默认端口 3000

### 前端 (index.html)
- 单页面应用，纯前端渲染
- 使用 Chart.js 绘制趋势图
- 响应式设计，支持移动端
- 数据通过 `/api/trending` 获取

### 常见修改点
- **添加新语言**: 修改 `server.js` 中的 `languages` 数组
- **调整 UI 样式**: 修改 `index.html` 中的 CSS 变量
- **添加新功能**: 参考 `feature_list.json` 中的待办功能

## Escalation

遇到以下情况：
- **架构决策**: 查阅本文件或询问用户
- **需求不明确**: 询问用户
- **重复测试失败**: 更新 progress，标记需人工审查
- **范围模糊**: 重新阅读 `feature_list.json` 的完成定义
