/**
 * Ollama API Service
 * 
 * Handles communication with local Ollama server (http://localhost:11434)
 */

const OLLAMA_BASE_URL = 'http://localhost:11434';

/**
 * Sends a chat request to Ollama and handles streaming response
 * @param {Array} messages - Chat history
 * @param {Object} options - Model parameters (temperature, num_predict, etc.)
 * @param {Function} onChunk - Callback for each streaming chunk
 */
export const chatWithGemma = async (messages, options = {}, onChunk) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemma4:e2b', // Using the model found in `ollama list`
        messages,
        options,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message) {
            onChunk(json.message.content, json.done);
          }
        } catch (e) {
          console.error('Error parsing Ollama chunk:', e, line);
        }
      }
    }
  } catch (error) {
    console.error('Failed to connect to Ollama:', error);
    throw error;
  }
};

/**
 * Checks if Ollama server is reachable
 */
export const checkOllamaConnection = async () => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
};
