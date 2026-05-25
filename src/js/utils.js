/**
 * 工具函数模块
 */

const Utils = {
  /**
   * 格式化数字
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * 获取语言颜色
   */
  getLanguageColor(language) {
    const colors = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Python': '#3572A5',
      'Java': '#b07219',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'C++': '#f34b7d',
      'C': '#555555',
      'C#': '#178600',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Swift': '#ffac45',
      'Kotlin': '#A97BFF',
      'Vue': '#41b883',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Shell': '#89e051'
    };
    return colors[language] || '#8b8b9e';
  },

  /**
   * 防抖函数
   */
  debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * 生成趋势数据
   */
  generateTrendData(weeklyStars) {
    const dailyAvg = Math.round(weeklyStars / 7);
    return Array.from({ length: 7 }, (_, i) => {
      const variation = 0.5 + Math.random();
      return Math.max(0, Math.round(dailyAvg * variation));
    });
  },

  /**
   * 本地存储
   */
  storage: {
    get(key) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Storage error:', e);
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Storage error:', e);
      }
    }
  }
};

export default Utils;
