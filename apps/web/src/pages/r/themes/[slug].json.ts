import { getCollection, getEntry } from "astro:content";
import { generateThemeRegistryItemFromStyles } from "../../../utils/registry/themes";
import { registryItemSchema } from "shadcn/schema"

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

    const generated = generateThemeRegistryItemFromStyles(params.slug, entry.data.styles as any);

    const parsed =registryItemSchema.safeParse(generated);
    if (!parsed.success) {
      console.error('Could not parse the registry item from the data:', parsed.error.format());
      return new Response('Unexpected registry item format.', {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const registryItem = parsed.data;
    return new Response(JSON.stringify(registryItem), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
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