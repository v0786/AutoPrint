export async function GET() {
  return Response.json({ ok: true, service: 'qrprint-customer', timestamp: new Date().toISOString() });
}
