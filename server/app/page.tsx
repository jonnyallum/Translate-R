// server/app/page.tsx
// Root page — serves as a health check for the API

export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>Translate-R API</h1>
      <p>Backend is running. Available endpoints:</p>
      <ul>
        <li><code>POST /api/calls</code> — Create a call</li>
        <li><code>POST /api/calls/join</code> — Join a call</li>
        <li><code>POST /api/calls/end</code> — End a call</li>
        <li><code>POST /api/utterances</code> — Create an utterance</li>
        <li><code>GET /api/utterances?call_id=xxx</code> — List utterances</li>
        <li><code>GET /api/subscription</code> — Get subscription status + pricing</li>
        <li><code>POST /api/stripe/checkout</code> — Create Stripe Checkout session</li>
        <li><code>POST /api/stripe/portal</code> — Open Stripe billing portal</li>
        <li><code>POST /api/stripe/webhook</code> — Stripe webhook handler</li>
      </ul>
    </main>
  );
}
