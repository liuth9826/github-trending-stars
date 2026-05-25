/**
 * UI 渲染模块
 * 负责所有 DOM 操作和渲染
 */

import Utils from './utils.js';
import CONFIG from './config.js';

const UI = {
  elements: {},

  /**
   * 初始化 DOM 元素引用
   */
  initElements() {
    this.elements = {
      projectsContainer: document.getElementById('projectsContainer'),
      pagination: document.getElementById('pagination'),
      searchInput: document.getElementById('searchInput'),
      languageFilter: document.getElementById('languageFilter'),
      dateRangeFilter: document.getElementById('dateRangeFilter'),
      refreshBtn: document.getElementById('refreshBtn'),
      lastUpdateTime: document.getElementById('lastUpdateTime'),
      totalProjects: document.getElementById('totalProjects'),
      totalWeeklyStars: document.getElementById('totalWeeklyStars'),
      totalStars: document.getElementById('totalStars'),
      totalLanguages: document.getElementById('totalLanguages'),
      statLabel4: document.getElementById('statLabel4'),
      chartModal: document.getElementById('chartModal'),
      modalClose: document.getElementById('modalClose'),
      modalTitle: document.getElementById('modalTitle'),
      trendChart: document.getElementById('trendChart')
    };
  },

  /**
   * 显示加载状态
   */
  showLoading() {
    this.elements.projectsContainer.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在加载 GitHub 数据...</div>
      </div>
    `;
  },

  /**
   * 显示错误状态
   */
  showError(message) {
    this.elements.projectsContainer.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-title">加载失败</div>
        <div class="error-message">${message}</div>
        <button class="refresh-btn" onclick="location.reload()">重试</button>
      </div>
    `;
  },

  /**
   * 更新统计信息
   */
  updateStats(projects, isSkillsMode) {
    const totalStars = projects.reduce((sum, p) => sum + p.stars, 0);
    const totalWeekly = projects.reduce((sum, p) => sum + p.weeklyStars, 0);

    this.elements.totalProjects.textContent = Utils.formatNumber(projects.length);
    this.elements.totalStars.textContent = Utils.formatNumber(totalStars);
    this.elements.totalWeeklyStars.textContent = '+' + Utils.formatNumber(totalWeekly);

    if (isSkillsMode) {
      const categories = new Set(projects.map(p => p.category).filter(Boolean));
      this.elements.totalLanguages.textContent = categories.size;
      this.elements.statLabel4.textContent = 'Skills 分类';
    } else {
      const languages = new Set(projects.map(p => p.language).filter(Boolean));
      this.elements.totalLanguages.textContent = languages.size;
      this.elements.statLabel4.textContent = '编程语言';
    }
  },

  /**
   * 更新语言筛选器
   */
  updateLanguageFilter(projects) {
    const languages = [...new Set(projects.map(p => p.language).filter(Boolean))].sort();
    const options = languages.map(lang => `<option value="${lang}">${lang}</option>`).join('');
    this.elements.languageFilter.innerHTML = '<option value="">所有语言</option>' + options;
  },

  /**
   * 渲染项目列表
   */
  renderProjects(projects, currentPage) {
    const start = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const end = start + CONFIG.ITEMS_PER_PAGE;
    const pageProjects = projects.slice(start, end);

    if (pageProjects.length === 0) {
      this.elements.projectsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">未找到项目</div>
          <div class="empty-message">尝试调整筛选条件或搜索关键词</div>
        </div>
      `;
      return;
    }

    this.elements.projectsContainer.innerHTML = pageProjects.map((project, index) => 
      this.createProjectCard(project, start + index + 1)
    ).join('');
  },

  /**
   * 创建项目卡片 HTML
   */
  createProjectCard(project, rank) {
    const languageColor = project.languageColor || Utils.getLanguageColor(project.language);
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const rankBadge = rank <= 3 ? `<div class="rank-badge rank-${rank}">${rank}</div>` : `<div class="rank-badge">${rank}</div>`;

    return `
      <div class="project-card ${rankClass}" data-id="${project.id}">
        ${rankBadge}
        <div class="project-header">
          <a href="${project.url}" target="_blank" class="project-name">${project.name}</a>
          <div class="project-stats">
            <span class="stat-item">
              <span class="stat-icon">⭐</span>
              ${Utils.formatNumber(project.stars)}
            </span>
            <span class="stat-item weekly-stars">
              <span class="stat-icon">📈</span>
              +${Utils.formatNumber(project.weeklyStars)}
            </span>
          </div>
        </div>
        <div class="project-description">${project.description}</div>
        <div class="project-footer">
          <div class="project-meta">
            ${project.language ? `
              <span class="language-tag" style="--lang-color: ${languageColor}">
                ${project.language}
              </span>
            ` : ''}
            ${project.category ? `
              <span class="category-badge">${project.category}</span>
            ` : ''}
            <span class="forks-count">
              <span class="stat-icon">🍴</span>
              ${Utils.formatNumber(project.forks)}
            </span>
          </div>
          <button class="chart-btn" data-id="${project.id}" title="查看趋势">
            <span>📊</span>
          </button>
        </div>
      </div>
    `;
  },

  /**
   * 渲染分页
   */
  renderPagination(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / CONFIG.ITEMS_PER_PAGE);

    if (totalPages <= 1) {
      this.elements.pagination.innerHTML = '';
      return;
    }

    let html = '';

    // 上一页
    html += `
      <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
              data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
        ←
      </button>
    `;

    // 页码
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) html += `<span class="page-ellipsis">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
      html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    // 下一页
    html += `
      <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
              data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
        →
      </button>
    `;

    this.elements.pagination.innerHTML = html;
  },

  /**
   * 渲染 Skills 分类标签
   */
  renderSkillsCategories(categories, selectedCategory) {
    const categoryNames = {
      'claude': 'Claude',
      'codex': 'Codex',
      'cursor': 'Cursor',
      'plugin': 'Plugin',
      'memory': 'Memory',
      'knowledge': 'Knowledge',
      'research': 'Research',
      'agent': 'Agent',
      'general': 'General'
    };

    let container = document.getElementById('skillsCategories');
    if (!container) {
      container = document.createElement('div');
      container.id = 'skillsCategories';
      container.className = 'skills-categories';
      document.querySelector('.controls').before(container);
    }

    container.innerHTML = categories.map(cat => `
      <span class="category-tag ${selectedCategory === cat ? 'active' : ''}" data-category="${cat}">
        ${categoryNames[cat] || cat}
      </span>
    `).join('');
  },

  /**
   * 移除 Skills 分类标签
   */
  removeSkillsCategories() {
    const container = document.getElementById('skillsCategories');
    if (container) {
      container.remove();
    }
  },

  /**
   * 显示趋势图表
   */
  showTrendChart(project, chartInstance) {
    this.elements.modalTitle.textContent = `${project.repo} - Star 增长趋势`;
    this.elements.chartModal.classList.add('active');

    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = this.elements.trendChart.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['6天前', '5天前', '4天前', '3天前', '2天前', '昨天', '今天'],
        datasets: [{
          label: '每日新增 Stars',
          data: project.weeklyTrend,
          borderColor: '#3b82f6',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `+${context.parsed.y} stars`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: {
                family: 'Fira Code'
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#64748b'
            }
          }
        }
      }
    });
  },

  /**
   * 关闭模态框
   */
  closeModal() {
    this.elements.chartModal.classList.remove('active');
  }
};

export default UI;
