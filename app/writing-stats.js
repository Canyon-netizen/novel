// ==================== Novel Writing Stats Module ====================
// 字数 / 阅读时间 / 每日目标 / 写作连续打卡
// 4 个 view 共用，UMD 模式，暴露在 root.NovelStats
//
// 用法：
//   const tracker = NovelStats.create({
//     dailyGoal: 3000,
//     onUpdate: (stats) => updateUI(stats)
//   });
//   tracker.addWords(delta);  // 用户写了 delta 个字
//   tracker.getStats();       // { todayWords, totalWords, streak, ... }

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NovelStats = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'novel:stats';
  const DAILY_KEY_PREFIX = 'novel:stats:daily:';

  // ==================== 字数统计 ====================
  function countWords(text) {
    if (!text) return 0;
    const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const english = (text.match(/[a-zA-Z]+/g) || []).length;
    return chinese + english;
  }

  // ==================== 阅读时间估算 ====================
  // 中文 300 字/分钟，英文 200 词/分钟
  function estimateReadingTime(wordCount) {
    const minutes = wordCount / 280; // 取中英文平均值
    if (minutes < 1) {
      return Math.round(minutes * 60) + ' 秒';
    }
    if (minutes < 60) {
      return Math.round(minutes) + ' 分钟';
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours + ' 小时 ' + mins + ' 分钟';
  }

  // ==================== 日期工具 ====================
  function todayKey() {
    const d = new Date();
    return d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
  }

  function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
  }

  function loadDay(key) {
    try {
      const raw = localStorage.getItem(DAILY_KEY_PREFIX + key);
      return raw ? JSON.parse(raw) : { words: 0, sessions: 0 };
    } catch (e) {
      return { words: 0, sessions: 0 };
    }
  }

  function saveDay(key, data) {
    try {
      localStorage.setItem(DAILY_KEY_PREFIX + key, JSON.stringify(data));
    } catch (e) {
      // 静默
    }
  }

  // ==================== 连续打卡 ====================
  // 今天的字 > 0 算"今天打卡"
  // streak = 连续 N 天（包括今天）都写了字
  function calcStreak(todayWords) {
    if (todayWords === 0) return 0;
    let streak = 1; // 今天
    let d = new Date();
    while (true) {
      d.setDate(d.getDate() - 1);
      const k = d.getFullYear() +
        String(d.getMonth() + 1).padStart(2, '0') +
        String(d.getDate()).padStart(2, '0');
      const day = loadDay(k);
      if (day.words > 0) {
        streak++;
      } else {
        break;
      }
      // 安全：限制最大回溯 365 天
      if (streak > 365) break;
    }
    return streak;
  }

  // ==================== 加载 / 保存全局统计 ====================
  function loadTotal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { totalWords: 0, totalSessions: 0, lastSessionAt: null };
      return JSON.parse(raw);
    } catch (e) {
      return { totalWords: 0, totalSessions: 0, lastSessionAt: null };
    }
  }

  function saveTotal(stats) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      // 静默
    }
  }

  // ==================== Tracker ====================
  function create(options) {
    const opts = options || {};
    const dailyGoal = opts.dailyGoal || 3000;
    const onUpdate = opts.onUpdate || function () {};

    const total = loadTotal();
    let currentSessionStart = null;

    function getStats() {
      const tk = todayKey();
      const today = loadDay(tk);
      const streak = calcStreak(today.words);
      return {
        todayWords: today.words,
        todaySessions: today.sessions,
        totalWords: total.totalWords,
        totalSessions: total.totalSessions,
        streak: streak,
        lastSessionAt: total.lastSessionAt,
        dailyGoal: dailyGoal,
        goalProgress: Math.min(100, Math.round((today.words / dailyGoal) * 100))
      };
    }

    function addWords(delta) {
      if (!delta || delta <= 0) return getStats();
      const tk = todayKey();
      const today = loadDay(tk);
      today.words += delta;
      saveDay(tk, today);
      total.totalWords += delta;
      total.lastSessionAt = Date.now();
      saveTotal(total);
      const stats = getStats();
      onUpdate(stats);
      return stats;
    }

    function addSession() {
      const tk = todayKey();
      const today = loadDay(tk);
      today.sessions += 1;
      saveDay(tk, today);
      total.totalSessions += 1;
      currentSessionStart = Date.now();
      saveTotal(total);
      const stats = getStats();
      onUpdate(stats);
      return stats;
    }

    function setDailyGoal(goal) {
      // 注意：dailyGoal 是只读配置项，setDailyGoal 不会持久化（每次启动重置）
      // 如需持久化，可调用 saveConfig/getConfig
      const stats = getStats();
      stats.dailyGoal = goal;
      onUpdate(stats);
      return stats;
    }

    // 触发一次初始 update
    setTimeout(function () {
      onUpdate(getStats());
    }, 0);

    return {
      addWords: addWords,
      addSession: addSession,
      getStats: getStats,
      setDailyGoal: setDailyGoal
    };
  }

  // ==================== 格式化 ====================
  function formatWords(n) {
    if (n === null || n === undefined) return '0';
    if (n < 1000) return String(n);
    if (n < 10000) return (n / 1000).toFixed(1) + 'k';
    return Math.round(n / 1000) + 'k';
  }

  function formatProgressBar(percent, width) {
    width = width || 20;
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ' ' + percent + '%';
  }

  return {
    create: create,
    // 工具
    countWords: countWords,
    estimateReadingTime: estimateReadingTime,
    formatWords: formatWords,
    formatProgressBar: formatProgressBar,
    loadDay: loadDay,
    calcStreak: calcStreak
  };
});
