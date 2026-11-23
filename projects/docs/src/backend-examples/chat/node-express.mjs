// server.mjs — Node.js 22+, Express 5, SDK officiel Anthropic (@anthropic-ai/sdk).
// La clé est lue dans ANTHROPIC_API_KEY (variable d'environnement du serveur) : jamais envoyée au navigateur.
import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import express from 'express';

const anthropic = new Anthropic();

/** Consignes de l'assistant : définies côté serveur, jamais reçues du navigateur. */
const SYSTEM_PROMPT = `Tu es l'assistant du site. Réponds en français, de façon concise et exacte.
Mets en forme avec du Markdown simple (listes, tableaux, blocs de code). Si tu ne sais pas, dis-le.`;

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;
const MAX_TOTAL_CHARS = 60000;
const RATE = { limit: 10, windowMs: 60_000 }; // 10 demandes par minute et par utilisateur

const app = express();
app.disable('x-powered-by');

/** À brancher sur votre authentification (session HttpOnly). Renvoie l'id de l'utilisateur ou null. */
function currentUserId(req) {
  return req.session?.userId ?? null;
}

function requireUser(req, res, next) {
  const userId = currentUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentification requise.' });
  req.userId = String(userId);
  next();
}

function cookie(req, name) {
  const match = (req.headers.cookie ?? '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

/** CSRF « double submit » compatible Angular : cookie XSRF-TOKEN = en-tête X-XSRF-TOKEN. */
function csrf(req, res, next) {
  if (!cookie(req, 'XSRF-TOKEN')) {
    res.cookie('XSRF-TOKEN', crypto.randomBytes(32).toString('base64url'), { sameSite: 'strict', secure: req.secure, path: '/' });
  }
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = Buffer.from(cookie(req, 'XSRF-TOKEN'));
  const received = Buffer.from(String(req.get('X-XSRF-TOKEN') ?? ''));
  if (!expected.length || expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return res.status(403).json({ error: 'Jeton CSRF invalide.' });
  }
  next();
}

/** Limite de débit en mémoire (une instance) ; avec plusieurs instances, utilisez Redis. */
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const recent = (hits.get(req.userId) ?? []).filter((t) => now - t < RATE.windowMs);
  if (recent.length >= RATE.limit) {
    res.set('Retry-After', String(Math.ceil((RATE.windowMs - (now - recent[0])) / 1000)));
    return res.status(429).json({ error: 'Trop de demandes : réessayez dans un instant.' });
  }
  recent.push(now);
  hits.set(req.userId, recent);
  next();
}

/** Historique reçu : alternance utilisateur / assistant, commence et finit par l'utilisateur, tailles bornées. */
function validateMessages(body) {
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return { error: `messages : 1 à ${MAX_MESSAGES} messages.` };
  }
  let total = 0;
  const clean = [];
  for (const [i, m] of messages.entries()) {
    const expected = i % 2 === 0 ? 'user' : 'assistant';
    if (!m || typeof m !== 'object' || m.role !== expected) return { error: `messages[${i}].role : « ${expected} » attendu (alternance).` };
    if (typeof m.content !== 'string' || !m.content.trim() || m.content.length > MAX_MESSAGE_CHARS) {
      return { error: `messages[${i}].content : texte de 1 à ${MAX_MESSAGE_CHARS} caractères.` };
    }
    total += m.content.length;
    clean.push({ role: m.role, content: m.content }); // champs connus uniquement
  }
  if (clean.at(-1).role !== 'user') return { error: 'Le dernier message doit venir de l’utilisateur.' };
  if (total > MAX_TOTAL_CHARS) return { error: 'Conversation trop longue : commencez-en une nouvelle.' };
  return { messages: clean };
}

// Cookie CSRF posé dès la première requête /api (ex. GET /api/me au démarrage de l'application).
app.use('/api', csrf);

app.post('/api/chat', requireUser, express.json({ limit: '256kb', type: 'application/json' }), rateLimit, async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'JSON attendu.' });
  const { messages, error } = validateMessages(req.body);
  if (error) return res.status(422).json({ error });

  // Réponse en flux NDJSON : une ligne JSON par morceau ({"text":…}), {"error":…} en cas de problème.
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no', // Nginx : ne pas mettre le flux en tampon
    'X-Content-Type-Options': 'nosniff',
  });
  const send = (line) => res.write(JSON.stringify(line) + '\n');

  const stream = anthropic.beta.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 8192, // plafond de coût par réponse ; à relever pour des réponses longues
    system: SYSTEM_PROMPT,
    messages,
    output_config: { effort: 'medium' }, // « low » suffit souvent pour une discussion simple
    // Si le modèle décline une demande pour raison de politique, l'API la rejoue sur le modèle de repli prévu.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  // Bouton « Arrêter » ou onglet fermé : la requête à l'API est annulée (plus de jetons facturés).
  res.on('close', () => {
    if (!res.writableEnded) stream.abort();
  });

  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') send({ text: event.delta.text });
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') send({ error: 'L’assistant ne peut pas répondre à cette demande.' });
    else if (final.stop_reason === 'max_tokens') send({ error: 'Réponse tronquée : longueur maximale atteinte.' });
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError) return; // annulé par le client
    if (err instanceof Anthropic.RateLimitError) send({ error: 'Le service d’IA est saturé : réessayez dans un instant.' });
    else if (err instanceof Anthropic.APIConnectionError) send({ error: 'Le service d’IA est injoignable.' });
    else if (err instanceof Anthropic.APIError) send({ error: 'Le service d’IA a renvoyé une erreur.' });
    else send({ error: 'Erreur inattendue.' });
    console.error('chat:', err?.status ?? '', err?.message); // détail côté serveur uniquement
  }
  res.end();
});

// Corps illisible : JSON mal formé → 400, trop gros → 413 (sans détail interne).
app.use((err, _req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Conversation trop volumineuse.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide.' });
  next(err);
});

app.listen(3000, () => console.log('API sur http://localhost:3000'));
