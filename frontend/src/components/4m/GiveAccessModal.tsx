import { useState, useEffect, useMemo } from 'react';
import { X, Shield, Search, CheckCircle2, User, Users, Check, Loader2, Sparkles, AlertCircle, Cpu, Building, Building2, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export interface GiveAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'facility' | 'machine' | 'mainFacility';
  targetId: number | string;
  targetName: string;
  targetCode?: string;
  targetCategory?: string;
  onSuccess?: () => void;
}

interface UserItem {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  designation?: string;
  employeeId?: number;
  employee?: {
    id: number;
    fullName: string;
    employeeCode?: string;
    department?: string;
  };
}

export function GiveAccessModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  targetCode,
  targetCategory,
  onSuccess,
}: GiveAccessModalProps) {
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [initialAssignedIds, setInitialAssignedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [childMachines, setChildMachines] = useState<any[]>([]);
  const [childFacilities, setChildFacilities] = useState<any[]>([]);
  const [isAssetsPreviewExpanded, setIsAssetsPreviewExpanded] = useState(true);

  useEffect(() => {
    if (!isOpen || !targetId) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const baseEndpoint = targetType === 'mainFacility' ? 'main-facilities' : targetType === 'facility' ? 'facilities' : 'machines';
        const [usersRes, assignedRes, machinesRes, facilitiesRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: [] })),
          api.get(`/${baseEndpoint}/${targetId}/users`).catch(() => ({ data: [] })),
          (targetType === 'facility' || targetType === 'mainFacility') ? api.get('/machines?includeAll=true').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          (targetType === 'facility' || targetType === 'mainFacility') ? api.get('/facilities?includeAll=true').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ]);

        if (!isMounted) return;

        const usersList: UserItem[] = Array.isArray(usersRes.data) ? usersRes.data : [];
        const assignedList: UserItem[] = Array.isArray(assignedRes.data) ? assignedRes.data : [];
        const rawMacs: any[] = Array.isArray(machinesRes.data) ? machinesRes.data : [];
        const rawFacs: any[] = Array.isArray(facilitiesRes.data) ? facilitiesRes.data : [];

        setAllUsers(usersList);
        const assignedIdSet = new Set<number>(assignedList.map((u) => u.id));
        setInitialAssignedIds(assignedIdSet);
        setSelectedUserIds(Array.from(assignedIdSet));

        // Calculate machines and sub-facilities under this target
        if (targetType === 'facility') {
          const numTargetId = Number(targetId);
          const descendantFacIds = new Set<number>([numTargetId]);
          let added = true;
          while (added) {
            added = false;
            rawFacs.forEach((f: any) => {
              if (f.parentFacilityId && descendantFacIds.has(Number(f.parentFacilityId)) && !descendantFacIds.has(Number(f.id))) {
                descendantFacIds.add(Number(f.id));
                added = true;
              }
            });
          }
          const subFacs = rawFacs.filter((f: any) => descendantFacIds.has(Number(f.id)) && Number(f.id) !== numTargetId);
          const subMacs = rawMacs.filter((m: any) => m.facilityId && descendantFacIds.has(Number(m.facilityId)));
          setChildFacilities(subFacs);
          setChildMachines(subMacs);
        } else if (targetType === 'mainFacility') {
          const numMfId = Number(targetId);
          const subFacs = rawFacs.filter((f: any) => Number(f.mainFacilityId) === numMfId);
          const facIds = new Set(subFacs.map((f: any) => Number(f.id)));
          const subMacs = rawMacs.filter((m: any) => (m.facilityId && facIds.has(Number(m.facilityId))) || Number(m.mainFacilityId) === numMfId || m.company === String(numMfId) || m.company === targetName);
          setChildFacilities(subFacs);
          setChildMachines(subMacs);
        } else {
          setChildFacilities([]);
          setChildMachines([]);
        }
      } catch (err) {
        console.error('Failed to load users for access modal:', err);
        toast.error('Failed to load user access list');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetType, targetId]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    allUsers.forEach((u) => {
      const r = u.designation || u.role;
      if (r) roles.add(r);
    });
    return Array.from(roles).sort();
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    let result = allUsers;

    if (selectedRoleFilter) {
      result = result.filter(
        (u) => (u.designation || u.role || '').toLowerCase() === selectedRoleFilter.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((u) => {
        const fullName = u.employee?.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim();
        return (
          fullName.toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.employee?.employeeCode || '').toLowerCase().includes(q) ||
          (u.employee?.department || '').toLowerCase().includes(q) ||
          (u.designation || u.role || '').toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [allUsers, searchQuery, selectedRoleFilter]);

  if (!isOpen) return null;

  const handleToggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredUsers.map((u) => u.id);
    const allSelected = filteredIds.every((id) => selectedUserIds.includes(id));

    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const baseEndpoint = targetType === 'mainFacility' ? 'main-facilities' : targetType === 'facility' ? 'facilities' : 'machines';
      const endpoint = `/${baseEndpoint}/${targetId}/users`;
      await api.post(endpoint, { userIds: selectedUserIds });

      toast.success(
        `Access updated successfully! (${selectedUserIds.length} user${selectedUserIds.length === 1 ? '' : 's'} assigned)`
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to save access:', err);
      toast.error(err.response?.data?.message || 'Failed to update access. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const allFilteredAreSelected =
    filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.includes(u.id));

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {targetType === 'machine' ? 'Machine Access' : targetType === 'mainFacility' ? 'Facility Access' : 'Sub-facility Access'}
                </span>
                {targetCode && (
                  <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {targetCode}
                  </span>
                )}
                {targetCategory && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    • {targetCategory}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Give Access to {targetName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign users and technicians who are authorized to monitor and manage this {targetType}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Included Assets Preview Section (Machines & Sub-facilities) */}
        {(targetType === 'facility' || targetType === 'mainFacility') && (
          <div className="bg-emerald-50/40 border-b border-emerald-100/80 px-5 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
                  <Layers size={13} />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Included Assets Under {targetName}:
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Cpu size={12} className="text-emerald-600" />
                  <span>{childMachines.length} {childMachines.length === 1 ? 'Machine' : 'Machines'}</span>
                </span>
                {childFacilities.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200">
                    <Building size={12} className="text-blue-600" />
                    <span>{childFacilities.length} {childFacilities.length === 1 ? 'Sub-facility' : 'Sub-facilities'}</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAssetsPreviewExpanded(!isAssetsPreviewExpanded)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-emerald-100/50 transition-colors cursor-pointer shrink-0"
                title={isAssetsPreviewExpanded ? 'Collapse assets preview' : 'Expand assets preview'}
              >
                {isAssetsPreviewExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>

            {isAssetsPreviewExpanded && (
              <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
                {childMachines.length === 0 && childFacilities.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    No machines or sub-facilities currently added under this facility.
                  </p>
                ) : (
                  <>
                    {childMachines.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-slate-500 mr-1">Machines:</span>
                        {childMachines.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200/90 text-xs font-semibold text-slate-800 shadow-2xs"
                          >
                            <Cpu size={12} className="text-emerald-600 shrink-0" />
                            <span>{m.name || m.machineCode}</span>
                            {m.machineCode && m.machineCode !== m.name && (
                              <span className="text-[10px] text-slate-400 font-mono">({m.machineCode})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {childFacilities.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-slate-500 mr-1">Sub-facilities:</span>
                        {childFacilities.map((f) => (
                          <span
                            key={f.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200/90 text-xs font-semibold text-slate-800 shadow-2xs"
                          >
                            <Building size={12} className="text-blue-600 shrink-0" />
                            <span>{f.facilityName}</span>
                            {f.facilityCode && (
                              <span className="text-[10px] text-slate-400 font-mono">({f.facilityCode})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-emerald-700 font-medium pt-0.5">
                      ✓ Authorized users assigned below will automatically inherit access to monitor and manage all {childMachines.length} machines{childFacilities.length > 0 ? ` and ${childFacilities.length} sub-facilities` : ''}.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Toolbar: Search, Role Filter, Select All */}
        <div className="p-4 sm:px-6 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, employee code, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {uniqueRoles.length > 0 && (
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-2xs shrink-0"
              >
                <option value="">All Roles ({uniqueRoles.length})</option>
                {uniqueRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-semibold text-slate-600">
              <span className="text-emerald-700 font-bold">{selectedUserIds.length}</span> of {allUsers.length} Users Assigned
            </span>

            {filteredUsers.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                  allFilteredAreSelected
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {allFilteredAreSelected ? 'Deselect Shown' : 'Select Shown'}
              </button>
            )}
          </div>
        </div>

        {/* User Selection List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
              <p className="text-sm font-medium">Loading user access list...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredUsers.map((userItem) => {
                const isSelected = selectedUserIds.includes(userItem.id);
                const isInitiallyAssigned = initialAssignedIds.has(userItem.id);
                const fullName =
                  userItem.employee?.fullName ||
                  `${userItem.firstName || ''} ${userItem.lastName || ''}`.trim() ||
                  userItem.username;
                const empCode = userItem.employee?.employeeCode || `USR#${userItem.id}`;
                const roleName = userItem.designation || userItem.role || 'Staff';
                const department = userItem.employee?.department;

                return (
                  <div
                    key={userItem.id}
                    onClick={() => handleToggleUser(userItem.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-xs ring-1 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={13} className="stroke-[3]" />}
                    </div>

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                      {fullName.charAt(0).toUpperCase()}
                    </div>

                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-900 truncate">{fullName}</p>
                        {isInitiallyAssigned && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                        <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                          {empCode}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">{roleName}</span>
                        {department && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 truncate">{department}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No users found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery || selectedRoleFilter
                  ? 'Try adjusting your search query or role filter'
                  : 'No active users available in the system'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500 hidden sm:block">
            {selectedUserIds.length === 0 ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertCircle size={13} />
                No users selected. Saving will clear all assigned users for this {targetType}.
              </span>
            ) : (
              <span>
                {selectedUserIds.length} user{selectedUserIds.length === 1 ? '' : 's'} will have access to this {targetType}.
              </span>
            )}
          </p>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-75 cursor-pointer active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Access...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Save Access ({selectedUserIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
