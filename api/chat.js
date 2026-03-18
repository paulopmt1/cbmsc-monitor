const { toolDefs, buildSystemPrompt } = require('./lib/tools');

const anthropicTools = Object.entries(toolDefs).map(([name, def]) => ({
  name,
  description: def.description,
  input_schema: def.schema,
}));

async function callAnthropic(apiKey, messages, lang) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: buildSystemPrompt(lang),
      messages,
      tools: anthropicTools,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${body}`);
  }
  return resp.json();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    return;
  }

  const { messages: chatHistory, lang } = req.body || {};

  if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const chatLang = lang === 'en' ? 'en' : 'pt';
    const messages = chatHistory.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let textResult = '';

    for (let step = 0; step < 5; step++) {
      const response = await callAnthropic(apiKey, messages, chatLang);

      const textBlocks = response.content.filter((b) => b.type === 'text');
      const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

      if (textBlocks.length > 0) {
        textResult += textBlocks.map((b) => b.text).join('');
      }

      if (response.stop_reason !== 'tool_use' || toolBlocks.length === 0) {
        break;
      }

      const toolResults = [];
      for (const toolCall of toolBlocks) {
        const def = toolDefs[toolCall.name];
        if (!def) {
          toolResults.push({ type: 'tool_result', tool_use_id: toolCall.id, content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }) });
          continue;
        }
        try {
          const result = await def.handler(toolCall.input || {});
          toolResults.push({ type: 'tool_result', tool_use_id: toolCall.id, content: JSON.stringify(result) });
        } catch (err) {
          toolResults.push({ type: 'tool_result', tool_use_id: toolCall.id, content: JSON.stringify({ error: err.message }), is_error: true });
        }
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(textResult);
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
};
