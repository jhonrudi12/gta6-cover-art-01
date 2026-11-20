// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo
// loaded; ?shot=cover hides the controls and shows the cover alone, at the size
// named by ?size=. `photo` picks the sample (samples/<photo>.jpg), `caption` the
// words, `layout` and `grade` the look. window.__shotReady is set once painted.

/** Runs one shot scene, calling `load` with the sample URL and caption. */
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Vice Coast';
  await load(`samples/${photo}.jpg`, caption);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
