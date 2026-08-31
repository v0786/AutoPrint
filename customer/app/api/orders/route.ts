export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const merchantBaseUrl = process.env.MERCHANT_API_BASE_URL || 'http://localhost:4100';

  try {
    const response = await fetch(`${merchantBaseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid merchant response' }));

    if (!response.ok) {
      return Response.json({ ok: false, error: payload.error || 'Merchant rejected the order' }, { status: 400 });
    }

    return Response.json({ ok: true, ...payload }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Could not reach merchant API',
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  const merchantBaseUrl = process.env.MERCHANT_API_BASE_URL || 'http://localhost:4100';

  try {
    const response = await fetch(`${merchantBaseUrl}/api/orders`);
    const payload = await response.json().catch(() => ({ ok: false, orders: [] }));
    return Response.json(payload, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Merchant unavailable' }, { status: 502 });
  }
}
