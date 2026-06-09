// ==================== Novel Exporter Module ====================
// 导出项目为多种格式：Markdown / 纯文本 / HTML / JSON
// PDF 通过 window.print() 走浏览器原生（不引入大依赖）
// 4 个 view 共用，UMD 模式，暴露在 root.NovelExporter

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NovelExporter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ==================== 内容生成 ====================
  function buildMarkdown(project) {
    if (!project) return '';
    let md = '# ' + (project.title || '未命名') + '\n\n';
    if (project.description) {
      md += project.description + '\n\n';
    }
    md += '---\n\n';

    if (project.characters && project.characters.length > 0) {
      md += '## 人物\n\n';
      project.characters.forEach(function (c) {
        md += '### ' + (c.name || '未命名') + '\n';
        if (c.role) md += '*身份：' + c.role + '*\n\n';
        if (c.description) md += c.description + '\n\n';
      });
      md += '---\n\n';
    }

    md += '## 章节内容\n\n';
    if (project.chapters && project.chapters.length > 0) {
      project.chapters.forEach(function (chapter, i) {
        md += '### 第 ' + (i + 1) + ' 章 · ' + (chapter.title || '未命名') + '\n\n';
        if (chapter.summary) {
          md += '> **摘要**：' + chapter.summary + '\n\n';
        }
        md += (chapter.content || '（待撰写）') + '\n\n---\n\n';
      });
    } else {
      md += '*暂无章节*\n';
    }
    return md;
  }

  function buildPlainText(project) {
    if (!project) return '';
    const lines = [];
    lines.push((project.title || '未命名'));
    lines.push('='.repeat((project.title || '未命名').length));
    lines.push('');
    if (project.description) {
      lines.push(project.description);
      lines.push('');
    }
    lines.push('-'.repeat(40));
    lines.push('');
    if (project.chapters && project.chapters.length > 0) {
      project.chapters.forEach(function (chapter, i) {
        lines.push('第 ' + (i + 1) + ' 章 · ' + (chapter.title || '未命名'));
        lines.push('');
        if (chapter.summary) {
          lines.push('[摘要] ' + chapter.summary);
          lines.push('');
        }
        lines.push(chapter.content || '（待撰写）');
        lines.push('');
        lines.push('-'.repeat(40));
        lines.push('');
      });
    }
    return lines.join('\n');
  }

  function buildHTML(project) {
    if (!project) return '<!DOCTYPE html><html><body><p>空项目</p></body></html>';
    const esc = function (s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    let html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n';
    html += '<meta charset="UTF-8">\n';
    html += '<title>' + esc(project.title) + '</title>\n';
    html += '<style>\n';
    html += 'body { font-family: "PingFang SC", "Microsoft YaHei", serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.8; color: #2c3e50; }\n';
    html += 'h1 { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 1rem; }\n';
    html += 'h2 { margin-top: 2rem; border-left: 4px solid #3498db; padding-left: 1rem; }\n';
    html += 'h3 { margin-top: 1.5rem; color: #34495e; }\n';
    html += 'blockquote { border-left: 4px solid #95a5a6; padding-left: 1rem; color: #7f8c8d; font-style: italic; }\n';
    html += '.description { color: #7f8c8d; font-style: italic; text-align: center; margin: 1rem 0 2rem; }\n';
    html += '.character { background: #f8f9fa; padding: 1rem; border-radius: 4px; margin: 1rem 0; }\n';
    html += '.chapter { margin: 2rem 0; }\n';
    html += '.chapter-content { white-space: pre-wrap; text-indent: 2em; }\n';
    html += 'hr { border: none; border-top: 1px dashed #bdc3c7; margin: 2rem 0; }\n';
    html += '@media print { body { max-width: none; } }\n';
    html += '</style>\n</head>\n<body>\n';
    html += '<h1>' + esc(project.title) + '</h1>\n';
    if (project.description) {
      html += '<p class="description">' + esc(project.description) + '</p>\n';
    }
    if (project.characters && project.characters.length > 0) {
      html += '<h2>人物</h2>\n';
      project.characters.forEach(function (c) {
        html += '<div class="character">\n';
        html += '<h3>' + esc(c.name) + (c.role ? ' <small>(' + esc(c.role) + ')</small>' : '') + '</h3>\n';
        if (c.description) html += '<p>' + esc(c.description).replace(/\n/g, '<br>') + '</p>\n';
        html += '</div>\n';
      });
    }
    html += '<h2>章节</h2>\n';
    if (project.chapters && project.chapters.length > 0) {
      project.chapters.forEach(function (chapter, i) {
        html += '<div class="chapter">\n';
        html += '<h3>第 ' + (i + 1) + ' 章 · ' + esc(chapter.title) + '</h3>\n';
        if (chapter.summary) {
          html += '<blockquote><strong>摘要：</strong>' + esc(chapter.summary) + '</blockquote>\n';
        }
        html += '<div class="chapter-content">' + esc(chapter.content || '（待撰写）') + '</div>\n';
        html += '</div>\n';
      });
    } else {
      html += '<p><em>暂无章节</em></p>\n';
    }
    html += '</body>\n</html>';
    return html;
  }

  function buildJSON(project) {
    return JSON.stringify(project, null, 2);
  }

  // ==================== 下载 ====================
  function download(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
  }

  // ==================== 公开 API ====================
  function exportAs(project, format) {
    if (!project) {
      return { ok: false, error: '项目为空' };
    }
    const title = (project.title || '未命名').replace(/[\\/:*?"<>|]/g, '_');
    switch (format) {
      case 'markdown':
      case 'md':
        download(title + '.md', buildMarkdown(project), 'text/markdown');
        return { ok: true, format: 'markdown' };
      case 'text':
      case 'txt':
        download(title + '.txt', buildPlainText(project), 'text/plain');
        return { ok: true, format: 'text' };
      case 'html':
        download(title + '.html', buildHTML(project), 'text/html');
        return { ok: true, format: 'html' };
      case 'json':
        download(title + '.json', buildJSON(project), 'application/json');
        return { ok: true, format: 'json' };
      case 'pdf':
        exportAsPDF(project, buildHTML(project));
        return { ok: true, format: 'pdf' };
      default:
        return { ok: false, error: '不支持的格式: ' + format };
    }
  }

  // PDF：打开新窗口、注入 HTML、调用 window.print()
  // 用户在打印对话框选"另存为 PDF"
  function exportAsPDF(project, htmlContent) {
    const w = window.open('', '_blank');
    if (!w) {
      alert('请允许浏览器弹出窗口以导出 PDF');
      return;
    }
    w.document.open();
    w.document.write(htmlContent);
    w.document.close();
    w.addEventListener('load', function () {
      setTimeout(function () {
        w.focus();
        w.print();
      }, 250);
    });
    // 如果 load 事件已触发
    if (w.document.readyState === 'complete') {
      setTimeout(function () {
        w.focus();
        w.print();
      }, 250);
    }
  }

  // ==================== 批量 ====================
  function exportProject(project, formats) {
    const results = [];
    formats.forEach(function (fmt) {
      const r = exportAs(project, fmt);
      results.push(r);
    });
    return results;
  }

  return {
    exportAs: exportAs,
    exportProject: exportProject,
    buildMarkdown: buildMarkdown,
    buildPlainText: buildPlainText,
    buildHTML: buildHTML,
    buildJSON: buildJSON
  };
});
