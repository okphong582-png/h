// Vercel Serverless Function: POST /api/project/download-zip
import AdmZip from 'adm-zip';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const { files, projectName } = body;
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array required' });
    }

    const zip = new AdmZip();
    for (const f of files) {
      if (f && (f.path || f.name) && typeof f.content === 'string') {
        const filePath = (f.path || f.name).replace(/^[/\\]+/, '');
        zip.addFile(filePath, Buffer.from(f.content, 'utf8'));
      }
    }

    const zipBuffer = zip.toBuffer();
    const name = (projectName || 'vibe-code-project').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.status(200).send(zipBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
