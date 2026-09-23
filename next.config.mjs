/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // El dominio curso.rogapps.com sirve el formulario del curso en su raíz.
      {
        source: '/',
        has: [{ type: 'host', value: 'curso.rogapps.com' }],
        destination: '/curso-ingles',
      },
    ]
  },
}

export default nextConfig;
