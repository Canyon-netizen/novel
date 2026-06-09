// ==================== Settings Test Connection ====================
// 在 3 个 view（index/editor/create）的设置弹窗里加"测试连接"按钮
// 用事件委托 + 延迟绑定兼容动态打开的弹窗
// UMD 模式，暴露在 root.NovelSettingsTest
//
// 设置弹窗里需要有：
//   <button type="button" id="testConnectionBtn" class="toolbar-btn">测试连接</button>
//   <span id="testConnectionResult"></span>

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NovelSettingsTest = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // 找"当前 view 的 aiSettings"——优先用 window.aiSettings；不行就从 localStorage 读
  function readCurrentSettings() {
    if (typeof window.aiSettings === 'object' && window.aiSettings) {
      return window.aiSettings;
    }
    try {
      const raw = localStorage.getItem('moyun_ai_settings');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  // 找"当前 view 的 settings DOM 字段"——支持多种 HTML 结构
  function readDOMSettings() {
    const get = function (id) {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };
    return {
      provider: get('apiProvider') || get('provider'),
      apiKey: get('apiKeyInput') || get('apiKey'),
      baseUrl: get('baseUrlInput') || get('baseUrl'),
      model: get('modelInput') || get('model'),
      temperature: parseFloat(get('temperatureInput') || '0.7')
    };
  }

  // 显示结果
  function showResult(statusEl, status, message, detail) {
    if (!statusEl) return;
    const map = {
      idle: { icon: '', cls: '' },
      testing: { icon: '⏳ ', cls: 'test-pending' },
      success: { icon: '✅ ', cls: 'test-success' },
      'local': { icon: '🟢 ', cls: 'test-success' },
      error: { icon: '❌ ', cls: 'test-error' }
    };
    const s = map[status] || map.idle;
    statusEl.className = 'test-connection-status ' + s.cls;
    let html = s.icon + (message || '');
    if (detail && detail.length > 0) {
      html += '<br><small style="color:#7f8c8d;">' + String(detail).replace(/</g, '&lt;').slice(0, 300) + '</small>';
    }
    statusEl.innerHTML = html;
  }

  // 实际触发测试
  async function runTest(btn, statusEl) {
    if (!btn || !statusEl) return;
    if (!window.NovelCommon || !window.NovelCommon.testAISettings) {
      showResult(statusEl, 'error', 'NovelCommon.testAISettings 未加载（请检查 app/common.js 是否引入）', '');
      return;
    }

    // 优先用 DOM 字段（如果弹窗开着），否则用全局 aiSettings
    const fromDOM = readDOMSettings();
    const fromGlobal = readCurrentSettings();
    const settings = {
      provider: fromDOM.provider || fromGlobal.provider,
      apiKey: fromDOM.apiKey || fromGlobal.apiKey,
      baseUrl: fromDOM.baseUrl || fromGlobal.baseUrl,
      model: fromDOM.model || fromGlobal.model,
      temperature: fromDOM.temperature || fromGlobal.temperature || 0.7
    };

    if (!settings.provider) {
      showResult(statusEl, 'error', '未选择 provider', '请先选择 API provider');
      return;
    }

    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = '⏳ 测试中...';

    try {
      const result = await window.NovelCommon.testAISettings(settings, function (progress) {
        // progress: { status, message, ... }
        if (progress && progress.status === 'testing') {
          showResult(statusEl, 'testing', progress.message, '');
        }
      });
      if (result.code === 'local') {
        showResult(statusEl, 'local', result.message, '');
      } else {
        showResult(statusEl, 'success', result.message, '端点: ' + result.endpoint + ' | 模型: ' + result.model);
      }
    } catch (err) {
      const code = err.code || 'unknown';
      const message = err.message || String(err);
      let hint = '';
      // 给用户友好的建议
      if (code === 'missing-key') {
        hint = '请在设置中填写 API Key';
      } else if (code === 'auth') {
        hint = 'API Key 无效或已过期，请在 LLM 服务商后台重新生成';
      } else if (code === 'not-found') {
        hint = '检查 Base URL，例如 Anthropic 通常是 https://api.anthropic.com（不需要 /v1）';
      } else if (code === 'network' || code === 'timeout') {
        hint = '检查网络、API 端点、以及浏览器是否被 CORS 拦截';
      } else if (code === 'rate-limit') {
        hint = '稍后重试，或升级 LLM 服务商套餐';
      } else {
        hint = err.detail || '请检查 API 配置';
      }
      showResult(statusEl, 'error', message, hint);
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }

  // ==================== 事件委托 ====================
  // 设置弹窗是动态打开的，所以绑在 document 上用捕获阶段
  function bindOnce() {
    if (bindOnce._done) return;
    bindOnce._done = true;

    document.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('#testConnectionBtn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      // 找同 modal 里的 status 元素
      const modal = btn.closest('.modal, [class*="modal"], [id*="settings"]');
      const statusEl = (modal && modal.querySelector('#testConnectionResult')) || document.getElementById('testConnectionResult');
      runTest(btn, statusEl);
    }, true);
  }

  // ==================== 自动注入 ====================
  // 找"保存"按钮附近，加测试按钮（如果用户 HTML 里没手动加）
  function tryInjectButton() {
    const saveBtn = document.getElementById('saveSettingsBtn') || document.querySelector('[onclick*="saveSettings"]');
    if (!saveBtn) return false;
    if (document.getElementById('testConnectionBtn')) return true; // 已存在

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'testConnectionBtn';
    btn.className = 'toolbar-btn';
    btn.textContent = '🧪 测试连接';
    btn.title = '用当前配置向 LLM 端点发一个最小请求，验证配置是否正确';
    btn.style.cssText = 'margin-right:0.5rem;';

    const status = document.createElement('span');
    status.id = 'testConnectionResult';
    status.className = 'test-connection-status';
    status.style.cssText = 'margin-left:0.5rem;';

    saveBtn.parentNode.insertBefore(btn, saveBtn);
    saveBtn.parentNode.insertBefore(status, saveBtn.nextSibling);
    return true;
  }

  // 观察 DOM，因为 modal 是动态生成的
  function startObserver() {
    bindOnce();
    // 多次尝试注入（用户可能晚打开设置）
    let tries = 0;
    const interval = setInterval(function () {
      tries++;
      if (tryInjectButton()) {
        // 找到就停止
      }
      if (tries > 40) clearInterval(interval); // 最多尝试 20s
    }, 500);
  }

  // ==================== 启动 ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  return {
    runTest: runTest,
    readDOMSettings: readDOMSettings,
    readCurrentSettings: readCurrentSettings,
    showResult: showResult,
    tryInjectButton: tryInjectButton
  };
});
