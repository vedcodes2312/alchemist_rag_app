/**
 * The Alchemist AI — Node.js Client Example
 * Demonstrates consuming the local Alchemist RAG API using native fetch (Node 18+).
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function main() {
  console.log('='.repeat(65));
  console.log('       THE ALCHEMIST AI — NODE.JS CLIENT DEMO');
  console.log('='.repeat(65));

  // 1. Health check
  console.log('\n1. Checking API Health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  console.log(`   Status: ${health.status} (Service: ${health.service})`);

  // 2. Book Info
  console.log('\n2. Retrieving Book Metadata...');
  const bookRes = await fetch(`${BASE_URL}/api/book/info`);
  const book = await bookRes.json();
  console.log(`   Book: ${book.data?.title} (${book.data?.chunkCount} chunks ready)`);

  // 3. Grounded Question
  const question = 'Who is the crystal merchant and what is his lifelong dream?';
  console.log(`\n3. Asking Question: "${question}"...`);
  const chatRes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  const chatData = await chatRes.json();

  if (chatData.success && chatData.data) {
    const { status, answer, groundingScore, citations } = chatData.data;
    console.log(`   RAG Status: ${status} (Grounding Score: ${groundingScore})`);
    console.log(`\nAnswer:\n${answer}\n`);

    if (citations && citations.length > 0) {
      console.log(`Citations (${citations.length}):`);
      citations.forEach((cit, i) => {
        console.log(`  [${i + 1}] "${cit.quote}" (${cit.chapter || 'The Alchemist'})`);
      });
    }
  }

  // 4. Fallback guardrail demonstration
  const oodQuestion = 'What is the stock price of Apple Inc. today?';
  console.log(`\n4. Testing Guardrail Fallback: "${oodQuestion}"...`);
  const oodRes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: oodQuestion }),
  });
  const oodData = await oodRes.json();
  console.log(`   RAG Status: ${oodData.data?.status}`);
  console.log(`   Refusal: ${oodData.data?.answer}`);

  console.log('\n' + '='.repeat(65));
  console.log('Finished! Check out the Interactive UI Demo at http://localhost:3001/demo');
  console.log('='.repeat(65));
}

main().catch((err) => {
  console.error('[!] Client error:', err.message);
  process.exit(1);
});
