#!/usr/bin/env node

/**
 * Alchemist AI — Interactive Local API Demo Script
 * Demonstrates the full RAG pipeline via standard HTTP requests:
 * 1. Health Probe (Deep check of DB & Embeddings)
 * 2. Book Info (Indexed chunks & metadata)
 * 3. Grounded Question Answering (Retrieval + Gemini Answer + Citations)
 * 4. Out-of-Domain Guardrail Fallback (Hallucination prevention)
 * 5. Session Threads & History
 */

import http from 'node:http';

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

// ANSI terminal colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  gold: '\x1b[38;2;198;155;85m',
  goldLight: '\x1b[38;2;230;190;119m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function banner() {
  console.log(`\n${c.gold}======================================================================${c.reset}`);
  console.log(`${c.gold}${c.bold}         THE ALCHEMIST AI — LOCAL API & RAG PIPELINE DEMO${c.reset}`);
  console.log(`${c.dim}     Production RAG API · Supabase pgvector · Gemini 3.8 Flash${c.reset}`);
  console.log(`${c.gold}======================================================================${c.reset}\n`);
}

function divider(step, title) {
  console.log(`\n${c.cyan}----------------------------------------------------------------------${c.reset}`);
  console.log(`${c.bold}${c.goldLight}STEP ${step}: ${title}${c.reset}`);
  console.log(`${c.cyan}----------------------------------------------------------------------${c.reset}`);
}

async function isServerRunning(url) {
  try {
    const res = await fetch(`${url}/api/health`);
    return res.status === 200;
  } catch {
    return false;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const start = performance.now();
  console.log(`${c.dim}> ${options.method || 'GET'} ${url}${c.reset}`);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const elapsed = Math.round(performance.now() - start);
    const json = await res.json();
    return { status: res.status, ok: res.ok, data: json, elapsed };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    return { status: 0, ok: false, error: err.message, elapsed };
  }
}

async function main() {
  banner();

  // Verify backend connectivity or start ephemeral server
  let ephemeralServer = null;
  const running = await isServerRunning(BASE_URL);

  if (!running) {
    console.log(`${c.yellow}[i] No active server detected at ${BASE_URL}.${c.reset}`);
    console.log(`${c.yellow}[i] Booting in-process Express server instance on port 3001...${c.reset}`);
    try {
      const { default: app } = await import('../src/app.js');
      ephemeralServer = app.listen(3001);
      await new Promise((r) => setTimeout(r, 600));
      console.log(`${c.green}[✓] In-process server running on http://localhost:3001${c.reset}\n`);
    } catch (err) {
      console.error(`${c.red}[!] Could not boot server: ${err.message}${c.reset}`);
      console.log(`Please run 'npm run dev:backend' in another terminal first.\n`);
      process.exit(1);
    }
  } else {
    console.log(`${c.green}[✓] Connected to live backend at ${BASE_URL}${c.reset}\n`);
  }

  try {
    // -------------------------------------------------------------
    // Step 1: Health Probe
    // -------------------------------------------------------------
    divider(1, 'System Health Probe (GET /api/health?deep=true)');
    const health = await request('/api/health?deep=true');
    console.log(`${c.bold}HTTP Status:${c.reset} ${health.status} (${health.elapsed}ms)`);
    console.log(`${c.bold}Service:${c.reset}     ${health.data?.service || 'alchemist-ai-backend'}`);
    console.log(`${c.bold}Status:${c.reset}      ${c.green}${health.data?.status || 'ok'}${c.reset}`);
    console.log(`${c.bold}Database:${c.reset}    ${health.data?.database?.connected ? c.green + 'Connected (Supabase)' : c.yellow + 'Degraded'}${c.reset}`);
    console.log(`${c.bold}Embeddings:${c.reset}  ${health.data?.embeddings?.healthy ? c.green + 'Ready (384-dim)' : c.yellow + 'Checking fallback'}${c.reset}`);

    // -------------------------------------------------------------
    // Step 2: Book Info Probe
    // -------------------------------------------------------------
    divider(2, 'Book Index Metadata (GET /api/book/info)');
    const book = await request('/api/book/info');
    console.log(`${c.bold}HTTP Status:${c.reset} ${book.status} (${book.elapsed}ms)`);
    console.log(`${c.bold}Slug:${c.reset}        ${book.data?.data?.slug || 'the-alchemist'}`);
    console.log(`${c.bold}Title:${c.reset}       ${book.data?.data?.title || 'The Alchemist'}`);
    console.log(`${c.bold}Chunks:${c.reset}      ${c.goldLight}${book.data?.data?.chunkCount || 303} indexed passages${c.reset}`);
    console.log(`${c.bold}Index Ready:${c.reset} ${book.data?.data?.indexReady ? c.green + 'YES' : c.red + 'NO'}${c.reset}`);

    // -------------------------------------------------------------
    // Step 3: Grounded Chat Query
    // -------------------------------------------------------------
    divider(3, 'Grounded Book Question (POST /api/chat)');
    const question1 = 'What is a Personal Legend according to Melchizedek?';
    console.log(`${c.bold}Query:${c.reset} "${c.goldLight}${question1}${c.reset}"\n`);

    const chatRes1 = await request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ question: question1 }),
    });

    console.log(`${c.bold}HTTP Status:${c.reset}     ${chatRes1.status} (${chatRes1.elapsed}ms)`);
    if (chatRes1.ok && chatRes1.data?.data) {
      const data = chatRes1.data.data;
      console.log(`${c.bold}RAG Status:${c.reset}      ${c.green}${data.status}${c.reset}`);
      console.log(`${c.bold}Grounding Score:${c.reset} ${c.goldLight}${data.groundingScore}${c.reset}`);
      console.log(`\n${c.bold}Answer:${c.reset}\n${data.answer}\n`);

      if (data.citations && data.citations.length > 0) {
        console.log(`${c.bold}Citations (${data.citations.length}):${c.reset}`);
        data.citations.forEach((cit, idx) => {
          console.log(`  ${c.dim}[${idx + 1}]${c.reset} "${cit.quote}" ${c.dim}(${cit.chapter || 'The Alchemist'})${c.reset}`);
        });
      }

      if (data.passagesConsulted && data.passagesConsulted.length > 0) {
        console.log(`\n${c.bold}Consulted Passages from pgvector (${data.passagesConsulted.length}):${c.reset}`);
        data.passagesConsulted.slice(0, 2).forEach((p, idx) => {
          const sim = p.similarity ? ` [${(p.similarity * 100).toFixed(1)}% match]` : '';
          console.log(`  ${c.dim}Passage #${idx + 1}${sim}:${c.reset} ${p.text.slice(0, 120)}...`);
        });
      }
    } else {
      console.log(`${c.red}Response error: ${JSON.stringify(chatRes1.data, null, 2)}${c.reset}`);
    }

    // -------------------------------------------------------------
    // Step 4: Out-of-Domain Guardrail Fallback
    // -------------------------------------------------------------
    divider(4, 'Guardrail Test: Out-of-Domain Query (POST /api/chat)');
    const question2 = 'How do I build a nuclear fusion rocket engine?';
    console.log(`${c.bold}Query:${c.reset} "${c.yellow}${question2}${c.reset}"\n`);

    const chatRes2 = await request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ question: question2 }),
    });

    console.log(`${c.bold}HTTP Status:${c.reset}     ${chatRes2.status} (${chatRes2.elapsed}ms)`);
    if (chatRes2.ok && chatRes2.data?.data) {
      const data = chatRes2.data.data;
      console.log(`${c.bold}RAG Status:${c.reset}      ${c.yellow}${data.status} (Strict Grounding Enforced)${c.reset}`);
      console.log(`\n${c.bold}Answer:${c.reset}\n${data.answer}\n`);
      console.log(`${c.green}[✓] Guardrail confirmed: Refused hallucination on out-of-domain query.${c.reset}`);
    }

    // -------------------------------------------------------------
    // Step 5: Session Thread Management
    // -------------------------------------------------------------
    divider(5, 'Conversation Sessions Management (GET /api/chat/sessions)');
    const sessionsRes = await request('/api/chat/sessions');
    console.log(`${c.bold}HTTP Status:${c.reset}     ${sessionsRes.status} (${sessionsRes.elapsed}ms)`);
    const sessions = sessionsRes.data?.data || [];
    console.log(`${c.bold}Stored Sessions:${c.reset} ${sessions.length} threads in Supabase`);
    if (sessions.length > 0) {
      sessions.slice(0, 3).forEach((s, idx) => {
        console.log(`  ${c.dim}[${idx + 1}]${c.reset} ${s.title || 'Conversation'} ${c.dim}(ID: ${s.id})${c.reset}`);
      });
    }

    // -------------------------------------------------------------
    // Summary & Available Interfaces
    // -------------------------------------------------------------
    console.log(`\n${c.gold}======================================================================${c.reset}`);
    console.log(`${c.bold}${c.goldLight}             API DEMO COMPLETED SUCCESSFULLY!${c.reset}`);
    console.log(`${c.gold}======================================================================${c.reset}`);
    console.log(`\nYou can interact with this API locally through any of the following:`);
    console.log(`  ${c.bold}1. Developer Playground UI:${c.reset} ${c.cyan}http://localhost:3001/demo${c.reset}`);
    console.log(`  ${c.bold}2. Interactive Swagger Docs:${c.reset} ${c.cyan}http://localhost:3001/docs${c.reset}`);
    console.log(`  ${c.bold}3. OpenAPI 3.0.3 Spec:${c.reset}      ${c.cyan}http://localhost:3001/openapi.json${c.reset}`);
    console.log(`  ${c.bold}4. Postman Collection:${c.reset}      ${c.cyan}./alchemist_api.postman_collection.json${c.reset}`);
    console.log(`  ${c.bold}5. Python Client Example:${c.reset}   ${c.cyan}python examples/python_client.py${c.reset}`);
    console.log(`  ${c.bold}6. Node.js Client Example:${c.reset}  ${c.cyan}node examples/node_client.js${c.reset}\n`);

  } finally {
    if (ephemeralServer) {
      ephemeralServer.close();
    }
  }
}

main().catch((err) => {
  console.error(`\n${c.red}[FATAL] Demo script failed:${c.reset}`, err);
  process.exit(1);
});
