import { getCollection, getEntry } from "astro:content";
import { applyThemeToCss } from '../../../utils/themes/apply-theme';

export async function getStaticPaths() {
  const entries = await getCollection('themes');
  
  return entries.map((e) => {
    return { params: { slug: e.id } };
  });
}

export async function GET({ params }: { params: { slug: string } }) {
  try {
    const entry = await getEntry('themes', params.slug);
    if (!entry) {
      return new Response('Not found', { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const generated = applyThemeToCss({ currentMode: entry.data.mode, styles: entry.data.styles });

    const registryItem = generated;
    return new Response(registryItem, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/css',
      },
    });
  } catch (e) {
    console.error('Error fetching the theme registry item:', e);
    return new Response('Failed to fetch the theme registry item.', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}