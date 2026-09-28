export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'import' | 'export' | 'print';

export const hasPermission = (user: any, moduleId: string, action: ActionType): boolean => {
  if (!user) return false;

  // Super Admin has all permissions
  if (user?.role === 'SUPER_ADMIN') return true;

  // If no permissions array is available, deny access for security
  if (!user?.permissions || !Array.isArray(user.permissions)) return false;

  const perm = user.permissions.find((p: any) => p.moduleId === moduleId);
  
  // If the user has no permissions entry for this module, deny access
  if (!perm) return false;

  switch (action) {
    case 'view': return !!perm.canView;
    case 'create': return !!perm.canCreate;
    case 'edit': return !!perm.canEdit;
    case 'delete': return !!perm.canDelete;
    case 'import': return !!perm.canImport;
    case 'export': return !!perm.canExport;
    case 'print': return !!perm.canPrint;
    default: return false;
  }
};
