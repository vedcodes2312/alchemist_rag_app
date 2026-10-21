#!/usr/bin/env node
import path from 'node:path';
import { runIngestion } from '../src/services/ingestion/indexer.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    filePath: 'data/source/the-alchemist.txt',
    title: 'The Alchemist',
    slug: 'the-alchemist',
    author: 'Paulo Coelho',
    dryRun: false,
    reset: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' && args[i + 1]) {
      options.filePath = args[++i];
    } else if (arg === '--title' && args[i + 1]) {
      options.title = args[++i];
    } else if (arg === '--slug' && args[i + 1]) {
      options.slug = args[++i];
    } else if (arg === '--author' && args[i + 1]) {
      options.author = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--reset') {
      options.reset = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Alchemist AI — Document Ingestion CLI

Usage:
  node scripts/ingest.js [options]
  npm run ingest -- [options]

Options:
  --file <path>       Path to plain-text source file (default: data/source/the-alchemist.txt)
  --title <title>     Book display title (default: "The Alchemist")
  --slug <slug>       Document unique slug (default: "the-alchemist")
  --author <author>   Book author (default: "Paulo Coelho")
  --dry-run           Chunk and report statistics without writing to database or calling embedding
  --reset             Re-index and replace existing document index
  --help, -h          Show this help message
`);
      process.exit(0);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log('='.repeat(60));
  console.log('📖 Alchemist AI — Ingestion Pipeline');
  console.log('='.repeat(60));
  console.log(`Source File : ${options.filePath}`);
  console.log(`Title       : ${options.title}`);
  console.log(`Slug        : ${options.slug}`);
  console.log(`Author      : ${options.author}`);
  console.log(`Mode        : ${options.dryRun ? 'DRY RUN (no DB writes)' : 'LIVE INGESTION'}`);
  console.log('='.repeat(60));

  let lastLine = '';
  const onProgress = (info) => {
    const pct = Math.round((info.currentChunk / info.totalChunks) * 100);
    const line = `[${info.phase.toUpperCase()}] Batch ${info.batchIndex}/${info.totalBatches} (${info.currentChunk}/${info.totalChunks} chunks - ${pct}%)`;
    if (line !== lastLine) {
      process.stdout.write(`\r${line}`);
      lastLine = line;
    }
  };

  try {
    const summary = await runIngestion({
      ...options,
      onProgress,
    });

    if (!options.dryRun) {
      process.stdout.write('\n');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Ingestion Completed Successfully');
    console.log('='.repeat(60));
    console.log(`Document Slug    : ${summary.slug}`);
    console.log(`Document Title   : ${summary.title}`);
    console.log(`Sections Parsed  : ${summary.sectionsCount}`);
    console.log(`Total Chunks     : ${summary.chunksCount}`);
    console.log(`Source SHA-256   : ${summary.sourceSha256}`);
    console.log(`Token Stats:`);
    console.log(`  - Total Tokens : ${summary.tokenStats.totalTokens.toLocaleString()}`);
    console.log(`  - Average      : ${summary.tokenStats.avgTokens} tokens/chunk`);
    console.log(`  - Minimum      : ${summary.tokenStats.minTokens} tokens`);
    console.log(`  - Maximum      : ${summary.tokenStats.maxTokens} tokens`);
    console.log(`Duration         : ${(summary.durationMs / 1000).toFixed(2)}s`);
    console.log('='.repeat(60));
    process.exit(0);
  } catch (err) {
    process.stdout.write('\n');
    console.error('\n' + '='.repeat(60));
    console.error('❌ Ingestion Failed');
    console.error('='.repeat(60));
    console.error(`Error: ${err.message}`);
    if (err.cause) {
      console.error(`Cause: ${err.cause.message || err.cause}`);
    }
    console.error('='.repeat(60));
    process.exit(1);
  }
}

main();
