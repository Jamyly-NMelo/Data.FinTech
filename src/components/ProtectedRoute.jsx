import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function ProtectedRoute({ unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" role="status" aria-label="Verificando sessão">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }
  if (!isAuthenticated) return unauthenticatedElement || <Navigate to="/login" replace />;
  return <Outlet />;
}
