// Vercel Serverless Function: GET /api/providers
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    groq: false,
    openrouter: true,
    openai: false,
    gemini: false,
    activeProvider: 'openrouter',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'WormGPT 4o (Llama 3.3 70B)', provider: 'openrouter', isCloud: true, description: 'Mô hình lập trình mạnh mẽ nhất, nhanh & chuẩn xác' },
      { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax 13B (Uncensored)', provider: 'openrouter', isCloud: true, description: 'Không kiểm duyệt, tự do tối đa mọi chủ đề' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Coding Beast)', provider: 'openrouter', isCloud: true, description: 'Chuyên gia thuật toán, giải thuật và code phức tạp' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Cloud)', provider: 'openai', isCloud: true, description: 'Nhanh nhẹn, tối ưu' }
    ]
  });
}
