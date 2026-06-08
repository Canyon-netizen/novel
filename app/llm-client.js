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
    const normalized = (baseUrl || '').replace(/\/+$/, '');
    if (normalized) {
      if (provider === 'anthropic') return `${normalized}/v1/messages`;
      return `${normalized}/v1/chat/completions`;
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
  async function testConnection(aiSettings) {
    const settings = aiSettings || {};
    if (settings.provider === 'local') {
      return { ok: true, message: '本地模拟模式无需测试' };
    }

    const detectedProvider = inferApiProfile(settings.baseUrl, settings.model) || settings.provider || 'openai';
    const endpoint = buildApiEndpoint(settings.baseUrl, detectedProvider, settings.model);
    const headers = buildApiHeaders(detectedProvider, settings.apiKey);
    const body = buildConnectivityTestPayload(settings.model);

    if (!endpoint) throw new Error('未配置 API 端点');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('HTTP ' + response.status + ': ' + text.slice(0, 200));
    }
    const data = await response.json();
    let result = '';
    if (detectedProvider === 'anthropic') {
      result = (data.content && data.content[0] && data.content[0].text) || '';
    } else {
      result = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    }
    return { ok: true, message: '连接成功：' + result.slice(0, 100) };
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
