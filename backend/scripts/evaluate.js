#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ragService } from '../src/services/ragService.js';
import { retrievalService } from '../src/services/retrievalService.js';
import { embeddingClient } from '../src/services/embeddingClient.js';
import { normalizeForEmbedding } from '../src/services/ingestion/normalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    datasetPath: path.resolve(__dirname, '../evaluation/dataset.json'),
    resultsDir: path.resolve(__dirname, '../evaluation/results'),
    noLLM: false,
    limit: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--no-llm') {
      options.noLLM = true;
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--file' && args[i + 1]) {
      options.datasetPath = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Alchemist AI — Benchmark Evaluation Runner

Usage:
  node scripts/evaluate.js [options]
  npm run evaluate -- [options]

Options:
  --no-llm          Run retrieval-only benchmark (calculates Hit@k without calling Gemini)
  --limit <n>       Evaluate only the first N questions
  --file <path>     Path to custom evaluation dataset JSON
  --help, -h        Show this help message
`);
      process.exit(0);
    }
  }

  return options;
}

function checkHitAtK(candidates, mustContainAny, k) {
  if (!mustContainAny || mustContainAny.length === 0) return false;
  const topK = candidates.slice(0, k);

  for (const cand of topK) {
    const normContent = normalizeForEmbedding(cand.content).toLowerCase();
    for (const phrase of mustContainAny) {
      if (normContent.includes(normalizeForEmbedding(phrase).toLowerCase())) {
        return true;
      }
    }
  }
  return false;
}

function findGoldRank(candidates, mustContainAny) {
  if (!mustContainAny || mustContainAny.length === 0) return null;
  for (let i = 0; i < candidates.length; i++) {
    const normContent = normalizeForEmbedding(candidates[i].content).toLowerCase();
    for (const phrase of mustContainAny) {
      if (normContent.includes(normalizeForEmbedding(phrase).toLowerCase())) {
        return i + 1; // 1-based rank
      }
    }
  }
  return null;
}

async function main() {
  const options = parseArgs();

  console.log('='.repeat(70));
  console.log('🧪 Alchemist AI — Grounding & Retrieval Benchmark Harness');
  console.log('='.repeat(70));
  console.log(`Dataset      : ${options.datasetPath}`);
  console.log(`Mode         : ${options.noLLM ? 'RETRIEVAL ONLY (--no-llm)' : 'FULL RAG PIPELINE (Retrieval + Gemini)'}`);
  if (options.limit) console.log(`Limit        : First ${options.limit} questions`);
  console.log('='.repeat(70));

  const raw = await fs.readFile(options.datasetPath, 'utf-8');
  let dataset = JSON.parse(raw);
  if (options.limit && options.limit > 0) {
    dataset = dataset.slice(0, options.limit);
  }

  const results = [];
  let answerableCount = 0;
  let unanswerableCount = 0;
  let hitsAt1 = 0;
  let hitsAt3 = 0;
  let hitsAt5 = 0;
  let correctFallbackCount = 0;
  let correctAnsweredCount = 0;
  let validCitationsCount = 0;
  let totalCitationsEvaluated = 0;
  const latencies = [];

  console.log(`\nEvaluating ${dataset.length} benchmark questions...\n`);

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];
    const qStart = Date.now();
    const isAnswerable = item.expectedBehavior === 'answer';

    if (isAnswerable) answerableCount++;
    else unanswerableCount++;

    process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${dataset.length}] (${item.category}) ${item.question.slice(0, 45)}... `);

    // 1. Retrieval stage
    const candidates = await retrievalService.retrieveCandidates(item.question);
    const topSimilarities = candidates.map((c) => c.similarity);

    let hit1 = false;
    let hit3 = false;
    let hit5 = false;
    let goldRank = null;

    if (isAnswerable && item.expectedEvidence?.mustContainAny) {
      hit1 = checkHitAtK(candidates, item.expectedEvidence.mustContainAny, 1);
      hit3 = checkHitAtK(candidates, item.expectedEvidence.mustContainAny, 3);
      hit5 = checkHitAtK(candidates, item.expectedEvidence.mustContainAny, 5);
      goldRank = findGoldRank(candidates, item.expectedEvidence.mustContainAny);

      if (hit1) hitsAt1++;
      if (hit3) hitsAt3++;
      if (hit5) hitsAt5++;
    }

    let ragResult = null;
    let citationValid = true;

    if (!options.noLLM) {
      // 2. Full generation stage
      try {
        ragResult = await ragService.answerQuestion(item.question);
        const isAnswered = ragResult.status === 'answered';
        const isFallback = ragResult.status === 'insufficient_evidence';

        if (isAnswerable && isAnswered) {
          correctAnsweredCount++;
        } else if (!isAnswerable && isFallback) {
          correctFallbackCount++;
        }

        // 3. Citation validation
        if (isAnswered && ragResult.sources) {
          for (const src of ragResult.sources) {
            totalCitationsEvaluated++;
            // Must match a retrieved candidate ID
            const inCandidates = candidates.some((c) => c.id === src.chunkId);
            if (!inCandidates) {
              citationValid = false;
            }
          }
          if (citationValid && ragResult.sources.length > 0) {
            validCitationsCount += ragResult.sources.length;
          }
        }
      } catch (err) {
        ragResult = { status: 'error', error: err.message };
        citationValid = false;
      }

      // Respectful pacing between questions for API stability
      await new Promise((res) => setTimeout(res, 500));
    }

    const durationMs = Date.now() - qStart;
    latencies.push(durationMs);

    const statusBadge = options.noLLM
      ? (isAnswerable ? (hit5 ? '🎯 Hit@5' : '❌ Miss') : '⏭️ Skip')
      : (ragResult?.status === item.expectedBehavior || (isAnswerable && ragResult?.status === 'answered')
          ? '✅ PASS'
          : '⚠️ DIFF');

    console.log(`${statusBadge} (${durationMs}ms)`);

    results.push({
      id: item.id,
      category: item.category,
      question: item.question,
      expectedBehavior: item.expectedBehavior,
      retrievedCount: candidates.length,
      topSimilarities,
      goldRank,
      hitAt1: hit1,
      hitAt3: hit3,
      hitAt5: hit5,
      actualStatus: ragResult?.status || 'retrieval_only',
      answer: ragResult?.answer || null,
      interpretation: ragResult?.interpretation || null,
      sourcesCount: ragResult?.sources?.length || 0,
      citationValid,
      latencyMs: durationMs,
    });
  }

  // Latency metrics
  latencies.sort((a, b) => a - b);
  const medianLatency = latencies[Math.floor(latencies.length / 2)] || 0;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  // Summary Metrics
  const hit5Rate = answerableCount > 0 ? ((hitsAt5 / answerableCount) * 100).toFixed(1) : 'N/A';
  const hit3Rate = answerableCount > 0 ? ((hitsAt3 / answerableCount) * 100).toFixed(1) : 'N/A';
  const hit1Rate = answerableCount > 0 ? ((hitsAt1 / answerableCount) * 100).toFixed(1) : 'N/A';
  const fallbackPrecision = unanswerableCount > 0 ? ((correctFallbackCount / unanswerableCount) * 100).toFixed(1) : 'N/A';
  const answerableAccuracy = answerableCount > 0 ? ((correctAnsweredCount / answerableCount) * 100).toFixed(1) : 'N/A';
  const citationValidityRate = totalCitationsEvaluated > 0 ? ((validCitationsCount / totalCitationsEvaluated) * 100).toFixed(1) : '100.0';

  console.log('\n' + '='.repeat(70));
  console.log('📊 BENCHMARK EVALUATION RESULTS');
  console.log('='.repeat(70));
  console.log(`Total Questions Evaluated       : ${dataset.length}`);
  console.log(`Answerable Questions            : ${answerableCount}`);
  console.log(`Unanswerable / Adversarial      : ${unanswerableCount}`);
  console.log('-'.repeat(70));
  console.log(`Hit@1 Retrieval Rate            : ${hit1Rate}% (${hitsAt1}/${answerableCount})`);
  console.log(`Hit@3 Retrieval Rate            : ${hit3Rate}% (${hitsAt3}/${answerableCount})`);
  console.log(`Hit@5 Retrieval Rate (Target ≥85%) : ${hit5Rate}% (${hitsAt5}/${answerableCount})`);
  if (!options.noLLM) {
    console.log('-'.repeat(70));
    console.log(`Answerable Success Rate         : ${answerableAccuracy}% (${correctAnsweredCount}/${answerableCount})`);
    console.log(`Fallback Precision (Target ≥90%): ${fallbackPrecision}% (${correctFallbackCount}/${unanswerableCount})`);
    console.log(`Citation Validity (Target 100%) : ${citationValidityRate}%`);
  }
  console.log('-'.repeat(70));
  console.log(`Median Latency                  : ${medianLatency}ms`);
  console.log(`P95 Latency                     : ${p95Latency}ms`);
  console.log(`Average Latency                 : ${avgLatency}ms`);
  console.log('='.repeat(70));

  // Save run artifact to evaluation/results/
  await fs.mkdir(options.resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runFilePath = path.join(options.resultsDir, `eval-${timestamp}.json`);
  const runPayload = {
    evaluatedAt: new Date().toISOString(),
    mode: options.noLLM ? 'retrieval_only' : 'full_rag',
    totalQuestions: dataset.length,
    metrics: {
      hitAt1Rate: `${hit1Rate}%`,
      hitAt3Rate: `${hit3Rate}%`,
      hitAt5Rate: `${hit5Rate}%`,
      fallbackPrecision: `${fallbackPrecision}%`,
      answerableAccuracy: `${answerableAccuracy}%`,
      citationValidityRate: `${citationValidityRate}%`,
      medianLatencyMs: medianLatency,
      p95LatencyMs: p95Latency,
      avgLatencyMs: avgLatency,
    },
    results,
  };

  await fs.writeFile(runFilePath, JSON.stringify(runPayload, null, 2), 'utf-8');
  console.log(`\nDetailed results saved to: ${runFilePath}\n`);
}

main().catch((err) => {
  console.error('\nEvaluation harness failed:', err);
  process.exit(1);
});
