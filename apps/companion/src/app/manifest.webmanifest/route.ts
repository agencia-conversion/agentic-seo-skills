export const runtime = 'edge';

export function GET() {
  return Response.json({
    name: 'agentic seo',
    short_name: 'agentic seo',
    description: 'Companion local do agentic seo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3a5bd9',
    icons: [
      { src: '/brand/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  });
}
