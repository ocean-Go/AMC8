export async function GET() {
  return Response.json({
    minimaxConfigured: Boolean(process.env.MINIMAX_API_KEY),
  });
}
