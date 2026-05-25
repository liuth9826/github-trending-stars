/**
 * API 服务模块
 * 负责所有数据获取逻辑
 */

import CONFIG from './config.js';

const API = {
  /**
   * 尝试从多个路径获取静态 JSON 数据
   */
  async fetchStaticData(paths) {
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ 成功从静态 JSON 加载数据: ${path}`);
          return result;
        }
      } catch (e) {
        // 继续尝试下一个路径
      }
    }
    return null;
  },

  /**
   * 获取 Trending 数据
   */
  async getTrendingRepos(forceRefresh = false) {
    // 首先尝试从静态 JSON 获取
    const staticData = await this.fetchStaticData(CONFIG.DATA_PATHS.trending);
    if (staticData) {
      return {
        data: staticData.data,
        cached: true,
        stale: false,
        timestamp: staticData.timestamp,
        source: 'static'
      };
    }

    console.log('静态 JSON 不可用，尝试本地服务器...');

    // 回退到本地代理服务器
    const endpoint = forceRefresh ? '/api/refresh' : '/api/trending';
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '未知错误');
    }

    return {
      data: result.data,
      cached: result.cached,
      stale: result.stale,
      timestamp: result.timestamp,
      source: 'server'
    };
  },

  /**
   * 获取 Skills 数据
   */
  async getSkillsData() {
    const staticData = await this.fetchStaticData(CONFIG.DATA_PATHS.skills);
    if (staticData) {
      return {
        data: staticData.data,
        timestamp: staticData.timestamp,
        total: staticData.total
      };
    }
    throw new Error('无法加载 Skills 数据');
  }
};

export default API;
