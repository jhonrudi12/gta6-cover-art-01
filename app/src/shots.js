// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover shows the exported cover full-frame with no controls.
// `photo` picks the sample, `caption` the title, `layout`, `grade` and `size`
// make each scene deterministic. window.__shotReady is set once painted.
export async function runShot(shot, query, helpers) {
  const photo = query.get('photo') || 'boulevard';
  const caption = query.get('caption') || 'Vice Coast';
  const layout = query.get('layout') || (shot === 'cover' ? 'grid9' : 'hero3');
  const grade = query.get('grade') || 'sunset';
  const size = query.get('size') || (shot === 'cover' ? '1920x1080' : '1080x1080');
  const subtitle = query.get('subtitle') || 'one last sunset heist';

  if (shot === 'cover') document.body.classList.add('shot-cover');

  helpers.applyScene({ layout, grade, title: caption, subtitle, size });
  await helpers.loadSamples(photo);
  helpers.renderNow();

  // Two frames so the canvas paint lands, then signal readiness.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
