// ==================== Novel Inspiration Module ====================
// 灵感快照：让 LLM 一次性生成 5 个不同方向的章节大纲/开头，用户选 1 个
// 4 个 view 共用，UMD 模式，暴露在 root.NovelInspiration
//
// 用法：
//   const ins = NovelInspiration.create({
//     callAI: NovelLLMClient.callAI,
//     aiSettings: aiSettings,
//     themePrompt: '...',
//     type: 'chapter-opener'  // 或 'plot-twist' / 'character-sketch' / 'next-scene'
//   });
//   const results = await ins.generate({ context: '上一章结尾：...' });

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NovelInspiration = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ==================== Prompt 模板 ====================
  const TYPES = {
    'chapter-opener': {
      label: '章节开头',
      systemHint: '你是一位经验丰富的网络小说作家，擅长构思引人入胜的章节开头。',
      template: function (ctx) {
        return [
          '请为以下小说生成 5 个不同风格的章节开头（每个 80-150 字）。',
          '上一章结尾：' + (ctx.context || '（无）'),
          '题材：' + (ctx.theme || '未指定'),
          '主角：' + (ctx.protagonist || '未指定'),
          '',
          '请严格用以下 JSON 格式返回（不要任何额外文字、代码块标记、解释）：',
          '{',
          '  "options": [',
          '    {"title": "开头 1 的简述", "content": "完整的章节开头文字..."},',
          '    {"title": "开头 2 的简述", "content": "完整的章节开头文字..."},',
          '    ... 共 5 个',
          '  ]',
          '}'
        ].join('\n');
      }
    },
    'plot-twist': {
      label: '剧情转折',
      systemHint: '你是一位擅长设计剧情转折的小说家，作品以出人意料的反转著称。',
      template: function (ctx) {
        return [
          '请为以下小说设计 5 个出人意料但合理的剧情转折（每个 50-100 字）。',
          '当前剧情：' + (ctx.context || '（无）'),
          '题材：' + (ctx.theme || '未指定'),
          '',
          '请严格用以下 JSON 格式返回：',
          '{',
          '  "options": [',
          '    {"title": "转折方向", "content": "转折的具体描述..."},',
          '    ... 共 5 个',
          '  ]',
          '}'
        ].join('\n');
      }
    },
    'character-sketch': {
      label: '人物速写',
      systemHint: '你是一位擅长塑造人物的小说家，作品以鲜明的角色著称。',
      template: function (ctx) {
        return [
          '请为以下小说生成 5 个有特色的人物设定（每个 60-120 字）。',
          '故事背景：' + (ctx.context || '（无）'),
          '题材：' + (ctx.theme || '未指定'),
          '',
          '请严格用以下 JSON 格式返回：',
          '{',
          '  "options": [',
          '    {"title": "人物姓名 + 身份", "content": "人物背景、性格、动机..."},',
          '    ... 共 5 个',
          '  ]',
          '}'
        ].join('\n');
      }
    },
    'next-scene': {
      label: '下一场景',
      systemHint: '你是一位擅长推动剧情的小说家，作品以流畅的节奏著称。',
      template: function (ctx) {
        return [
          '请为以下小说规划 5 个可能的下一场景（每个 80-150 字）。',
          '当前场景：' + (ctx.context || '（无）'),
          '题材：' + (ctx.theme || '未指定'),
          '',
          '请严格用以下 JSON 格式返回：',
          '{',
          '  "options": [',
          '    {"title": "场景名称", "content": "场景描述：地点、人物、冲突..."},',
          '    ... 共 5 个',
          '  ]',
          '}'
        ].join('\n');
      }
    }
  };

  // ==================== JSON 解析（宽容模式）====================
  // LLM 经常返回带 markdown 包裹 / 前缀文字的 JSON，要尽量提取
  function parseLenientJSON(text) {
    if (!text) return null;
    let cleaned = String(text).trim();

    // 1. 去掉 markdown 代码块
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    cleaned = cleaned.trim();

    // 2. 找最外层 {...}
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleaned);
    } catch (e1) {
      // 3. 尝试替换常见错误：中文引号、未转义换行
      try {
        const fixed = cleaned
          .replace(/"/g, '"')
          .replace(/"/g, '"')
          .replace(/'/g, "'")
          .replace(/'/g, "'");
        return JSON.parse(fixed);
      } catch (e2) {
        // 4. 退而求其次：用正则提取所有 "title" 和 "content" 字段
        return extractFromText(cleaned);
      }
    }
  }

  function extractFromText(text) {
    const options = [];
    const titleRegex = /"title"\s*:\s*"([^"]+)"/g;
    const contentRegex = /"content"\s*:\s*"([\s\S]+?)(?="[,\s]*[}\]]|"\s*[,}])/g;
    let m;
    const titles = [];
    while ((m = titleRegex.exec(text)) !== null) {
      titles.push(m[1]);
    }
    const contents = [];
    while ((m = contentRegex.exec(text)) !== null) {
      contents.push(m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
    }
    for (let i = 0; i < Math.max(titles.length, contents.length); i++) {
      if (titles[i] || contents[i]) {
        options.push({
          title: titles[i] || ('选项 ' + (i + 1)),
          content: contents[i] || ''
        });
      }
    }
    return options.length > 0 ? { options: options } : null;
  }

  // ==================== Generator ====================
  function create(options) {
    const opts = options || {};
    const callAI = opts.callAI;
    const aiSettings = opts.aiSettings;
    if (!callAI || !aiSettings) {
      throw new Error('NovelInspiration: callAI and aiSettings are required');
    }
    const themePrompt = opts.themePrompt || '你是一位专业的小说写作助手。';
    const type = opts.type || 'chapter-opener';
    const count = opts.count || 5;

    if (!TYPES[type]) {
      throw new Error('NovelInspiration: unknown type ' + type);
    }

    const typeConfig = TYPES[type];

    async function generate(context) {
      const ctx = context || {};
      const userPrompt = typeConfig.template(ctx);
      const systemPrompt = themePrompt + '\n\n' + typeConfig.systemHint;

      const messages = [{ role: 'user', content: userPrompt }];

      let raw = '';
      try {
        raw = await callAI(aiSettings, messages, systemPrompt);
      } catch (e) {
        return {
          ok: false,
          error: 'AI 调用失败: ' + (e.message || e),
          options: []
        };
      }

      const parsed = parseLenientJSON(raw);
      if (!parsed || !parsed.options || !Array.isArray(parsed.options)) {
        return {
          ok: false,
          error: 'AI 返回无法解析',
          raw: raw,
          options: []
        };
      }

      // 限制数量
      const options2 = parsed.options.slice(0, count).map(function (o) {
        return {
          title: o.title || '选项',
          content: o.content || ''
        };
      });

      return {
        ok: true,
        type: type,
        typeLabel: typeConfig.label,
        options: options2
      };
    }

    return {
      generate: generate,
      getTypes: function () {
        return Object.keys(TYPES).map(function (k) {
          return { value: k, label: TYPES[k].label };
        });
      }
    };
  }

  return {
    create: create,
    parseLenientJSON: parseLenientJSON,
    TYPES: TYPES
  };
});
