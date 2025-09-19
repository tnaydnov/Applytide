// Centralized route configuration
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register', 
  '/auth/reset',
  '/auth/verify',
  '/privacy',
  '/terms',
  '/about',
  '/cookie-policy',
  '/copyright-policy',
  '/pricing'
];

// Helper function to check if a route is public
export const isPublicRoute = (pathname) => {
  return PUBLIC_ROUTES.includes(pathname);
};

// Helper function to check if a URL/resource is public
export const isPublicResource = (resource) => {
  return PUBLIC_ROUTES.some(route => resource.includes(route)) ||
         resource.includes('/auth/refresh') ||
         resource.includes('/auth/login');
};