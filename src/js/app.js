/**
 * 主应用模块
 * 整合所有功能，处理业务逻辑
 */

import CONFIG from './config.js';
import Utils from './utils.js';
import API from './api.js';
import DataProcessor from './dataProcessor.js';
import UI from './ui.js';

// 应用状态
const state = {
  projects: [],
  filteredProjects: [],
  skillsData: [],
  currentPage: 1,
  sortBy: 'weeklyStars',
  sortOrder: 'desc',
  searchQuery: '',
  selectedLanguage: '',
  selectedCategory: '',
  currentTab: 'all',
  isLoading: false,
  chartInstance: null
};

// 主题管理器
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
    const savedTheme = this.getSavedTheme();
    this.applyTheme(savedTheme);
    this.setupEventListeners();
    this.updateActiveState(savedTheme);
  },

  getSavedTheme() {
    try {
      return localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_THEME;
    } catch (e) {
      return this.DEFAULT_THEME;
    }
  },

  saveTheme(theme) {
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.saveTheme(theme);
    this.updateActiveState(theme);
  },

  updateActiveState(currentTheme) {
    document.querySelectorAll('.theme-option').forEach(option => {
      option.classList.toggle('active', option.dataset.theme === currentTheme);
    });
  },

  setupEventListeners() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    const themePanel = document.getElementById('themePanel');
    const closeBtn = document.getElementById('themePanelClose');

    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      themePanel?.classList.toggle('active');
    });

    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      themePanel?.classList.remove('active');
    });

    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        this.applyTheme(theme);
        themePanel?.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!themePanel?.contains(e.target) && !toggleBtn?.contains(e.target)) {
        themePanel?.classList.remove('active');
      }
    });
  }
};

// 事件处理器
const EventHandlers = {
  init() {
    this.bindSearch();
    this.bindFilters();
    this.bindSort();
    this.bindRefresh();
    this.bindTabs();
    this.bindModal();
    this.bindPagination();
    this.bindCategoryFilter();
  },

  bindSearch() {
    UI.elements.searchInput.addEventListener('input', 
      Utils.debounce((e) => {
        state.searchQuery = e.target.value.toLowerCase();
        state.currentPage = 1;
        App.filterAndRender();
      }, 300)
    );
  },

  bindFilters() {
    UI.elements.languageFilter.addEventListener('change', (e) => {
      state.selectedLanguage = e.target.value;
      state.currentPage = 1;
      App.filterAndRender();
    });

    UI.elements.dateRangeFilter.addEventListener('change', (e) => {
      App.loadData(true);
    });
  },

  bindSort() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sortBy = btn.dataset.sort;
        if (state.sortBy === sortBy) {
          state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortBy = sortBy;
          state.sortOrder = 'desc';
        }

        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        App.filterAndRender();
      });
    });
  },

  bindRefresh() {
    UI.elements.refreshBtn.addEventListener('click', () => {
      App.loadData(true);
    });
  },

  bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (state.currentTab === tab) return;

        state.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        App.switchTab(tab);
      });
    });
  },

  bindModal() {
    UI.elements.modalClose.addEventListener('click', () => {
      UI.closeModal();
    });

    UI.elements.chartModal.addEventListener('click', (e) => {
      if (e.target === UI.elements.chartModal) {
        UI.closeModal();
      }
    });

    UI.elements.projectsContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.project-card');
      if (card && !e.target.closest('a')) {
        const projectId = parseInt(card.dataset.id);
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
          state.chartInstance = UI.showTrendChart(project, state.chartInstance);
        }
      }
    });
  },

  bindPagination() {
    UI.elements.pagination.addEventListener('click', (e) => {
      if (e.target.classList.contains('page-btn') && !e.target.disabled) {
        const page = parseInt(e.target.dataset.page);
        App.goToPage(page);
      }
    });
  },

  bindCategoryFilter() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-tag')) {
        const category = e.target.dataset.category;
        state.selectedCategory = state.selectedCategory === category ? '' : category;
        
        document.querySelectorAll('.category-tag').forEach(tag => {
          tag.classList.toggle('active', tag.dataset.category === state.selectedCategory);
        });

        App.filterAndRender();
      }
    });
  }
};

// 主应用
const App = {
  async init() {
    UI.initElements();
    ThemeManager.init();
    EventHandlers.init();
    await this.loadData();
  },

  async loadData(forceRefresh = false) {
    if (state.isLoading) return;
    
    state.isLoading = true;
    UI.elements.refreshBtn.disabled = true;
    UI.elements.refreshBtn.classList.add('spinning');
    
    if (!forceRefresh) {
      UI.showLoading();
    }

    try {
      const result = await API.getTrendingRepos(forceRefresh);
      state.projects = result.data.map((repo, index) => 
        DataProcessor.processRepoData(repo, index)
      );
      state.filteredProjects = [...state.projects];
      
      UI.elements.lastUpdateTime.textContent = Utils.formatDate(new Date());
      
      this.updateUI();
    } catch (error) {
      console.error('Failed to load data:', error);
      UI.showError('无法加载数据，请检查网络连接后重试。');
    } finally {
      state.isLoading = false;
      UI.elements.refreshBtn.disabled = false;
      UI.elements.refreshBtn.classList.remove('spinning');
    }
  },

  updateUI() {
    UI.updateStats(state.projects, state.currentTab === 'skills');
    UI.updateLanguageFilter(state.projects);
    this.filterAndRender();
  },

  filterAndRender() {
    const filters = {
      searchQuery: state.searchQuery,
      language: state.currentTab === 'skills' ? '' : state.selectedLanguage,
      category: state.currentTab === 'skills' ? state.selectedCategory : ''
    };

    let result = DataProcessor.filterProjects(state.projects, filters);
    result = DataProcessor.sortProjects(result, state.sortBy, state.sortOrder);

    state.filteredProjects = result;
    UI.renderProjects(result, state.currentPage);
    UI.renderPagination(result.length, state.currentPage);
  },

  async switchTab(tab) {
    state.currentTab = tab;
    state.currentPage = 1;

    if (tab === 'skills') {
      if (state.skillsData.length === 0) {
        try {
          const result = await API.getSkillsData();
          state.skillsData = DataProcessor.processSkillsData(result.data);
        } catch (error) {
          console.error('加载 Skills 数据失败:', error);
          UI.showError('无法加载 Skills 数据');
          return;
        }
      }
      state.projects = state.skillsData;
      
      const categories = [...new Set(state.skillsData.map(p => p.category).filter(Boolean))];
      UI.renderSkillsCategories(categories, state.selectedCategory);
    } else {
      await this.loadData();
      UI.removeSkillsCategories();
    }

    state.filteredProjects = [...state.projects];
    this.updateUI();
  },

  goToPage(page) {
    state.currentPage = page;
    UI.renderProjects(state.filteredProjects, state.currentPage);
    UI.renderPagination(state.filteredProjects.length, state.currentPage);
    UI.elements.projectsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
