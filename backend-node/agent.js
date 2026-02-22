/**
 * agent.js — Neuro-Sync LangGraph Agent
 *
 * Accumulates 1 Hz ML telemetry from the streamer, triggers the Featherless.ai
 * deepseek-v3 LLM every 300 data-points (5 simulated minutes) via LangGraph,
 * and pushes the analysis to the frontend over Socket.IO.
 */

const { ChatOpenAI } = require("@langchain/openai");
const { StateGraph, Annotation, END, START } = require("@langchain/langgraph");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");

// ── Configuration ───────────────────────────────────────────
const TRIGGER_FIRST = 60;  // first trigger after 1 minute (60 data-points)
const TRIGGER_NEXT  = 180; // subsequent triggers every 3 minutes (180 data-points)

const FEATHERLESS_KEY = process.env.FEATHERLESS_API_KEY;
if (!FEATHERLESS_KEY) {
  console.warn(
    "⚠️  FEATHERLESS_API_KEY not set — agent will emit placeholder text."
  );
}

// ── LLM (Featherless.ai – OpenAI-compatible) ───────────────
const llm = new ChatOpenAI({
  configuration: { baseURL: "https://api.featherless.ai/v1" },
  modelName: "deepseek-ai/DeepSeek-V3-0324",
  apiKey: FEATHERLESS_KEY || "placeholder",
  temperature: 0.7,
  maxTokens: 350,
});

// ── System prompt with escalation rules ──────────────────────
const BREAK_THRESHOLD   = 60;   // suggest a 5-min break before this many minutes
const RESTRICT_THRESHOLD = 120; // force-restrict app after this many minutes

const SYSTEM_PROMPT = `You are the Neuro-Sync Executive Function Agent — a blunt, data-driven brain-health enforcer.

You receive a JSON snapshot every few minutes with:
- How long the user has been on the CURRENT app (appMinutes = X).
- Live EEG-derived metrics (focus, stress, flow, relaxation) from a Muse 2 headband.
- Cognitive-state distribution over the analysis window.
- Two hard thresholds (provided in the data block): BREAK_AT and RESTRICT_AT minutes.

Rules you MUST follow — in order of priority:

1. DURATION REPORT (always first sentence):
   "You have been on [app] for [X] minutes."

2. FOCUS-DROP PREDICTION:
   Based on prior sessions, the user's focus score drops sharply after sustained use.
   Tell them: "Based on previous sessions, your focus level will drop significantly
   around the [RESTRICT_AT − X]-minute mark from now."

3. BREAK SUGGESTION (if X < BREAK_AT):
   The current time is NOT a regular lunch/meal window.
   Advise: "Take at least a 5-minute break before [BREAK_AT − X] more minutes pass
   to preserve your cognitive performance."
   If X ≥ BREAK_AT, warn that the break window has already passed and the
   user is running on borrowed focus.

4. RESTRICTION WARNING (always last sentence):
   "If you continue past [RESTRICT_AT] total minutes, I will be forced to restrict
   [app] to protect your productivity."  If X ≥ RESTRICT_AT, state that the app
   is now being flagged for immediate restriction.

5. METRICS COLOUR:
   Weave the actual EEG numbers (focus, stress, flow) into a brief comment between
   rules 2 and 3 — for example "Your focus is sitting at 86 with stress at 42,
   which tracks with the early phase of a distraction spiral."

Format:
- Single paragraph, 4-6 sentences, NO bullet points.
- Be blunt, direct, second-person ("you").
- Do NOT start with "Based on the data" or any filler.
- Use exact numbers from the data; never round app minutes to the nearest 5.`;

// ── LangGraph state definition ──────────────────────────────
const AgentState = Annotation.Root({
  // The batch of data points to analyze
  dataBatch: Annotation({ reducer: (_, v) => v, default: () => [] }),
  // Running totals for context
  totalElapsed: Annotation({ reducer: (_, v) => v, default: () => 0 }),
  totalRedditMin: Annotation({ reducer: (_, v) => v, default: () => 0 }),
  currentApp: Annotation({ reducer: (_, v) => v, default: () => "None" }),
  // LLM output
  agentOutput: Annotation({ reducer: (_, v) => v, default: () => "" }),
});

// ── Graph nodes ─────────────────────────────────────────────
async function analyzeNode(state) {
  const batch = state.dataBatch;
  if (!batch.length) return { agentOutput: "" };

  const last = batch[batch.length - 1];
  const first = batch[0];

  // Build a compact summary for the LLM (avoid sending 300 full objects)
  const avgFocus =
    batch.reduce((s, d) => s + d.metrics.focus_score, 0) / batch.length;
  const avgStress =
    batch.reduce((s, d) => s + d.metrics.stress_level, 0) / batch.length;
  const avgFlow =
    batch.reduce((s, d) => s + d.metrics.flow_state, 0) / batch.length;
  const avgRelax =
    batch.reduce((s, d) => s + d.metrics.relax_level, 0) / batch.length;

  const stateFreq = {};
  for (const d of batch) {
    stateFreq[d.cognitive_state] = (stateFreq[d.cognitive_state] || 0) + 1;
  }

  const elapsedMin = (state.totalElapsed / 60).toFixed(1);
  const appMin = +(last.app_duration_seconds / 60).toFixed(1);

  // Compute remaining-time values the LLM must reference
  const breakRemaining   = Math.max(0, BREAK_THRESHOLD - appMin);
  const restrictRemaining = Math.max(0, RESTRICT_THRESHOLD - appMin);

  const humanMsg = `Analysis window: seconds ${first.elapsed_seconds}–${last.elapsed_seconds}

  Current app: ${last.app_used}
  appMinutes (X): ${appMin} min on ${last.app_used}
  BREAK_AT: ${BREAK_THRESHOLD} min  →  ${breakRemaining.toFixed(1)} min remaining before suggested break
  RESTRICT_AT: ${RESTRICT_THRESHOLD} min  →  ${restrictRemaining.toFixed(1)} min remaining before restriction

  Average focus:  ${avgFocus.toFixed(1)}
  Average stress: ${avgStress.toFixed(1)}
  Average flow:   ${avgFlow.toFixed(1)}
  Average relax:  ${avgRelax.toFixed(1)}
  Cognitive state distribution: ${JSON.stringify(stateFreq)}
  Total screen time: ${elapsedMin} min
  Reddit cumulative: ${state.totalRedditMin.toFixed(1)} min`;

  try {
    const response = await llm.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(humanMsg),
    ]);
    return { agentOutput: response.content };
  } catch (err) {
    console.error("❌ LLM call failed:", err.message);
    return {
      agentOutput: `[Agent error — LLM unreachable. Raw summary: focus=${avgFocus.toFixed(1)}, stress=${avgStress.toFixed(1)}, app=${last.app_used} for ${appMin} min, screen ${elapsedMin} min total.]`,
    };
  }
}

// ── Build the graph ─────────────────────────────────────────
const graph = new StateGraph(AgentState)
  .addNode("analyze", analyzeNode)
  .addEdge(START, "analyze")
  .addEdge("analyze", END);

const compiledGraph = graph.compile();

// ── Public API for server.js ────────────────────────────────
class NeuroSyncAgent {
  constructor(io) {
    this.io = io;              // Socket.IO server instance
    this.buffer = [];          // accumulates incoming data points
    this.totalRedditMin = 0;
    this.running = false;
    this.triggerCount = 0;     // how many times we've triggered
  }

  /** Call once per incoming ml:data event */
  ingest(point) {
    this.buffer.push(point);
    this.running = true;

    // Track cumulative Reddit minutes
    if (point.app_used === "Reddit") {
      this.totalRedditMin += 1 / 60; // 1 second in minutes
    }

    // Broadcast the live telemetry point to all frontend clients
    this.io.emit("ml:live", point);

    // Trigger LLM: first time after 1 min, then every 3 min
    const threshold = this.triggerCount === 0 ? TRIGGER_FIRST : TRIGGER_NEXT;
    if (this.buffer.length >= threshold) {
      this._triggerAnalysis(threshold);
    }
  }

  stop() {
    this.running = false;
    this.buffer = [];
    this.triggerCount = 0;
  }

  async _triggerAnalysis(batchSize) {
    const batch = this.buffer.splice(0, batchSize);
    this.triggerCount++;
    const last = batch[batch.length - 1];

    console.log(
      `\n🧠 Agent triggered @ elapsed=${last.elapsed_seconds}s — analyzing ${batch.length} points…`
    );

    const result = await compiledGraph.invoke({
      dataBatch: batch,
      totalElapsed: last.elapsed_seconds,
      totalRedditMin: this.totalRedditMin,
      currentApp: last.app_used,
    });

    const output = result.agentOutput;
    console.log(`✅ Agent output (${output.length} chars): ${output.slice(0, 120)}…\n`);

    // Push to all connected frontend clients
    this.io.emit("agent_update", {
      text: output,
      elapsed: last.elapsed_seconds,
      app: last.app_used,
      appMin: +(last.app_duration_seconds / 60).toFixed(1),
      metrics: last.metrics,
      timestamp: Date.now(),
      nextIn: TRIGGER_NEXT,  // tell frontend how long until next analysis
    });
  }
}

module.exports = { NeuroSyncAgent, TRIGGER_FIRST, TRIGGER_NEXT };
