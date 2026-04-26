// components/auth/withAuth.tsx
'use client';

import React from 'react';
import RequireAuth from './RequireAuth';
import NavBar from '@/components/main-nav';

type WithAuthOptions = {
  roles?: string[];
  redirectTo?: string;
  showNavBar?: boolean;
  loadingComponent?: React.ComponentType;
};

// Default loading component that matches your site's style
function DefaultPageSkeleton() {
  return (
    <div className="space-y-8 px-4 md:px-0">
      <NavBar />
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    roles = ['admin', 'member'],
    redirectTo = '/login',
    loadingComponent: LoadingComponent = DefaultPageSkeleton,
  } = options;

  function AuthenticatedComponent(props: P) {
    return (
      <RequireAuth
        roles={roles}
        hardRedirect={true}
        redirectTo={redirectTo}
        Fallback={LoadingComponent}
      >
        <Component {...props} />
      </RequireAuth>
    ); 
  }

  // Set display name for debugging
  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;

  return AuthenticatedComponent;
}