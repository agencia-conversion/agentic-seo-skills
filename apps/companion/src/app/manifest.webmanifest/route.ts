export const runtime = 'edge';

export function GET() {
  return Response.json({
    name: 'Noteblock',
    short_name: 'Noteblock',
    description: 'Local-first BYOK-AI workspace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#37352f',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  });
}
