// ?shot= support for Vice Coast Cover Studio.
// Lets a screenshot run (or a shared link) open the app straight into a state:
//   ?shot=cover&layout=hero3&grade=sunset&photo=pier&title=VICE%20COAST
//   ?shot=editor&layout=grid9&grade=neon&photo=both
//   ?shot=export&layout=tilted&grade=golden&size=1080x1350
// `photo` picks which bundled sample(s) to load: pier, boulevard, or both.
// `size` sets the export canvas in shot=cover / shot=export mode.
// Nothing here needs the network: samples are files under app/samples/.

export function shotConfig() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  const size = (q.get('size') || '1080x1080').split('x').map((n) => parseInt(n, 10));
  const W = Number.isFinite(size[0]) && size[0] > 0 ? size[0] : 1080;
  const H = Number.isFinite(size[1]) && size[1] > 0 ? size[1] : 1080;
  return {
    mode: shot, // 'cover' | 'editor' | 'export'
    layout: q.get('layout') || 'hero3',
    grade: q.get('grade') || 'sunset',
    photo: q.get('photo') || 'both',
    title: q.get('title') || undefined,
    subtitle: q.get('subtitle') || undefined,
    heat: q.get('heat') ? parseInt(q.get('heat'), 10) : undefined,
    strength: q.get('strength') ? parseInt(q.get('strength'), 10) : undefined,
    size: { W, H },
  };
}

export function sampleUrls(photo) {
  if (photo === 'pier') return ['samples/pier.jpg'];
  if (photo === 'boulevard') return ['samples/boulevard.jpg'];
  return ['samples/pier.jpg', 'samples/boulevard.jpg'];
}
