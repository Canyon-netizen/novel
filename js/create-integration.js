// ==================== create.js 集成：灵感快照 + 多格式导出 ====================
// 独立于 create.js 的 IIFE 之外，避免污染大文件
(function () {
  'use strict';

  function getCurrentDraft() {
    // 从 DOM 实时读取 create.js 的表单状态（IIFE 闭包，无法访问内部变量）
    var nameEl = document.getElementById('novelName');
    var directionEl = document.getElementById('direction');
    var audienceEl = document.getElementById('audience');
    var plotEl = document.getElementById('plotStructure');
    var protagonistEl = document.getElementById('protagonistName');

    return {
      novelName: nameEl ? nameEl.value.trim() : '',
      direction: directionEl ? directionEl.value.trim() : '',
      audience: audienceEl ? audienceEl.value : '',
      plotStructure: plotEl ? plotEl.value : '',
      protagonistName: protagonistEl ? protagonistEl.value.trim() : '',
      genre: window.__currentGenre || ''
    };
  }

  // ==================== 灵感快照按钮 ====================
  async function openInspirationPanel() {
    const draft = getCurrentDraft();
    const theme = draft.novelName || '未命名';
    const type = draft.genre || draft.theme || 'fantasy';
    const ctx = draft.direction || draft.synopsis || draft.description || '';

    // 拿 aiSettings — 优先用 NovelCommon 合并默认值,缺省回落到 window/localStorage
    let aiSettings = null;
    if (typeof NovelCommon !== 'undefined' && NovelCommon.loadAISettings) {
      aiSettings = {};
      NovelCommon.loadAISettings(aiSettings);
    } else if (typeof window.aiSettings === 'object' && window.aiSettings) {
      aiSettings = Object.assign({}, window.aiSettings);
    } else {
      try {
        aiSettings = Object.assign({},
          { provider: 'anthropic', temperature: 0.7, maxTokens: 2048 },
          JSON.parse(localStorage.getItem('moyun_ai_settings') || '{}')
        );
      } catch (e) {}
    }
    if (!aiSettings || !aiSettings.apiKey || !aiSettings.apiKey.trim()) {
      const html = '<div class="insp-error">' +
        '<p><strong>⚠️ 未配置 API Key</strong></p>' +
        '<p>请先在「AI 设置」中填写 API Key 并保存。</p>' +
        '<p style="color:#7f8c8d;font-size:0.85rem;">（设置入口：编辑器或主页右上角齿轮图标）</p>' +
        '</div>';
      showModal('灵感快照', html);
      return;
    }
    if (!aiSettings.baseUrl || !aiSettings.baseUrl.trim()) {
      const html = '<div class="insp-error">' +
        '<p><strong>⚠️ 未配置 Base URL</strong></p>' +
        '<p>请在「AI 设置」中填写 API Base URL（例如 https://api.minimaxi.com）并保存。</p>' +
        '</div>';
      showModal('灵感快照', html);
      return;
    }

    const themePrompt = '你是一位专业的小说创作助手。';
    const ins = NovelInspiration.create({
      callAI: NovelLLMClient.callAI,
      aiSettings: aiSettings,
      themePrompt: themePrompt,
      type: 'next-scene'
    });

    // 渲染 modal
    showModal('灵感快照', '<div id="inspirationContent">正在生成 5 个不同方向...</div>');

    let result;
    try {
      result = await ins.generate({ context: ctx, theme: theme });
    } catch (e) {
      result = { ok: false, error: 'AI 调用失败: ' + (e.message || e), options: [], raw: '' };
    }
    const container = document.getElementById('inspirationContent');
    if (!container) return;

    if (!result.ok || !result.options || result.options.length === 0) {
      const safeRaw = String(result.raw || '').replace(/</g, '&lt;').slice(0, 600);
      container.innerHTML = '<div class="insp-error">' +
        '<p><strong>生成失败</strong></p>' +
        '<p style="color:#e74c3c;">' + (result.error || 'AI 未返回有效结果') + '</p>' +
        '<details style="margin-top:0.5rem;"><summary style="cursor:pointer;color:#7f8c8d;">原始输出（如果有）</summary>' +
        '<pre style="max-height:200px;overflow:auto;background:#f8f9fa;padding:0.5rem;border-radius:4px;font-size:0.8rem;">' + safeRaw + '</pre></details>' +
        '<button id="retryInspiration" style="margin-top:0.8rem;padding:0.4rem 1rem;background:#3498db;color:#fff;border:none;border-radius:4px;cursor:pointer;">重试</button>' +
        '</div>';
      const retry = document.getElementById('retryInspiration');
      if (retry) retry.addEventListener('click', () => { closeModal(); openInspirationPanel(); });
      return;
    }

    let html = '<div style="display:grid;gap:0.5rem;">';
    result.options.forEach(function (opt, i) {
      html += '<div class="inspiration-option" data-index="' + i + '" style="border:1px solid #bdc3c7;border-radius:6px;padding:0.75rem;cursor:pointer;background:#fff;">';
      html += '<strong>' + (i + 1) + '. ' + opt.title + '</strong>';
      html += '<p style="margin:0.5rem 0;color:#34495e;">' + opt.content + '</p>';
      html += '<button class="apply-inspiration" data-index="' + i + '" style="padding:0.25rem 0.75rem;background:#3498db;color:#fff;border:none;border-radius:4px;cursor:pointer;">使用这个方向</button>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    // 绑定"使用"按钮
    container.querySelectorAll('.apply-inspiration').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        var opt = result.options[idx];
        applyInspiration(opt);
        closeModal();
      });
    });
  }

  function applyInspiration(opt) {
    // 把选中的灵感填到 create.js 的 form 字段
    var directionEl = document.querySelector('textarea[name="direction"], #direction, [data-field="direction"]');
    var synopsisEl = document.querySelector('textarea[name="synopsis"], #synopsis, [data-field="synopsis"]');
    var descEl = document.querySelector('textarea[name="description"], #description, [data-field="description"]');

    var target = directionEl || synopsisEl || descEl;
    if (!target) {
      alert('应用失败：未找到方向字段');
      return;
    }

    target.value = (target.value || '') + (target.value ? '\n\n' : '') + '【AI 灵感】' + opt.title + '：' + opt.content;
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ==================== 多格式导出按钮 ====================
  function openExportPanel() {
    var draft = getCurrentDraft();
    if (!draft || !draft.novelName) {
      alert('请先填写小说名');
      return;
    }
    showModal('导出项目', '<div style="display:grid;gap:0.5rem;">' +
      '<button data-fmt="markdown" class="export-btn">📝 Markdown</button>' +
      '<button data-fmt="html" class="export-btn">🌐 HTML（可打印 PDF）</button>' +
      '<button data-fmt="text" class="export-btn">📄 纯文本</button>' +
      '<button data-fmt="json" class="export-btn">💾 JSON 备份</button>' +
      '<button data-fmt="pdf" class="export-btn">🖨️ PDF（打印对话框）</button>' +
      '</div>');
    document.querySelectorAll('.export-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fmt = btn.getAttribute('data-fmt');
        NovelExporter.exportAs(draft, fmt);
      });
    });
  }

  // ==================== Modal helper ====================
  function showModal(title, bodyHtml) {
    var existing = document.getElementById('createIntegrationModal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'createIntegrationModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    modal.innerHTML = '<div style="background:#fff;border-radius:8px;padding:1.5rem;max-width:640px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
      '<h3 style="margin:0;">' + title + '</h3>' +
      '<button id="closeIntegrationModal" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>' +
      '</div>' +
      '<div>' + bodyHtml + '</div>' +
      '</div>';
    document.body.appendChild(modal);
    document.getElementById('closeIntegrationModal').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
  }
  function closeModal() {
    var m = document.getElementById('createIntegrationModal');
    if (m) m.remove();
  }

  // ==================== 工具栏按钮注入 ====================
  function injectToolbarButtons() {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      // 找 create.html 实际的工具栏容器（create.html 用 .template-toolbar，不是 .toolbar/.actions）
      var toolbar = document.querySelector('.template-toolbar, [data-toolbar="create"], .toolbar, .actions');
      if (!toolbar) {
        if (tries > 30) clearInterval(timer);
        return;
      }
      clearInterval(timer);

      // 避免重复注入
      if (document.getElementById('inspirationBtn')) return;

      var insBtn = document.createElement('button');
      insBtn.type = 'button';
      insBtn.className = 'toolbar-btn';
      insBtn.id = 'inspirationBtn';
      insBtn.textContent = '💡 灵感快照';
      insBtn.title = 'AI 生成 5 个剧情方向，选 1 个填入';
      insBtn.style.cssText = 'margin-left:0.5rem;';
      insBtn.addEventListener('click', openInspirationPanel);

      var exportBtn = document.createElement('button');
      exportBtn.type = 'button';
      exportBtn.className = 'toolbar-btn';
      exportBtn.id = 'exportProjectBtn';
      exportBtn.textContent = '📤 导出';
      exportBtn.title = '导出当前草稿为多种格式';
      exportBtn.style.cssText = 'margin-left:0.5rem;';
      exportBtn.addEventListener('click', openExportPanel);

      toolbar.appendChild(insBtn);
      toolbar.appendChild(exportBtn);
    }, 500);
  }

  // ==================== 启动 ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToolbarButtons);
  } else {
    injectToolbarButtons();
  }
})();
