import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import App from '../App.jsx';

// Mock global fetch for getBookInfo
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ indexReady: false, chunkCount: 0 }),
    headers: { get: () => 'req-123' },
  })
);

describe('Alchemist AI Frontend App', () => {
  it('renders brand header, welcome title, and book grounding note', () => {
    render(<App />);

    expect(screen.getByText('Alchemist AI')).toBeInTheDocument();
    expect(screen.getByText(/Explore/i)).toBeInTheDocument();
    expect(screen.getAllByText(/The Alchemist/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Grounded strictly in book text/i)).toBeInTheDocument();
  });

  it('renders suggested questions on welcome screen', () => {
    render(<App />);

    expect(screen.getByText(/Who is Melchizedek/i)).toBeInTheDocument();
    expect(screen.getByText(/Personal Legend/i)).toBeInTheDocument();
    expect(screen.getByText(/desert symbolize/i)).toBeInTheDocument();
  });

  it('keeps send button disabled when input is empty', () => {
    render(<App />);

    const sendButton = screen.getByRole('button', { name: /Send question/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when text is entered', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByPlaceholderText(/Ask about Santiago, the desert, omens/i);
    const sendButton = screen.getByRole('button', { name: /Send question/i });

    expect(sendButton).toBeDisabled();
    await user.type(input, 'Who is the Alchemist?');
    expect(sendButton).toBeEnabled();
  });
});
