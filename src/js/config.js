/**
 * 全局配置
 */
const CONFIG = {
  ITEMS_PER_PAGE: 20,
  CACHE_KEY: 'github_trending_data',
  CACHE_DURATION: 60 * 60 * 1000, // 1小时
  GITHUB_API_BASE: 'https://api.github.com',
  LANGUAGES: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go',
    'Rust', 'C++', 'C', 'C#', 'PHP', 'Ruby', 'Swift',
    'Kotlin', 'Scala', 'R', 'Vue', 'HTML', 'CSS', 'Shell'
  ],
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

export default CONFIG;
