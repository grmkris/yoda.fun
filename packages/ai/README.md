# `@yoda.fun/ai`

AI integration package with multi-provider support using Vercel AI SDK.

## Supported Providers

- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
- **Google** (Gemini 2.0 Flash, Gemini Pro, etc.)
- **Groq** (Llama 3.3 70B, Mixtral, etc.)

## Usage

```typescript
import { createAiClient } from "@yoda.fun/ai";
import { logger } from "@yoda.fun/logger";

// Create client
const ai = createAiClient({
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: "claude-3-5-sonnet-20241022",
  logger,
  environment: "localDev",
});

// Generate text
const result = await ai.generate({
  prompt: "What is the capital of France?",
  system: "You are a helpful assistant.",
  temperature: 0.7,
  maxTokens: 1000,
});

console.log(result.text);

// Stream text
const stream = await ai.stream({
  prompt: "Write a short story about a robot.",
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## Configuration

Set environment variables for your chosen provider:

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_API_KEY=...

# Groq
GROQ_API_KEY=gsk_...
```
