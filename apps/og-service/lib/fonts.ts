export async function loadGoogleFont(
  font: string,
  text: string,
  weight = 500,
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}&text=${encodeURIComponent(
    text,
  )}`;
  const cssResponse = await fetch(url);

  if (!cssResponse.ok) {
    throw new Error("failed to load font css");
  }

  const css = await cssResponse.text();
  const resource = css.match(
    /src: url\((https:[^)]+)\) format\('(woff2|opentype|truetype)'\)/,
  );

  if (resource) {
    const response = await fetch(resource[1]);
    if (response.ok) {
      return response.arrayBuffer();
    }
  }

  throw new Error("failed to load font data");
}

