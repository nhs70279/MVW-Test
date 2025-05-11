import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'No address provided' });
  }
  const apiUrl = `https://blockstream.info/api/address/${address}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: await response.text() });
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Internal Error' });
  }
} 