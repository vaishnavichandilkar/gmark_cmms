const fs = require('fs');
const file = '/home/vallabh-ghatge/GmarkSoftPvtLtd/hypn/frontend/src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// SOCIETIES TABLE REWRITE
const societiesListStart = '<div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[580px] custom-scrollbar">';
const societiesListRegex = /<div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-\[580px\] custom-scrollbar">([\s\S]*?)<\/div>\s*<\/div>\s*\)\}/;

const societiesTable = `<div className="flex-1 overflow-y-auto max-h-[580px] custom-scrollbar rounded-xl border border-gray-100">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-extrabold tracking-wider">Society Details</th>
                  <th className="px-6 py-4 font-extrabold tracking-wider w-1/3">Location</th>
                  <th className="px-6 py-4 text-right font-extrabold tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {societies.map(soc => {
                  const isSelected = selectedSocietyId === soc.id;
                  return (
                    <tr
                      key={soc.id}
                      onClick={() => {
                        if (currentUser?.role === 'SOCIETY_ADMIN') return;
                        setSelectedSocietyId(soc.id);
                        localStorage.setItem('admin_selected_society', soc.id);
                        setSelectedTowerId('');
                        localStorage.removeItem('admin_selected_tower');
                        setActiveAdminTab('towers'); // Auto-navigate to towers
                      }}
                      className={\`hover:bg-gray-50 transition-colors \${
                        currentUser?.role === 'SOCIETY_ADMIN' ? 'cursor-default' : 'cursor-pointer'
                      } \${isSelected ? 'bg-[#f0fcf4]' : ''}\`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={\`p-2.5 rounded-xl \${isSelected ? 'bg-green-100/50 text-green-600' : 'bg-gray-100 text-gray-400'}\`}>
                            <Building2 size={16} />
                          </div>
                          <span className="font-bold text-gray-900">{soc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize font-medium text-xs">{soc.city}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {currentUser?.role === 'SUPER_ADMIN' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditSocietyData(soc);
                                  setIsEditSocietyOpen(true);
                                }}
                                className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              {soc.id !== '4' && (
                                <button
                                  onClick={(e) => handleDeleteSociety(soc.id, e)}
                                  className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          )}
                          <ChevronRight size={16} className={isSelected ? 'text-green-600' : 'text-gray-300'} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}`;
content = content.replace(societiesListRegex, societiesTable);


// TOWERS TABLE REWRITE
const towersListRegex = /<div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-\[580px\] custom-scrollbar">([\s\S]*?)<\/div>\s*<\/div>\s*\)\}/;
const towersTable = `<div className="flex-1 overflow-y-auto max-h-[580px] custom-scrollbar rounded-xl border border-gray-100">
            {!selectedSocietyId ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm font-medium p-12">
                <Building2 size={32} className="text-gray-200 mb-4" />
                - Select a society to view its towers -
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-extrabold tracking-wider">Tower Details</th>
                    <th className="px-6 py-4 font-extrabold tracking-wider w-1/3">Stats</th>
                    <th className="px-6 py-4 text-right font-extrabold tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {towers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-medium text-xs">
                        No towers found for this society.
                      </td>
                    </tr>
                  ) : (
                    towers.map(tower => {
                      const isSelected = selectedTowerId === tower.id;
                      return (
                        <tr
                          key={tower.id}
                          onClick={() => {
                            setSelectedTowerId(tower.id);
                            localStorage.setItem('admin_selected_tower', tower.id);
                            setActiveAdminTab('devices'); // Auto navigate
                          }}
                          className={\`hover:bg-gray-50 transition-colors cursor-pointer \${isSelected ? 'bg-[#f0fcf4]' : ''}\`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={\`p-2.5 rounded-xl \${isSelected ? 'bg-green-100/50 text-green-600' : 'bg-gray-100 text-gray-400'}\`}>
                                <Building2 size={16} />
                              </div>
                              <span className="font-bold text-gray-900">{tower.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-xs">
                            {tower.floors}F - {tower.flats} flats
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditTowerData(tower);
                                      setIsEditTowerOpen(true);
                                    }}
                                    className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteTower(tower.id, e)}
                                    className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                              <ChevronRight size={16} className={isSelected ? 'text-green-600' : 'text-gray-300'} />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}`;
content = content.replace(towersListRegex, towersTable);


// DEVICES TABLE REWRITE
const devicesListRegex = /<div className="flex-1 overflow-y-auto pr-1 max-h-\[580px\] custom-scrollbar">([\s\S]*?)<\/div>\s*<\/div>\s*\)\}/;
const devicesTable = `<div className="flex-1 overflow-y-auto max-h-[580px] custom-scrollbar rounded-xl border border-gray-100">
            {!selectedTowerId ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm font-medium p-12">
                <Server size={32} className="text-gray-200 mb-4" />
                - Select a tower to view its devices -
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-extrabold tracking-wider">Device Details</th>
                    <th className="px-6 py-4 font-extrabold tracking-wider">MAC Address</th>
                    <th className="px-6 py-4 font-extrabold tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right font-extrabold tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium text-xs">
                        No devices found for this tower.
                      </td>
                    </tr>
                  ) : (
                    devices.map(dev => (
                      <tr key={dev.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                              <Server size={16} />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm">{dev.name}</h4>
                              <p className="text-[10px] text-gray-400 font-medium">{dev.deviceId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-xs font-mono text-gray-500">{dev.macAddress || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className={\`w-2 h-2 rounded-full \${dev.status === 'online' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-gray-300'}\`} />
                            <span className="text-[11px] font-bold text-gray-500 uppercase">{dev.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditDeviceData(dev);
                                    setIsEditDeviceOpen(true);
                                  }}
                                  className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteDevice(dev.id, e)}
                                  className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}`;
content = content.replace(devicesListRegex, devicesTable);

// 4. USERS TAB INJECTION
// Find the modally rendered Users Drawer and replace it with a Tab View
const usersTabBlock = `
      {activeAdminTab === 'users' && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-5 flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-green-600" size={18} />
              <span className="text-xs font-extrabold text-green-600 tracking-wider uppercase ml-1">User Management</span>
            </div>
            <div className="flex items-center gap-3">
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
      )}

      {/* === MODALS === */}`;

content = content.replace(/\{\/\* === MODALS === \*\/\}/g, usersTabBlock);

// Remove the old Users Drawer rendering completely
content = content.replace(/\{isUsersDrawerOpen && \([\s\S]*?\/\* === END USERS DRAWER === \*\/\s*\}/, "");
// Wait, I didn't mark the end. Let's just find the overlay block.
const usersDrawerRegex = /\{isUsersDrawerOpen && \(\s*<>\s*\{\/\* Backdrop \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*<\/>\s*\)\}/;
content = content.replace(usersDrawerRegex, "");

fs.writeFileSync(file, content);
console.log("Tables applied.");
