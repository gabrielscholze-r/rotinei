import { FeedbackPayload } from './types';

const CLOUDFLARE_WEBHOOK_URL = process.env.EXPO_PUBLIC_CLOUDFLARE_WEBHOOK_URL ?? '';
const CLOUDFLARE_API_KEY = process.env.EXPO_PUBLIC_CLOUDFLARE_API_KEY ?? '';

const MOCK = false; // set to false to enable real integration

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  if (MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return;
  }

  if (!CLOUDFLARE_WEBHOOK_URL) {
    throw new Error('EXPO_PUBLIC_CLOUDFLARE_WEBHOOK_URL não configurada no .env');
  }

  console.log('[feedback] URL:', CLOUDFLARE_WEBHOOK_URL);
  console.log('[feedback] payload:', JSON.stringify(payload));

  let response: Response;
  try {
    response = await fetch(CLOUDFLARE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLOUDFLARE_API_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[feedback] fetch error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Erro de rede: ${msg}`);
  }

  console.log('[feedback] status:', response.status);
  const body = await response.text();
  console.log('[feedback] response body:', body);

  if (!response.ok) {
    throw new Error(`Webhook retornou ${response.status}: ${body}`);
  }
}

export function formatFeedbackDescription(screen: string, description: string): string {
  return `Tela que ocorreu: ${screen}\n\nDescrição:\n${description}`;
}
