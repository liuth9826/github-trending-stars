/**
 * 数据处理器
 * 负责数据转换和格式化
 */

import Utils from './utils.js';

const DataProcessor = {
  /**
   * 处理仓库数据
   */
  processRepoData(repo, index) {
    const isStaticData = repo.fullName !== undefined;

    return {
      id: repo.id || index + 1,
      name: isStaticData ? repo.fullName : repo.name,
      owner: repo.owner,
      repo: isStaticData ? repo.name : repo.repo,
      description: repo.description || '暂无描述',
      language: repo.language,
      stars: repo.stars || 0,
      weeklyStars: repo.starsToday || repo.weeklyStars || 0,
      forks: repo.forks || 0,
      openIssues: 0,
      url: repo.url,
      languageColor: repo.languageColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      weeklyTrend: repo.weeklyTrend || Utils.generateTrendData(repo.starsToday || 0),
      category: repo.category || null
    };
  },

  /**
   * 处理 Skills 数据
   */
  processSkillsData(data) {
    return data.map((repo, index) => ({
      ...this.processRepoData(repo, index),
      category: repo.category || 'general'
    }));
  },

  /**
   * 排序项目
   */
  sortProjects(projects, sortBy, sortOrder) {
    return [...projects].sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'weeklyStars':
          aVal = a.weeklyStars;
          bVal = b.weeklyStars;
          break;
        case 'totalStars':
          aVal = a.stars;
          bVal = b.stars;
          break;
        case 'name':
          aVal = a.repo.toLowerCase();
          bVal = b.repo.toLowerCase();
          break;
        default:
          aVal = a.weeklyStars;
          bVal = b.weeklyStars;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  },

  /**
   * 筛选项目
   */
  filterProjects(projects, filters) {
    let result = [...projects];

    // 搜索筛选
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        p.owner.toLowerCase().includes(query)
      );
    }

    // 语言筛选
    if (filters.language) {
      result = result.filter(p => p.language === filters.language);
    }

    // 分类筛选（Skills 模式）
    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }

    return result;
  }
};

export default DataProcessor;
