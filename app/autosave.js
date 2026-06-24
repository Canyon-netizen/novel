// ==================== Novel Autosave Module ====================
// 自动保存 + 草稿恢复。
// 4 个 view 共用，UMD 模式，暴露在 root.NovelAutosave
// 用法：
//   NovelAutosave.watch(textarea, {
//     key: 'editor:draft:project-1-chapter-2',
//     debounceMs: 2000,
//     onSave: (content) => updateWordCount(),
//     onStatusChange: (status) => showIndicator(status)
//   });

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NovelAutosave = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ==================== Debounce ====================
  function debounce(fn, ms) {
    let timer = null;
    const debounced = function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
        timer = null;
      }, ms);
    };
    debounced.flush = function () {
      if (timer !== null) {
        clearTimeout(timer);
        fn.apply();
        timer = null;
      }
    };
    debounced.cancel = function () {
      clearTimeout(timer);
      timer = null;
    };
    return debounced;
  }

  // ==================== Draft Storage ====================
  // 用 localStorage 存草稿，前缀 'novel:draft:'
  // 结构：{ content, savedAt, wordCount }
  const PREFIX = 'novel:draft:';
  const META_KEY = 'novel:drafts:meta';

  function saveDraft(key, content, wordCount) {
    try {
      const payload = {
        content: content,
        savedAt: Date.now(),
        wordCount: wordCount || countWords(content)
      };
      localStorage.setItem(PREFIX + key, JSON.stringify(payload));
      // 更新 meta（用于显示"未保存的草稿"列表）
      updateMeta(key, payload.savedAt);
      return true;
    } catch (e) {
      // localStorage 满了或被禁
      console.error('[NovelAutosave] saveDraft failed:', e);
      return false;
    }
  }

  function loadDraft(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearDraft(key) {
    localStorage.removeItem(PREFIX + key);
    removeFromMeta(key);
  }

  function listDrafts() {
    try {
      const meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
      // 返回按时间倒序的列表
      return Object.keys(meta)
        .map(function (k) {
          return { key: k, savedAt: meta[k] };
        })
        .sort(function (a, b) {
          return b.savedAt - a.savedAt;
        });
    } catch (e) {
      return [];
    }
  }

  function updateMeta(key, savedAt) {
    try {
      const meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
      meta[key] = savedAt;
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
      // 静默失败
    }
  }

  function removeFromMeta(key) {
    try {
      const meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
      delete meta[key];
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
      // 静默失败
    }
  }

  // ==================== Word Count ====================
  function countWords(text) {
    if (!text) return 0;
    // 中英文混合字数统计：中文每字 1，英文每词 1
    // \u4e00-\u9fff 是 CJK 统一汉字基本区
    const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const english = (text.match(/[a-zA-Z]+/g) || []).length;
    return chinese + english;
  }

  // ==================== Watcher ====================
  // 监听一个 textarea/input 的 input 事件，自动保存
  // status: 'idle' | 'saving' | 'saved' | 'error' | 'dirty'
  function watch(element, options) {
    if (!element) return null;
    const opts = options || {};
    const key = opts.key;
    if (!key) {
      console.warn('[NovelAutosave] watch: key is required');
      return null;
    }
    const debounceMs = opts.debounceMs || 2000;
    const onSave = opts.onSave || function () {};
    const onStatusChange = opts.onStatusChange || function () {};

    let lastSavedContent = element.value || '';
    let status = 'idle';
    let listeners = [];
    let enabled = true;

    function setStatus(s) {
      if (!enabled) return;
      if (status === s) return;
      status = s;
      onStatusChange(s);
      // 通知其他 watch 的 instance（同一个 key）
      listeners.forEach(function (fn) {
        try { fn(s); } catch (e) { /* ignore */ }
      });
    }

    const save = debounce(function () {
      const current = element.value;
      if (current === lastSavedContent) {
        setStatus('saved');
        return;
      }
      setStatus('saving');
      const ok = saveDraft(key, current);
      if (ok) {
        lastSavedContent = current;
        setStatus('saved');
        try { onSave(current); } catch (e) { /* ignore */ }
      } else {
        setStatus('error');
      }
    }, debounceMs);

    const onInput = function () {
      if (element.value === lastSavedContent) {
        setStatus('saved');
      } else {
        setStatus('dirty');
        save();
      }
    };

    element.addEventListener('input', onInput);

    // 暴露控制器
    const controller = {
      flush: function () { save.flush(); },
      cancel: function () { save.cancel(); setStatus('idle'); },
      getStatus: function () { return status; },
      getDraft: function () { return loadDraft(key); },
      clearDraft: function () {
        clearDraft(key);
        lastSavedContent = element.value || '';
        setStatus('idle');
      },
      destroy: function () {
        element.removeEventListener('input', onInput);
        save.cancel();
      },
      onStatusChange: function (fn) {
        listeners.push(fn);
      }
    };
    return controller;
  }

  // ==================== 格式化时间 ====================
  function formatRelativeTime(ts) {
    if (!ts) return '';
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    return Math.floor(diff / 86400000) + ' 天前';
  }

  return {
    // 核心
    watch: watch,
    // 草稿管理
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
    listDrafts: listDrafts,
    // 工具
    countWords: countWords,
    debounce: debounce,
    formatRelativeTime: formatRelativeTime
  };
});
