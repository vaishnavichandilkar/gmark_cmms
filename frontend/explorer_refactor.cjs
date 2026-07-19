const fs = require('fs');
const file = '/home/vallabh-ghatge/GmarkSoftPvtLtd/hypn/frontend/src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace activeAdminTab state with viewMode state
content = content.replace(
  /const \[activeAdminTab, setActiveAdminTab\] = useState\('societies'\);/,
  "const [viewMode, setViewMode] = useState<'explorer' | 'users'>('explorer');"
);

// We need to replace everything from "Admin Tabs Navigation" to "--- MODALS ---"
const blockRegex = /\{\/\* Admin Tabs Navigation \*\/\}([\s\S]*?)\{\/\* --- MODALS --- \*\/\}/;

const explorerView = `
      {/* File Explorer Grid Layout OR Users View */}
      <div className="flex-1 overflow-y-auto pb-24 px-1">
        {viewMode === 'users' ? (
          // === USERS VIEW ===
          <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-5 flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div className="flex items-center gap-2">
                <Users className="text-green-600" size={18} />
                <span className="text-xs font-extrabold text-green-600 tracking-wider uppercase ml-1">User Management</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('explorer')}
                  className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Close Users
                </button>
                {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserFormData({
                        username: '', mobileNumber: '', email: '', password: '', firstName: '', lastName: '',
                        profileTitle: '', profileDetail: '', profileImageUrl: '', floorNo: '', city: '',
                        state: '', country: '', pincode: '', role: 'VIEWER', isActive: true, buildingIds: []
                      });
                      setIsUserFormOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                  >
                    <Plus size={14} />
                    Add User
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[580px] custom-scrollbar rounded-xl border border-gray-100">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-extrabold tracking-wider">User Details</th>
                    <th className="px-6 py-4 font-extrabold tracking-wider">Role</th>
                    <th className="px-6 py-4 font-extrabold tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right font-extrabold tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loadingUsers ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-xs">Loading users...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-xs">No users found.</td></tr>
                  ) : (
                    users.map(user => {
                      const displayName = (user.firstName || user.lastName) ? \`\${user.firstName || ''} \${user.lastName || ''}\`.trim() : user.username;
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.profileImageUrl ? (
                                <img src={user.profileImageUrl} alt={displayName} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                              ) : (
                                <div className="w-10 h-10 bg-green-100/50 text-green-600 rounded-xl flex items-center justify-center text-xs font-bold uppercase border border-green-200/50">
                                  {displayName.substring(0, 2)}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{displayName}</h4>
                                <p className="text-[10px] text-gray-500 font-medium">{user.email || user.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                              {user.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className={\`w-2 h-2 rounded-full \${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}\`} />
                              <span className="text-[11px] font-bold text-gray-500 uppercase">{user.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingUser(user);
                                      setUserFormData({
                                        username: user.username, mobileNumber: user.mobileNumber || '', email: user.email || '',
                                        password: '', firstName: user.firstName || '', lastName: user.lastName || '',
                                        profileTitle: user.profileTitle || '', profileDetail: user.profileDetail || '',
                                        profileImageUrl: user.profileImageUrl || '', floorNo: user.floorNo || '',
                                        city: user.city || '', state: user.state || '', country: user.country || '',
                                        pincode: user.pincode || '', role: user.role, isActive: user.isActive,
                                        buildingIds: user.accessibleBuildings.map(b => b.id.toString())
                                      });
                                      setIsUserFormOpen(true);
                                    }}
                                    className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : !selectedSocietyId ? (
          // === LEVEL 0: SOCIETIES GRID ===
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100/50 text-green-600 rounded-lg">
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">All Societies</h2>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{societies.length} Societies Total</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setViewMode('users')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors">
                   Manage Users
                </button>
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <button onClick={() => setIsAddSocietyOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-green-700 transition-colors">+ Add Society</button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {societies.map(soc => (
                <div 
                  key={soc.id}
                  onClick={() => {
                    if (currentUser?.role === 'SOCIETY_ADMIN') return;
                    setSelectedSocietyId(soc.id);
                    localStorage.setItem('admin_selected_society', soc.id);
                  }}
                  className={\`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col gap-4 \${currentUser?.role === 'SOCIETY_ADMIN' ? 'cursor-default border-gray-100' : 'cursor-pointer border-gray-200 hover:border-green-400'}\`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-3">
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors relative">
                        <Folder size={32} fill="currentColor" className="opacity-20 absolute" />
                        <Building2 size={20} className="relative z-10" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-green-700 transition-colors">{soc.name}</h3>
                        <p className="text-[10px] text-gray-400 mt-1 capitalize">{soc.city || 'Unknown Location'}</p>
                      </div>
                    </div>
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setEditSocietyData(soc); setIsEditSocietyOpen(true); }} className="p-1.5 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-100"><Pencil size={14}/></button>
                        {soc.id !== '4' && (
                           <button onClick={(e) => handleDeleteSociety(soc.id, e)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100"><Trash2 size={14}/></button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !selectedTowerId ? (
          // === LEVEL 1: TOWERS GRID ===
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100/50 text-blue-600 rounded-lg">
                  <Building size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">{currentSocietyName} Towers</h2>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{towers.length} Towers Found</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setViewMode('users')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors">
                   Manage Users
                </button>
                {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                  <button onClick={() => setIsAddTowerOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors">+ Add Tower</button>
                )}
              </div>
            </div>

            {towers.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-gray-400 text-sm font-medium border-2 border-dashed border-gray-200 rounded-2xl">
                <Building size={32} className="text-gray-300 mb-3" />
                No towers created yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {towers.map(tower => (
                  <div 
                    key={tower.id}
                    onClick={() => {
                      setSelectedTowerId(tower.id);
                      localStorage.setItem('admin_selected_tower', tower.id);
                    }}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col gap-4 hover:border-blue-400"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors relative">
                          <Folder size={32} fill="currentColor" className="opacity-20 absolute" />
                          <Building size={20} className="relative z-10" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-blue-700 transition-colors">{tower.name}</h3>
                          <p className="text-[10px] text-gray-400 mt-1">{tower.floors} Floors • {tower.flats} Flats</p>
                        </div>
                      </div>
                      {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setEditTowerData(tower); setIsEditTowerOpen(true); }} className="p-1.5 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-100"><Pencil size={14}/></button>
                          <button onClick={(e) => handleDeleteTower(tower.id, e)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100"><Trash2 size={14}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // === LEVEL 2: DEVICES GRID ===
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100/50 text-emerald-600 rounded-lg">
                  <Server size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">{currentTowerName} Devices</h2>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{filteredDevices.length} Devices Installed</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                  <button onClick={() => setIsAddDeviceOpen(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors">+ Add Device</button>
                )}
              </div>
            </div>

            {loadingDevices ? (
               <div className="py-24 text-center text-gray-400 text-sm">Loading devices...</div>
            ) : filteredDevices.length === 0 ? (
               <div className="py-24 flex flex-col items-center justify-center text-gray-400 text-sm font-medium border-2 border-dashed border-gray-200 rounded-2xl">
                 <Server size={32} className="text-gray-300 mb-3" />
                 No devices installed yet.
               </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDevices.map(dev => (
                  <div 
                    key={dev.id}
                    onClick={() => {
                      setSelectedActionDevice(dev);
                      setIsDeviceActionSheetOpen(true);
                    }}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col gap-4 hover:border-emerald-400 relative overflow-hidden"
                  >
                    <div className={\`absolute top-0 left-0 right-0 h-1.5 \${dev.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'}\`} />
                    
                    <div className="flex items-start justify-between mt-1">
                      <div className="flex flex-col gap-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                          <Server size={20} className="relative z-10" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-emerald-700 transition-colors">{dev.name}</h3>
                          <p className="text-[10px] text-gray-400 font-mono mt-1">{dev.deviceId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={\`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider \${dev.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}\`}>
                           {dev.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                       <div className="flex flex-wrap gap-1.5">
                         <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-[9px] font-bold border border-gray-100">{dev.application}</span>
                       </div>
                       {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); setEditDeviceData(dev); setIsEditDeviceOpen(true); }} className="p-1.5 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-100"><Pencil size={12}/></button>
                           <button onClick={(e) => handleDeleteDevice(dev.id, e)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100"><Trash2 size={12}/></button>
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}`;

content = content.replace(blockRegex, explorerView);
fs.writeFileSync(file, content);
console.log("Explorer layout applied.");
