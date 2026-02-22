// Quick test of Featherless.ai LLM connection
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage } = require("@langchain/core/messages");
require("dotenv").config();

const key = process.env.FEATHERLESS_API_KEY;
console.log("Key present:", !!key);
console.log("Key prefix:", key ? key.slice(0, 12) + "..." : "MISSING");

const llm = new ChatOpenAI({
  configuration: { baseURL: "https://api.featherless.ai/v1" },
  modelName: "deepseek-ai/DeepSeek-V3-0324",
  apiKey: key,
  temperature: 0.7,
  maxTokens: 100,
});

llm
  .invoke([new HumanMessage("Say hello in one sentence.")])
  .then((r) => {
    console.log("SUCCESS:", r.content);
    process.exit(0);
  })
  .catch((e) => {
    console.error("FAIL:", e.message);
    if (e.status) console.error("HTTP status:", e.status);
    if (e.error) console.error("Error body:", JSON.stringify(e.error));
    process.exit(1);
  });
