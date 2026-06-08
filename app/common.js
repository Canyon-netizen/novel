// ==================== Novel Common Module ====================
// 墨韵AI 公共模块：auth / storage / settings / theme / utils
// 4 个 view（dashboard / create / editor / chat）共用
// UMD 模式：暴露在 root.NovelCommon

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NovelCommon = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ==================== Auth ====================
  function getAuthUser() {
    const auth = parseJson(sessionStorage.getItem('moyun_auth_user'));
    return auth && auth.name ? auth : null;
  }

  function requireAuth() {
    const user = getAuthUser();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }
    localStorage.setItem('moyun_user_name', user.name);
    return true;
  }

  function handleLogout() {
    sessionStorage.removeItem('moyun_auth_user');
    localStorage.removeItem('moyun_auth_user');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }

  function setupAuthDisplay() {
    const name = localStorage.getItem('moyun_user_name') || '用户';
    const userNameEl = document.querySelector('.user-name');
    const avatarEl = document.querySelector('.user-avatar');
    if (userNameEl) userNameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = (name.charAt(0) || 'U').toUpperCase();
  }

  function setupAuthActions() {
    const userInfo = document.querySelector('.user-info');
    if (!userInfo) return;

    userInfo.setAttribute('role', 'button');
    userInfo.setAttribute('tabindex', '0');
    userInfo.title = '用户菜单';

    let menu = userInfo.querySelector('.user-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'user-menu';
      menu.hidden = true;

      const user = document.createElement('div');
      user.className = 'user-menu-user';
      user.textContent = localStorage.getItem('moyun_user_name') || '当前用户';

      const logoutBtn = document.createElement('button');
      logoutBtn.type = 'button';
      logoutBtn.textContent = '退出登录';
      logoutBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        handleLogout();
      });

      menu.append(user, logoutBtn);
      userInfo.appendChild(menu);
    } else {
      menu.hidden = true;
    }

    const toggle = function (event) {
      event.stopPropagation();
      const open = !userInfo.classList.contains('open');
      userInfo.classList.toggle('open', open);
      menu.hidden = !open;
    };
    userInfo.addEventListener('click', toggle);
    userInfo.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle(event);
      } else if (event.key === 'Escape') {
        userInfo.classList.remove('open');
        menu.hidden = true;
      }
    });
    document.addEventListener('click', function () {
      userInfo.classList.remove('open');
      menu.hidden = true;
    });
  }

  // ==================== AI Settings ====================
  const DEFAULT_AI_SETTINGS = {
    provider: 'anthropic',
    apiKey: '',
    baseUrl: '',
    model: '',
    temperature: 0.7,
    maxTokens: 2048
  };

  function loadAISettings(target) {
    const saved = localStorage.getItem('moyun_ai_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(target, DEFAULT_AI_SETTINGS, parsed);
      } catch (e) {
        Object.assign(target, DEFAULT_AI_SETTINGS);
      }
    } else {
      Object.assign(target, DEFAULT_AI_SETTINGS);
    }
  }

  function saveAISettings(settings) {
    localStorage.setItem('moyun_ai_settings', JSON.stringify(settings));
  }

  // ==================== Storage ====================
  function loadProjects() {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return [];
    try { return JSON.parse(saved); } catch (e) { return []; }
  }

  function saveProjects(projects) {
    localStorage.setItem('moyun_projects', JSON.stringify(projects));
  }

  function loadGistSettings() {
    const saved = localStorage.getItem('moyun_gist_settings');
    if (!saved) return { token: '', gistId: '', lastSync: null };
    try { return JSON.parse(saved); } catch (e) { return { token: '', gistId: '', lastSync: null }; }
  }

  function saveGistSettings(settings) {
    localStorage.setItem('moyun_gist_settings', JSON.stringify(settings));
  }

  // ==================== Theme ====================
  function loadTheme() {
    const saved = localStorage.getItem('moyun_theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      const sel = document.querySelector('.theme-select');
      if (sel) sel.value = saved;
    }
  }

  function toggleTheme(theme) {
    if (!theme) {
      const sel = document.querySelector('.theme-select');
      theme = sel ? sel.value : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('moyun_theme', theme);
  }

  // ==================== Utils ====================
  function parseJson(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function getTypeName(type) {
    const types = {
      romance: '言情',
      fantasy: '玄幻',
      mystery: '悬疑',
      scifi: '科幻',
      wuxia: '武侠',
      urban: '都市',
      historical: '历史',
      horror: '恐怖'
    };
    return types[type] || '其他';
  }

  function getProjectWordCount(project) {
    if (!project || !project.chapters) return 0;
    return project.chapters.reduce(function (sum, ch) {
      return sum + ((ch && ch.content) ? ch.content.length : 0);
    }, 0);
  }

  // ==================== Theme Prompts ====================
  const THEME_PROMPTS = {
    romance: '你是一位专业的言情小说写作助手，擅长细腻的情感描写和人物心理刻画。请用中文回答。',
    fantasy: '你是一位专业的玄幻小说写作助手，擅长构建奇幻世界观和力量体系。请用中文回答。',
    mystery: '你是一位专业的悬疑小说写作助手，擅长铺设悬念和设计推理逻辑。请用中文回答。',
    scifi: '你是一位专业的科幻小说写作助手，擅长设计科技设定和未来场景。请用中文回答。',
    wuxia: '你是一位专业的武侠小说写作助手，擅长描绘江湖规矩和武功招式。请用中文回答。',
    urban: '你是一位专业的都市小说写作助手，擅长描绘现代都市生活。请用中文回答。',
    historical: '你是一位专业的历史小说写作助手，擅长还原时代背景和人物风貌。请用中文回答。',
    horror: '你是一位专业的恐怖小说写作助手，擅长营造恐怖氛围和心理恐惧。请用中文回答。'
  };

  function getThemePrompt(themeType) {
    return THEME_PROMPTS[themeType] || THEME_PROMPTS.romance;
  }

  return {
    // Auth
    getAuthUser, requireAuth, handleLogout, setupAuthDisplay, setupAuthActions,
    // AI Settings
    loadAISettings, saveAISettings, DEFAULT_AI_SETTINGS,
    // Storage
    loadProjects, saveProjects, loadGistSettings, saveGistSettings,
    // Theme
    loadTheme, toggleTheme,
    // Utils
    parseJson, getTypeName, getProjectWordCount, getThemePrompt, THEME_PROMPTS
  };
});
