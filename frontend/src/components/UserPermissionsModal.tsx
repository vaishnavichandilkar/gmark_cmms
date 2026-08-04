import React, { useState, useEffect } from 'react';
import { X, Shield, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const availableModules = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'assets', name: 'All Assets' },
  { id: 'master_employee', name: 'Master - Employee' },
  { id: 'master_main_facility', name: 'Master - Facility' },
  { id: 'manage_access', name: 'Manage Access' },
  { id: 'user_management', name: 'User Management' },
  { id: 'facility_management', name: 'Facility Management' },
  { id: 'machine_management', name: 'Machine Management' },
];

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
  userName: string;
}

export function UserPermissionsModal({ isOpen, onClose, userId, userName }: UserPermissionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(
    availableModules.reduce((acc, mod) => {
      acc[mod.id] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
      return acc;
    }, {} as Record<string, Record<string, boolean>>)
  );

  useEffect(() => {
    if (!isOpen || !userId) return;
    
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        // Fetch user to get their designation
        const userRes = await api.get(`/users/${userId}`);
        const designationName = userRes.data.employee?.designation;

        let basePermissions: any[] = [];
        if (designationName) {
          // Find designation to get base permissions
          const desigRes = await api.get('/designations');
          const designation = desigRes.data.find((d: any) => d.name === designationName);
          if (designation && designation.id) {
            const desigDetailRes = await api.get(`/designations/${designation.id}`);
            basePermissions = desigDetailRes.data.permissions || [];
          }
        }

        // Fetch user-specific overrides
        const overrideRes = await api.get(`/users/${userId}/permissions`);
        const userOverrides = overrideRes.data || [];

        // Merge them: Start with base, then overwrite with overrides
        let merged: any[] = [...basePermissions];
        userOverrides.forEach((up: any) => {
          const index = merged.findIndex(p => p.moduleId === up.moduleId);
          if (index >= 0) {
            merged[index] = { ...merged[index], ...up };
          } else {
            merged.push(up);
          }
        });

        // Set state
        setPermissions(prev => {
          const next = { ...prev };
          merged.forEach((p: any) => {
            if (next[p.moduleId]) {
              next[p.moduleId] = {
                view: p.canView || false,
                create: p.canCreate || false,
                edit: p.canEdit || false,
                delete: p.canDelete || false,
                import: p.canImport || false,
                export: p.canExport || false,
                print: p.canPrint || false
              };
            }
          });
          return next;
        });

      } catch (err) {
        console.error('Failed to fetch permissions', err);
        toast.error('Failed to load user permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handlePermissionChange = (moduleId: string, action: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [action]: checked
      }
    }));
  };

  const handleSelectAllRow = (moduleId: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: { view: checked, create: checked, edit: checked, delete: checked, import: checked, export: checked, print: checked }
    }));
  };

  const isRowAllSelected = (moduleId: string) => {
    const p = permissions[moduleId];
    return p.view && p.create && p.edit && p.delete && p.import && p.export && p.print;
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const payloadPermissions = Object.entries(permissions).map(([moduleId, perms]) => ({
        moduleId,
        canView: perms.view,
        canCreate: perms.create,
        canEdit: perms.edit,
        canDelete: perms.delete,
        canImport: perms.import,
        canExport: perms.export,
        canPrint: perms.print,
      }));

      await api.put(`/users/${userId}/permissions`, payloadPermissions);
      toast.success('User permissions updated successfully!');
      onClose();
    } catch (err) {
      console.error('Failed to save permissions', err);
      toast.error('Failed to save permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Special Permissions</h2>
              <p className="text-sm text-gray-500">Managing overrides for {userName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">Module</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">View</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Create</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Edit</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Delete</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Import</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Export</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Print</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center border-l border-gray-200">Select All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {availableModules.map((mod) => (
                    <tr key={mod.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{mod.name}</td>
                      
                      {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                        <td key={action} className="px-6 py-4 text-center">
                          <input 
                            type="checkbox"
                            checked={permissions[mod.id][action]}
                            onChange={(e) => handlePermissionChange(mod.id, action, e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>
                      ))}

                      <td className="px-6 py-4 text-center border-l border-gray-200 bg-gray-50/30">
                        <input 
                          type="checkbox"
                          checked={isRowAllSelected(mod.id)}
                          onChange={(e) => handleSelectAllRow(mod.id, e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}
