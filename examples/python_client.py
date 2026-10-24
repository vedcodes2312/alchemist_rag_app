#!/usr/bin/env python3
"""
The Alchemist AI — Python Client Example
Demonstrates how to interact with the local Alchemist RAG API using standard requests.
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3001"

def api_post(endpoint: str, data: dict) -> dict:
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        return {"error": e.code, "detail": json.loads(error_body) if error_body else str(e)}

def api_get(endpoint: str) -> dict:
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=" * 60)
    print("       THE ALCHEMIST AI — PYTHON CLIENT DEMO")
    print("=" * 60)

    # 1. Check Service Health
    print("\n1. Checking API Health...")
    try:
        health = api_get("/api/health")
        print(f"   Status: {health.get('status')} | Service: {health.get('service')}")
    except Exception as e:
        print(f"   [!] Could not connect to {BASE_URL}. Ensure the backend is running.")
        sys.exit(1)

    # 2. Check Book Index Info
    print("\n2. Checking Book Index Status...")
    book = api_get("/api/book/info")
    book_data = book.get("data", {})
    print(f"   Title: {book_data.get('title')} | Indexed Chunks: {book_data.get('chunkCount')}")

    # 3. Ask a Grounded Question
    question = "What is a Personal Legend according to Melchizedek?"
    print(f"\n3. Submitting Question: '{question}'...")
    response = api_post("/api/chat", {"question": question})
    data = response.get("data", {})

    print(f"   RAG Status: {data.get('status')} (Grounding: {data.get('groundingScore')})")
    print(f"\nAnswer:\n{data.get('answer')}\n")

    citations = data.get("citations", [])
    if citations:
        print(f"Citations ({len(citations)}):")
        for idx, cit in enumerate(citations, 1):
            print(f"  [{idx}] \"{cit.get('quote')}\" ({cit.get('chapter', 'The Alchemist')})")

    # 4. Out-of-Domain Guardrail Test
    ood_question = "How do I build a nuclear submarine?"
    print(f"\n4. Guardrail Test (Out-of-Domain): '{ood_question}'...")
    ood_response = api_post("/api/chat", {"question": ood_question})
    ood_data = ood_response.get("data", {})
    print(f"   RAG Status: {ood_data.get('status')}")
    print(f"   Refusal: {ood_data.get('answer')}")

    print("\n" + "=" * 60)
    print("Demo completed! Visit http://localhost:3001/demo for the UI Playground.")
    print("=" * 60)

if __name__ == "__main__":
    main()
