import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['es'],
  defaultLocale: 'es'
});
 
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};