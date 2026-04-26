import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import RequireAuth from './RequireAuth';

type WithAuthOptions = {
  roles?: string[];
  redirectTo?: string;
  loadingComponent?: React.ComponentType;
};

function DefaultPageSkeleton() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#1a4725" />
    </View>
  );
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    roles = ['admin', 'member'],
    redirectTo = 'Login',
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

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  return AuthenticatedComponent;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
