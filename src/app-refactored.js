/**
 * GitHub Trending Stars - 重构版
 * 采用模块化设计，提高可读性和可扩展性
 */

(function() {
    'use strict';

    // ==================== 配置模块 ====================
    const Config = {
        ITEMS_PER_PAGE: 20,
        CACHE_KEY: 'github_trending_data',
        CACHE_DURATION: 60 * 60 * 1000,
        DATA_PATHS: {
            trending: [
                './public/data/trending.json',
                '/public/data/trending.json',
                'public/data/trending.json',
                '../public/data/trending.json'
            ],
            skills: [
                './public/data/skills.json',
                '/public/data/skills.json',
                'public/data/skills.json',
                '../public/data/skills.json'
            ]
        }
    };

    // ==================== 工具模块 ====================
    const Utils = {
        formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        },

        formatDate(date) {
            return new Date(date).toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        },

        getLanguageColor(language) {
            const colors = {
                'JavaScript': '#f1e05a', 'TypeScript': '#2b7489', 'Python': '#3572A5',
                'Java': '#b07219', 'Go': '#00ADD8', 'Rust': '#dea584',
                'C++': '#f34b7d', 'C': '#555555', 'C#': '#178600',
                'PHP': '#4F5D95', 'Ruby': '#701516', 'Swift': '#ffac45',
                'Kotlin': '#A97BFF', 'Vue': '#41b883', 'HTML': '#e34c26',
                'CSS': '#563d7c', 'Shell': '#89e051'
            };
            return colors[language] || '#8b8b9e';
        },

        debounce(fn, delay) {
            let timeoutId;
            return function(...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        storage: {
            get(key) {
                try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
            },
            set(key, value) {
                try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
            }
        }
    };

    // ==================== API 模块 ====================
    const API = {
        async fetchFromPaths(paths, bustCache = false) {
            for (const path of paths) {
                try {
                    const url = bustCache ? `${path}?t=${Date.now()}` : path;
                    const response = await fetch(url);
                    if (response.ok) return await response.json();
                } catch {}
            }
            return null;
        },

        async getTrending(force = false) {
            const data = await this.fetchFromPaths(Config.DATA_PATHS.trending, force);
            if (data) return { data: data.data, timestamp: data.timestamp, source: 'static' };
            throw new Error('无法加载数据');
        },

        async getSkills() {
            const data = await this.fetchFromPaths(Config.DATA_PATHS.skills);
            if (data) return { data: data.data, total: data.total };
            throw new Error('无法加载 Skills 数据');
        }
    };

    // ==================== 数据处理器 ====================
    const DataProcessor = {
        processRepo(repo, index) {
            const isStatic = repo.fullName !== undefined;
            return {
                id: repo.id || index + 1,
                name: isStatic ? repo.fullName : repo.name,
                owner: repo.owner,
                repo: isStatic ? repo.name : repo.repo,
                description: repo.description || '暂无描述',
                language: repo.language,
                stars: repo.stars || 0,
                weeklyStars: repo.starsToday || repo.weeklyStars || 0,
                forks: repo.forks || 0,
                url: repo.url,
                languageColor: repo.languageColor || Utils.getLanguageColor(repo.language),
                weeklyTrend: repo.weeklyTrend || this.generateTrend(repo.starsToday || 0),
                category: repo.category || null
            };
        },

        generateTrend(weeklyStars) {
            const dailyAvg = Math.round(weeklyStars / 7);
            return Array.from({ length: 7 }, () => 
                Math.max(0, Math.round(dailyAvg * (0.5 + Math.random())))
            );
        },

        sort(projects, sortBy, order) {
            const getValue = (p) => {
                switch(sortBy) {
                    case 'weeklyStars': return p.weeklyStars;
                    case 'totalStars': return p.stars;
                    case 'name': return p.repo.toLowerCase();
                    default: return p.weeklyStars;
                }
            };
            
            return [...projects].sort((a, b) => {
                const aVal = getValue(a), bVal = getValue(b);
                return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
            });
        },

        filter(projects, { search, language, category }) {
            return projects.filter(p => {
                if (search && !this.matchesSearch(p, search)) return false;
                if (language && p.language !== language) return false;
                if (category && p.category !== category) return false;
                return true;
            });
        },

        matchesSearch(project, query) {
            const q = query.toLowerCase();
            return project.name.toLowerCase().includes(q) ||
                   (project.description && project.description.toLowerCase().includes(q)) ||
                   project.owner.toLowerCase().includes(q);
        }
    };

    // ==================== UI 渲染器 ====================
    const UI = {
        elements: {},

        init() {
            this.cacheElements();
        },

        cacheElements() {
            const ids = ['projectsContainer', 'pagination', 'searchInput', 'languageFilter',
                        'refreshBtn', 'lastUpdateTime', 'totalProjects', 'totalWeeklyStars',
                        'totalStars', 'totalLanguages', 'statLabel4', 'chartModal',
                        'modalClose', 'modalTitle', 'trendChart'];
            ids.forEach(id => this.elements[id] = document.getElementById(id));
        },

        showLoading() {
            this.elements.projectsContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">正在加载...</div>
                </div>`;
        },

        showError(msg) {
            this.elements.projectsContainer.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <div class="error-title">加载失败</div>
                    <div class="error-message">${msg}</div>
                </div>`;
        },

        updateStats(projects, isSkills) {
            const totalStars = projects.reduce((s, p) => s + p.stars, 0);
            const totalWeekly = projects.reduce((s, p) => s + p.weeklyStars, 0);

            this.elements.totalProjects.textContent = Utils.formatNumber(projects.length);
            this.elements.totalStars.textContent = Utils.formatNumber(totalStars);
            this.elements.totalWeeklyStars.textContent = '+' + Utils.formatNumber(totalWeekly);

            if (isSkills) {
                const cats = new Set(projects.map(p => p.category).filter(Boolean));
                this.elements.totalLanguages.textContent = cats.size;
                this.elements.statLabel4.textContent = 'Skills 分类';
            } else {
                const langs = new Set(projects.map(p => p.language).filter(Boolean));
                this.elements.totalLanguages.textContent = langs.size;
                this.elements.statLabel4.textContent = '编程语言';
            }
        },

        updateLanguageFilter(projects) {
            const langs = [...new Set(projects.map(p => p.language).filter(Boolean))].sort();
            this.elements.languageFilter.innerHTML = 
                '<option value="">所有语言</option>' +
                langs.map(l => `<option value="${l}">${l}</option>`).join('');
        },

        renderProjects(projects, page) {
            const start = (page - 1) * Config.ITEMS_PER_PAGE;
            const pageProjects = projects.slice(start, start + Config.ITEMS_PER_PAGE);

            if (pageProjects.length === 0) {
                this.elements.projectsContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <div class="empty-title">未找到项目</div>
                    </div>`;
                return;
            }

            this.elements.projectsContainer.innerHTML = pageProjects.map((p, i) => 
                this.createCard(p, start + i + 1)
            ).join('');
        },

        createCard(project, rank) {
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            return `
                <div class="project-card ${rankClass}" data-id="${project.id}">
                    <div class="rank-badge ${rank <= 3 ? 'rank-' + rank : ''}">${rank}</div>
                    <div class="project-header">
                        <a href="${project.url}" target="_blank" class="project-name">${project.name}</a>
                        <div class="project-stats">
                            <span class="stat-item">⭐ ${Utils.formatNumber(project.stars)}</span>
                            <span class="stat-item weekly-stars">📈 +${Utils.formatNumber(project.weeklyStars)}</span>
                        </div>
                    </div>
                    <div class="project-description">${project.description}</div>
                    <div class="project-footer">
                        <div class="project-meta">
                            ${project.language ? `<span class="language-tag" style="--lang-color: ${project.languageColor}">${project.language}</span>` : ''}
                            ${project.category ? `<span class="category-badge">${project.category}</span>` : ''}
                            <span class="forks-count">🍴 ${Utils.formatNumber(project.forks)}</span>
                        </div>
                    </div>
                </div>`;
        },

        renderPagination(total, current) {
            const pages = Math.ceil(total / Config.ITEMS_PER_PAGE);
            if (pages <= 1) {
                this.elements.pagination.innerHTML = '';
                return;
            }

            let html = `<button class="page-btn ${current === 1 ? 'disabled' : ''}" data-page="${current - 1}">←</button>`;
            
            for (let i = 1; i <= pages; i++) {
                if (i === 1 || i === pages || (i >= current - 2 && i <= current + 2)) {
                    html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
                } else if (i === current - 3 || i === current + 3) {
                    html += `<span class="page-ellipsis">...</span>`;
                }
            }

            html += `<button class="page-btn ${current === pages ? 'disabled' : ''}" data-page="${current + 1}">→</button>`;
            this.elements.pagination.innerHTML = html;
        },

        renderCategories(categories, selected) {
            const names = {
                claude: 'Claude', codex: 'Codex', cursor: 'Cursor',
                plugin: 'Plugin', memory: 'Memory', knowledge: 'Knowledge',
                research: 'Research', agent: 'Agent', general: 'General'
            };

            let container = document.getElementById('skillsCategories');
            if (!container) {
                container = document.createElement('div');
                container.id = 'skillsCategories';
                container.className = 'skills-categories';
                document.querySelector('.controls').before(container);
            }

            container.innerHTML = categories.map(cat => 
                `<span class="category-tag ${selected === cat ? 'active' : ''}" data-category="${cat}">${names[cat] || cat}</span>`
            ).join('');
        },

        removeCategories() {
            const container = document.getElementById('skillsCategories');
            if (container) container.remove();
        },

        showChart(project, chartInstance) {
            this.elements.modalTitle.textContent = `${project.repo} - 趋势`;
            this.elements.chartModal.classList.add('active');

            if (chartInstance) chartInstance.destroy();

            const ctx = this.elements.trendChart.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

            return new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['6天前', '5天前', '4天前', '3天前', '2天前', '昨天', '今天'],
                    datasets: [{
                        label: '新增 Stars',
                        data: project.weeklyTrend,
                        borderColor: '#3b82f6',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        },

        closeModal() {
            this.elements.chartModal.classList.remove('active');
        }
    };

    // ==================== 主题管理器 ====================
    const ThemeManager = {
        STORAGE_KEY: 'github_trending_theme',
        DEFAULT_THEME: 'sky',

        themes: {
            minimal: { name: '极简白', icon: '⚫' },
            nature: { name: '自然绿', icon: '🌿' },
            sky: { name: '天空蓝', icon: '☁️' },
            warm: { name: '奶油暖', icon: '🌅' },
            purple: { name: '暗夜紫', icon: '🌙' },
            paper: { name: '纸艺风', icon: '📜' },
            glass: { name: '玻璃拟态', icon: '💎' },
            retro: { name: '复古终端', icon: '⌨️' },
            brutalist: { name: '新粗野', icon: '🔲' },
            japanese: { name: '日式极简', icon: '⛩️' }
        },

        init() {
            const saved = this.getSaved();
            this.apply(saved);
            this.bindEvents();
            this.updateActive(saved);
        },

        getSaved() {
            try { return localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_THEME; }
            catch { return this.DEFAULT_THEME; }
        },

        save(theme) {
            try { localStorage.setItem(this.STORAGE_KEY, theme); } catch {}
        },

        apply(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            this.save(theme);
            this.updateActive(theme);
        },

        updateActive(current) {
            document.querySelectorAll('.theme-option').forEach(el => {
                el.classList.toggle('active', el.dataset.theme === current);
            });
        },

        bindEvents() {
            const toggle = document.getElementById('themeToggleBtn');
            const panel = document.getElementById('themePanel');
            const close = document.getElementById('themePanelClose');

            toggle?.addEventListener('click', (e) => {
                e.stopPropagation();
                panel?.classList.toggle('active');
            });

            close?.addEventListener('click', (e) => {
                e.stopPropagation();
                panel?.classList.remove('active');
            });

            document.querySelectorAll('.theme-option').forEach(el => {
                el.addEventListener('click', () => {
                    this.apply(el.dataset.theme);
                    panel?.classList.remove('active');
                });
            });

            document.addEventListener('click', (e) => {
                if (!panel?.contains(e.target) && !toggle?.contains(e.target)) {
                    panel?.classList.remove('active');
                }
            });
        }
    };

    // ==================== 主应用 ====================
    const App = {
        state: {
            projects: [],
            filtered: [],
            skillsData: [],
            page: 1,
            sortBy: 'weeklyStars',
            sortOrder: 'desc',
            search: '',
            language: '',
            category: '',
            tab: 'all',
            loading: false,
            chart: null
        },

        async init() {
            UI.init();
            ThemeManager.init();
            this.bindEvents();
            await this.loadData();
        },

        bindEvents() {
            // 搜索
            UI.elements.searchInput.addEventListener('input',
                Utils.debounce((e) => {
                    this.state.search = e.target.value.toLowerCase();
                    this.state.page = 1;
                    this.filterAndRender();
                }, 300)
            );

            // 语言筛选
            UI.elements.languageFilter.addEventListener('change', (e) => {
                this.state.language = e.target.value;
                this.state.page = 1;
                this.filterAndRender();
            });

            // 刷新
            UI.elements.refreshBtn.addEventListener('click', () => this.loadData(true));

            // 排序
            document.querySelectorAll('.sort-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sortBy = btn.dataset.sort;
                    if (this.state.sortBy === sortBy) {
                        this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.state.sortBy = sortBy;
                        this.state.sortOrder = 'desc';
                    }
                    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.filterAndRender();
                });
            });

            // 标签切换
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;
                    if (this.state.tab === tab) return;
                    this.state.tab = tab;
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.switchTab(tab);
                });
            });

            // 分页
            UI.elements.pagination.addEventListener('click', (e) => {
                if (e.target.classList.contains('page-btn') && !e.target.disabled) {
                    this.goToPage(parseInt(e.target.dataset.page));
                }
            });

            // 分类筛选
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('category-tag')) {
                    const cat = e.target.dataset.category;
                    this.state.category = this.state.category === cat ? '' : cat;
                    document.querySelectorAll('.category-tag').forEach(el => {
                        el.classList.toggle('active', el.dataset.category === this.state.category);
                    });
                    this.filterAndRender();
                }
            });

            // 模态框
            UI.elements.modalClose.addEventListener('click', () => UI.closeModal());
            UI.elements.chartModal.addEventListener('click', (e) => {
                if (e.target === UI.elements.chartModal) UI.closeModal();
            });

            // 项目卡片点击
            UI.elements.projectsContainer.addEventListener('click', (e) => {
                const card = e.target.closest('.project-card');
                if (card && !e.target.closest('a')) {
                    const id = parseInt(card.dataset.id);
                    const project = this.state.projects.find(p => p.id === id);
                    if (project) {
                        this.state.chart = UI.showChart(project, this.state.chart);
                    }
                }
            });
        },

        async loadData(force = false) {
            if (this.state.loading) return;
            this.state.loading = true;
            UI.elements.refreshBtn.disabled = true;
            UI.elements.refreshBtn.classList.add('spinning');
            
            if (!force) UI.showLoading();

            try {
                const result = await API.getTrending(force);
                this.state.projects = result.data.map((r, i) => DataProcessor.processRepo(r, i));
                this.state.filtered = [...this.state.projects];
                UI.elements.lastUpdateTime.textContent = result.timestamp
                    ? Utils.formatDate(new Date(result.timestamp))
                    : Utils.formatDate(new Date());
                this.updateUI();
            } catch (err) {
                console.error(err);
                UI.showError('无法加载数据');
            } finally {
                this.state.loading = false;
                UI.elements.refreshBtn.disabled = false;
                UI.elements.refreshBtn.classList.remove('spinning');
            }
        },

        updateUI() {
            UI.updateStats(this.state.projects, this.state.tab === 'skills');
            UI.updateLanguageFilter(this.state.projects);
            this.filterAndRender();
        },

        filterAndRender() {
            const filters = {
                search: this.state.search,
                language: this.state.tab === 'skills' ? '' : this.state.language,
                category: this.state.tab === 'skills' ? this.state.category : ''
            };

            let result = DataProcessor.filter(this.state.projects, filters);
            result = DataProcessor.sort(result, this.state.sortBy, this.state.sortOrder);

            this.state.filtered = result;
            UI.renderProjects(result, this.state.page);
            UI.renderPagination(result.length, this.state.page);
        },

        async switchTab(tab) {
            this.state.tab = tab;
            this.state.page = 1;

            if (tab === 'skills') {
                // 重置分类筛选
                this.state.category = '';
                
                if (this.state.skillsData.length === 0) {
                    try {
                        const result = await API.getSkills();
                        this.state.skillsData = result.data.map((r, i) => ({
                            ...DataProcessor.processRepo(r, i),
                            category: r.category || 'general'
                        }));
                    } catch (err) {
                        console.error(err);
                        UI.showError('无法加载 Skills 数据');
                        return;
                    }
                }
                this.state.projects = this.state.skillsData;
                const cats = [...new Set(this.state.skillsData.map(p => p.category).filter(Boolean))];
                UI.renderCategories(cats, this.state.category);
            } else {
                // 重置分类筛选
                this.state.category = '';
                await this.loadData();
                UI.removeCategories();
            }

            this.state.filtered = [...this.state.projects];
            this.updateUI();
        },

        goToPage(page) {
            this.state.page = page;
            UI.renderProjects(this.state.filtered, this.state.page);
            UI.renderPagination(this.state.filtered.length, this.state.page);
            UI.elements.projectsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // 启动
    document.addEventListener('DOMContentLoaded', () => App.init());

})();
