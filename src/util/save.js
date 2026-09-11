/**
 * Handing a finished file to the user.
 *
 * Served as an ordinary page, a link with `download` is all it takes. Inside
 * a hosted viewer that link is inert — the frame is not allowed to start a
 * download — so the host is asked to offer the file instead, and the viewer
 * can decline.
 */
let downloadsPromise = null;

function hostDownloads() {
  if (!downloadsPromise) {
    downloadsPromise = window.claude?.use
      ? window.claude.use('downloads').catch(() => null)
      : Promise.resolve(null);
  }
  return downloadsPromise;
}

export function canvasToBlob(canvas, format, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('could not encode the canvas'))),
      format,
      quality
    );
  });
}

export async function saveBlob(blob, filename) {
  const downloads = await hostDownloads();
  if (downloads) {
    await downloads.save({ filename, data: blob });
    return;
  }
  if (window.claude) {
    // Hosted, but this view cannot save files. The link below would fail
    // silently, so report it rather than pretending the export worked.
    throw Object.assign(new Error('saving is unavailable in this view'), {
      code: 'unavailable'
    });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 400);
}
