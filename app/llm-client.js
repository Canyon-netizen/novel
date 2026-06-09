// ==================== Novel LLM Client ====================
// 统一多 provider LLM 调用层。4 个 view（dashboard / create / editor / chat）共用。
// UMD 模式：暴露在 root.NovelLLMClient

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NovelLLMClient = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ==================== Presets ====================
  const API_PRESETS = {
    anthropic: {
      name: 'Anthropic (Claude)',
      baseUrl: 'https://api.anthropic.com/v1',
      authHeader: 'x-api-key',
      modelPrefix: ''
    },
    openai: {
      name: 'OpenAI (GPT)',
      baseUrl: 'https://api.openai.com/v1',
      authHeader: 'bearer',
      modelPrefix: ''
    },
    deepseek: {
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      authHeader: 'bearer',
      modelPrefix: 'deepseek-'
    },
    minimax: {
      name: 'MiniMax',
      baseUrl: 'https://api.minimaxi.com/v1',
      authHeader: 'bearer',
      modelPrefix: 'MiniMax-'
    },
    kimi: {
      name: 'Kimi (Moonshot)',
      baseUrl: 'https://api.moonshot.cn/v1',
      authHeader: 'bearer',
      modelPrefix: 'moonshot-'
    },
    glm: {
      name: 'GLM (智谱)',
      baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
      authHeader: 'bearer',
      modelPrefix: 'glm-'
    }
  };

  // ==================== Provider Detection ====================
  function inferApiProfile(baseUrl, model) {
    const normalizedBaseUrl = String(baseUrl || '').trim().toLowerCase();
    const normalizedModel = String(model || '').trim().toLowerCase();

    // 第三方代理路径（如 /anthropic、/openai）
    if (/\/anthropic\b/i.test(normalizedBaseUrl)) return 'anthropic';
    if (/\/openai\b/i.test(normalizedBaseUrl) || /\/chat\/completions/i.test(normalizedBaseUrl)) {
      return 'openai';
    }

    // 按域名精确匹配
    if (/api\.anthropic\.com/i.test(normalizedBaseUrl)) return 'anthropic';
    if (/api\.deepseek\.com/i.test(normalizedBaseUrl)) return 'deepseek';
    if (/api\.minimax(?:i)?\.(?:chat|io|com)/i.test(normalizedBaseUrl)) return 'minimax';
    if (/api\.moonshot\.cn/i.test(normalizedBaseUrl)) return 'kimi';
    if (/bigmodel\.cn/i.test(normalizedBaseUrl)) return 'glm';
    if (/api\.openai\.com/i.test(normalizedBaseUrl)) return 'openai';

    // 按 model 前缀
    if (normalizedModel.startsWith('deepseek-')) return 'deepseek';
    if (normalizedModel.startsWith('minimax-') || normalizedModel.startsWith('MiniMax-')) return 'minimax';
    if (normalizedModel.startsWith('glm-')) return 'glm';
    if (normalizedModel.startsWith('moonshot-')) return 'kimi';
    if (/claude/i.test(normalizedModel)) return 'anthropic';

    // 第三方代理（baseUrl 有值但不在列表中）→ 返回 null，让调用方用 provider 参数
    if (normalizedBaseUrl) return null;
    return 'openai';
  }

  // ==================== Endpoint / Headers / Body ====================
  function buildApiEndpoint(baseUrl, provider, model) {
    let normalized = (baseUrl || '').replace(/\/+$/, '');
    if (normalized) {
      // 如果 baseUrl 已经以 /v1 结尾（OpenAI 兼容 / Anthropic / DeepSeek / MiniMax / Moonshot 官方都是
      // https://<host>/v1），就不再叠加 /v1，避免拼出 /v1/v1/chat/completions 这种 404 路径。
      // 仅当 baseUrl 是裸域名（如 https://api.openai.com）时才追加 /v1。
      const hasV1 = /\/v1(?:\/.*)?$/i.test(normalized);
      const v1Suffix = hasV1 ? '' : '/v1';
      if (provider === 'anthropic') return `${normalized}${v1Suffix}/messages`;
      return `${normalized}${v1Suffix}/chat/completions`;
    }
    if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
    if (provider === 'deepseek') return 'https://api.deepseek.com/v1/chat/completions';
    if (provider === 'minimax') return 'https://api.minimaxi.com/v1/chat/completions';
    if (provider === 'kimi') return 'https://api.moonshot.cn/v1/chat/completions';
    if (provider === 'glm') return 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions';
    return 'https://api.openai.com/v1/chat/completions';
  }

  function buildApiHeaders(provider, apiKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return headers;
  }

  function buildApiBody(provider, model, systemPrompt, messages, temperature, maxTokens) {
    const modelName = model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4');
    if (provider === 'anthropic') {
      return {
        model: modelName,
        system: systemPrompt,
        messages: messages,
        max_tokens: maxTokens || 2048
      };
    }
    return {
      model: modelName,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: temperature || 0.7,
      max_tokens: maxTokens || 2048
    };
  }

  function buildConnectivityTestPayload(model) {
    return {
      model: model,
      messages: [
        { role: 'system', content: 'Reply with exactly: hello world' },
        { role: 'user', content: 'hello world' }
      ],
      temperature: 0,
      max_tokens: 256
    };
  }

  // ==================== Local Mock ====================
  function callLocalAI(messages, systemPrompt) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve('【本地模拟】这是一段模拟的AI续写内容。夜风轻拂，星光点点，他望着远方的山峦，心中涌起无限思绪。');
      }, 1000);
    });
  }

  // ==================== Public Call ====================
  /**
   * @param {Object} aiSettings - { provider, apiKey, baseUrl, model, temperature, maxTokens }
   * @param {Array} messages - [{ role, content }]
   * @param {string} systemPrompt
   * @returns {Promise<string>}
   */
  async function callAI(aiSettings, messages, systemPrompt) {
    const settings = aiSettings || {};
    if (settings.provider === 'local') {
      return callLocalAI(messages, systemPrompt);
    }

    const detectedProvider = inferApiProfile(settings.baseUrl, settings.model) || settings.provider || 'openai';
    const endpoint = buildApiEndpoint(settings.baseUrl, detectedProvider, settings.model);
    const headers = buildApiHeaders(detectedProvider, settings.apiKey);
    const body = buildApiBody(detectedProvider, settings.model, systemPrompt, messages, settings.temperature, settings.maxTokens);

    if (!endpoint) {
      throw new Error('未配置 API 端点');
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errData = await response.json();
          errorDetail = errData.error && errData.error.message
            ? errData.error.message
            : JSON.stringify(errData).slice(0, 200);
        } catch (e) {
          errorDetail = await response.text();
        }
        throw new Error('HTTP ' + response.status + ': ' + errorDetail);
      }

      const data = await response.json();

      if (detectedProvider === 'anthropic') {
        return (data.content && data.content[0] && data.content[0].text) || '';
      }
      // OpenAI / DeepSeek / MiniMax
      let result = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      // 移除思考过程标签
      result = String(result).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      return result;
    } catch (error) {
      const msg = String(error && error.message || error);
      if (msg.includes('fetch') || msg.includes('CORS')) {
        throw new Error('网络请求失败，可能是 CORS 跨域问题。请确认 API 端点支持跨域访问。');
      }
      throw error;
    }
  }

  // ==================== Connectivity Test ====================
  // 用 AbortController + timeout 避免无限等待
  // 区分错误类型（配置错误 / 网络错误 / 鉴权错误 / CORS / 模型错误）
  async function testConnection(aiSettings, options) {
    const settings = aiSettings || {};
    const opts = options || {};
    const timeoutMs = opts.timeoutMs || 15000;
    const signal = opts.signal;

    if (settings.provider === 'local') {
      return { ok: true, code: 'local', message: '本地模拟模式无需测试' };
    }

    // 1. 校验必填字段
    if (!settings.apiKey && settings.provider !== 'custom') {
      throw new ConnectionError('missing-key', 'API Key 未配置', '请在设置中填写 API Key');
    }

    const detectedProvider = inferApiProfile(settings.baseUrl, settings.model) || settings.provider || 'openai';
    const endpoint = buildApiEndpoint(settings.baseUrl, detectedProvider, settings.model);

    if (!endpoint) {
      throw new ConnectionError('no-endpoint', '未配置 API 端点', '请填写 Base URL 或选择一个内置 provider');
    }

    // 2. 优先用 model，否则用 provider 默认 model
    const testModel = settings.model || (API_PRESETS[detectedProvider] && API_PRESETS[detectedProvider].model) || 'gpt-4o-mini';
    const headers = buildApiHeaders(detectedProvider, settings.apiKey);
    const body = buildConnectivityTestPayload(testModel);

    // 3. 用 AbortController 做超时
    const controller = new AbortController();
    const combinedSignal = signal
      ? composeSignals([signal, controller.signal])
      : controller.signal;
    const timer = setTimeout(function () { controller.abort('timeout'); }, timeoutMs);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: combinedSignal
      });
    } catch (err) {
      clearTimeout(timer);
      const msg = String(err && err.message || err);
      if (err && err.name === 'AbortError' || msg.indexOf('aborted') >= 0 || msg.indexOf('abort') >= 0) {
        throw new ConnectionError('timeout', '请求超时（' + (timeoutMs / 1000) + ' 秒）', '请检查网络连接和 API 端点是否可访问');
      }
      if (msg.indexOf('Failed to fetch') >= 0 || msg.indexOf('NetworkError') >= 0 || msg.indexOf('CORS') >= 0) {
        throw new ConnectionError('network', '网络请求失败', '可能是 CORS 跨域问题或网络不通。请确认 API 端点支持跨域访问。');
      }
      throw new ConnectionError('network', '网络错误: ' + msg, '请检查网络和 API 端点');
    }
    clearTimeout(timer);

    // 4. 状态码分类
    if (!response.ok) {
      let detail = '';
      try {
        const errData = await response.json();
        detail = (errData.error && (errData.error.message || errData.error)) || JSON.stringify(errData);
      } catch (e) {
        try { detail = await response.text(); } catch (e2) { detail = ''; }
      }
      detail = String(detail).slice(0, 300);

      if (response.status === 401 || response.status === 403) {
        throw new ConnectionError('auth', '鉴权失败（HTTP ' + response.status + '）', 'API Key 无效或已过期。详情: ' + detail);
      }
      if (response.status === 404) {
        throw new ConnectionError('not-found', '端点不存在（HTTP 404）', 'Base URL 路径不正确，请检查是否需要加 /v1 后缀。详情: ' + detail);
      }
      if (response.status === 429) {
        throw new ConnectionError('rate-limit', '请求过于频繁（HTTP 429）', '触发了限流，请稍后重试。详情: ' + detail);
      }
      if (response.status >= 500) {
        throw new ConnectionError('server', '服务器错误（HTTP ' + response.status + '）', 'LLM 服务端异常，请稍后重试。详情: ' + detail);
      }
      throw new ConnectionError('http-' + response.status, 'HTTP ' + response.status, detail || '请检查 API 配置');
    }

    // 5. 解析成功响应
    const data = await response.json();
    let result = '';
    let usage = null;
    if (detectedProvider === 'anthropic') {
      result = (data.content && data.content[0] && data.content[0].text) || '';
      usage = data.usage;
    } else {
      result = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      usage = data.usage;
    }

    return {
      ok: true,
      code: 'success',
      message: '连接成功：' + String(result).slice(0, 100),
      provider: detectedProvider,
      endpoint: endpoint,
      model: testModel,
      sample: String(result).slice(0, 200),
      usage: usage
    };
  }

  // 组合多个 AbortSignal（任一 abort 则整个 abort）
  function composeSignals(signals) {
    const controller = new AbortController();
    signals.forEach(function (s) {
      if (s.aborted) controller.abort(s.reason);
      else s.addEventListener('abort', function () { controller.abort(s.reason); }, { once: true });
    });
    return controller.signal;
  }

  // 自定义错误类型，带 code 字段
  function ConnectionError(code, message, detail) {
    const err = new Error(message);
    err.name = 'ConnectionError';
    err.code = code;
    err.detail = detail || '';
    return err;
  }

  return {
    API_PRESETS: API_PRESETS,
    inferApiProfile: inferApiProfile,
    buildApiEndpoint: buildApiEndpoint,
    buildApiHeaders: buildApiHeaders,
    buildApiBody: buildApiBody,
    buildConnectivityTestPayload: buildConnectivityTestPayload,
    callAI: callAI,
    callLocalAI: callLocalAI,
    testConnection: testConnection
  };
});
