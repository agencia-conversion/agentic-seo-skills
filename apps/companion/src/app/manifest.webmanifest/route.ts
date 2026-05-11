export const runtime = 'edge';

export function GET() {
  return Response.json({
    name: 'SEO Brain',
    short_name: 'SEO Brain',
    description: 'Companion local do SEO Brain.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#37352f',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  });
}
