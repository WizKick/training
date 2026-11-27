module.exports = function(req, res) {
  res.setHeader('Cache-Control','no-store');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !key.startsWith('sb_publishable_')) return res.status(503).json({configured:false});
  return res.status(200).json({url, key});
};