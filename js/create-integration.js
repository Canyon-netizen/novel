// ==================== create.js 集成：灵感快照 + 多格式导出 ====================
// 独立于 create.js 的 IIFE 之外，避免污染大文件
(function () {
  'use strict';

  function getCurrentDraft() {
    // 读 IIFE 写出去的 draft（如果存在）；否则从 localStorage 取
    if (typeof window.__createDraft === 'function') {
      return window.__createDraft();
    }
    try {
      return JSON.parse(localStorage.getItem('moyun_create_draft') || '{}');
    } catch (e) {
      return {};
    }
  }

  // ==================== 灵感快照按钮 ====================
  async function openInspirationPanel() {
    const draft = getCurrentDraft();
    const theme = draft.novelName || '未命名';
    const type = draft.genre || draft.theme || 'fantasy';
    const ctx = draft.direction || draft.synopsis || draft.description || '';

    // 拿 aiSettings
    let aiSettings = null;
    if (typeof window.aiSettings === 'object' && window.aiSettings) {
      aiSettings = window.aiSettings;
    } else {
      try {
        aiSettings = JSON.parse(localStorage.getItem('moyun_ai_settings') || '{}');
      } catch (e) {}
    }
    if (!aiSettings || !aiSettings.apiKey) {
      alert('请先在设置中配置 AI（API Key 不能为空）');
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

    const result = await ins.generate({ context: ctx, theme: theme });
    const container = document.getElementById('inspirationContent');
    if (!container) return;

    if (!result.ok || !result.options || result.options.length === 0) {
      container.innerHTML = '<p style="color:#e74c3c;">生成失败: ' + (result.error || 'AI 未返回有效结果') + '</p>' +
        '<p style="color:#7f8c8d;">原始输出（如果有）：</p><pre style="max-height:200px;overflow:auto;background:#f8f9fa;padding:0.5rem;">' +
        (result.raw || '').replace(/</g, '&lt;') + '</pre>';
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

    if (directionEl) {
      directionEl.value = (directionEl.value || '') + (directionEl.value ? '\n\n' : '') + '【AI 灵感】' + opt.title + '：' + opt.content;
      directionEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (synopsisEl) {
      synopsisEl.value = opt.content;
      synopsisEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (descEl) {
      descEl.value = opt.content;
      descEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // 没找到字段，存到 localStorage 草稿
      try {
        var draft = JSON.parse(localStorage.getItem('moyun_create_draft') || '{}');
        draft.direction = (draft.direction || '') + (draft.direction ? '\n\n' : '') + '【AI 灵感】' + opt.title + '：' + opt.content;
        localStorage.setItem('moyun_create_draft', JSON.stringify(draft));
        alert('未找到方向字段，已存到 localStorage 草稿');
      } catch (e) {
        alert('应用失败: 未找到方向字段');
      }
    }
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
      // 找 create.js 页面工具栏
      var toolbar = document.querySelector('.toolbar, [data-toolbar="create"], .actions');
      if (!toolbar) {
        if (tries > 30) clearInterval(timer);
        return;
      }
      clearInterval(timer);

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
