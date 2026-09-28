import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/permissions';
import type { ActionType } from '../../utils/permissions';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  moduleId?: string;
  action?: ActionType;
}

export function ProtectedRoute({ children, allowedRoles, moduleId, action = 'view' }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (moduleId && !hasPermission(user, moduleId, action)) {
    toast.error('Access Denied: You do not have permission to access this page.');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
