const fs = require('fs');
const file = '/home/vallabh-ghatge/GmarkSoftPvtLtd/hypn/frontend/src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// The block to replace is from `  return (` down to `      {/* --- MODALS --- */}`

const usersTableStr = `
                <table className="w-full text-left text-sm text-gray-500">
                  <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-extrabold tracking-wider">User</th>
                      <th className="px-6 py-4 font-extrabold tracking-wider">Contact</th>
                      <th className="px-6 py-4 font-extrabold tracking-wider">Role</th>
                      <th className="px-6 py-4 font-extrabold tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right font-extrabold tracking-wider w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-xs">
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-xs italic">
                          No users found in this society.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.profileImageUrl ? (
                                <img src={user.profileImageUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-200">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{user.firstName} {user.lastName}</h4>
                                <p className="text-[10px] text-gray-500 font-medium">@{user.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-gray-900">{user.email}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{user.mobileNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                              {user.role}
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
                                    onClick={() => handleEditUser(user)}
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
                      ))
                    )}
                  </tbody>
                </table>
`;

const devicesTableStr = `
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
                    {loadingDevices ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-xs">
                          Loading devices...
                        </td>
                      </tr>
                    ) : filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium text-xs">
                          No devices found for this tower.
                        </td>
                      </tr>
                    ) : (
                      filteredDevices.map(dev => (
                        <tr key={dev.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {
                            setSelectedActionDevice(dev);
                            setIsDeviceActionSheetOpen(true);
                          }}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                <Wifi size={16} />
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
                              <div className={\`w-2 h-2 rounded-full \${dev.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'}\`} />
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
`;

const splitScreenJSX = `  return (
    <div className="h-[calc(100vh-8rem)] bg-transparent -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 text-gray-900 relative flex flex-col md:flex-row gap-6">
      
      {/* LEFT SIDEBAR: MASTER VIEW */}
      <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden h-full">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Building2 className="text-emerald-600" size={18} />
            <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">Hierarchy</span>
          </div>
          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
            <button
              onClick={() => setIsAddSocietyOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-full text-[10px] font-bold text-white transition-all shadow-sm"
            >
              <Plus size={12} /> Society
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {societies.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs italic">No societies found</div>
          ) : (
            societies.map(soc => (
              <div key={soc.id} className="flex flex-col">
                {/* Society Row */}
                <div 
                  className={\`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all \${selectedSocietyId === soc.id ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50 border border-transparent'}\`}
                  onClick={() => {
                    if (selectedSocietyId !== soc.id) {
                      setSelectedSocietyId(soc.id);
                      localStorage.setItem('admin_selected_society', soc.id);
                      setSelectedTowerId('');
                      localStorage.removeItem('admin_selected_tower');
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={\`p-2 rounded-lg transition-colors \${selectedSocietyId === soc.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}\`}>
                      <Building2 size={16} />
                    </div>
                    <span className={\`text-sm font-bold truncate max-w-[150px] transition-colors \${selectedSocietyId === soc.id ? 'text-emerald-900' : 'text-gray-700'}\`}>{soc.name}</span>
                  </div>
                  <ChevronRight size={16} className={\`transition-transform \${selectedSocietyId === soc.id ? 'rotate-90 text-emerald-600' : 'text-gray-300'}\`} />
                </div>
                
                {/* Towers List (Expanded if selected) */}
                {selectedSocietyId === soc.id && (
                  <div className="pl-11 pr-2 py-2 space-y-1 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Towers</span>
                      {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAddTowerOpen(true);
                          }}
                          className="text-emerald-600 hover:text-emerald-700 p-1 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                    
                    {loadingTowers ? (
                      <div className="text-xs text-gray-400 py-2">Loading towers...</div>
                    ) : towers.length === 0 ? (
                      <div className="text-xs text-gray-400 italic py-2">No towers found</div>
                    ) : (
                      towers.map(tower => (
                        <div
                          key={tower.id}
                          className={\`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors \${selectedTowerId === tower.id ? 'bg-gray-100/80 font-bold text-gray-900 shadow-sm border border-gray-200' : 'hover:bg-gray-50 text-gray-600 font-medium border border-transparent'}\`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTowerId(tower.id);
                            localStorage.setItem('admin_selected_tower', tower.id);
                          }}
                        >
                          <div className={\`w-1.5 h-1.5 rounded-full transition-colors \${selectedTowerId === tower.id ? 'bg-emerald-500' : 'bg-gray-300'}\`} />
                          <span className="text-xs truncate">{tower.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT MAIN AREA: DETAIL VIEW */}
      <div className="flex-1 flex flex-col bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden h-full min-w-0">
        {!selectedSocietyId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/30">
            <div className="w-24 h-24 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-6">
              <Building2 size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Welcome to Admin Panel</h3>
            <p className="text-sm max-w-sm">Select a society from the left sidebar to view its details, manage towers, devices, and user access.</p>
          </div>
        ) : !selectedTowerId ? (
          // Society Details & User Management
          <div className="flex flex-col h-full bg-gray-50/30">
            <div className="p-8 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold select-none mb-4">
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">All Societies</span>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="text-gray-900 font-bold">{currentSocietyName}</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{currentSocietyName}</h2>
                  <p className="text-sm text-gray-500 mt-1">Manage society details, settings, and users.</p>
                </div>
                <div className="flex items-center gap-3">
                  {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                    <>
                      <button
                        onClick={() => {
                          const soc = societies.find(s => s.id === selectedSocietyId);
                          if (soc) {
                            setEditSocietyData(soc);
                            setIsEditSocietyOpen(true);
                          }
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-700 transition-all shadow-sm flex items-center gap-2"
                      >
                        <Pencil size={14} /> Edit Society
                      </button>
                      <button
                        onClick={() => handleDeleteSociety(selectedSocietyId)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Society Users Section */}
            <div className="flex-1 flex flex-col min-h-0 m-6 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 gap-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                  <Users size={16} className="text-emerald-600" /> Users Access List
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all w-full sm:w-64"
                    />
                  </div>
                  <button
                    onClick={() => setIsUserFormOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={14} /> Add User
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                ${usersTableStr}
              </div>
            </div>
          </div>
        ) : (
          // Tower Details & Devices
          <div className="flex flex-col h-full bg-gray-50/30">
            <div className="p-8 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold select-none mb-4">
                <span 
                  className="text-gray-500 hover:text-emerald-600 cursor-pointer transition-colors px-2 py-0.5 rounded hover:bg-emerald-50"
                  onClick={() => {
                    setSelectedTowerId('');
                    localStorage.removeItem('admin_selected_tower');
                  }}
                >
                  {currentSocietyName}
                </span>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded">{currentTowerName}</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{currentTowerName}</h2>
                  <p className="text-sm text-gray-500 mt-1">Manage connected IoT devices in this tower.</p>
                </div>
                <div className="flex items-center gap-3">
                  {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                    <>
                      <button
                        onClick={() => {
                          const tow = towers.find(t => t.id === selectedTowerId);
                          if (tow) {
                            setEditTowerData(tow);
                            setIsEditTowerOpen(true);
                          }
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-700 transition-all shadow-sm flex items-center gap-2"
                      >
                        <Pencil size={14} /> Edit Tower
                      </button>
                      <button
                        onClick={() => handleDeleteTower(selectedTowerId)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Devices Section */}
            <div className="flex-1 flex flex-col min-h-0 m-6 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 gap-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                  <Wifi size={16} className="text-emerald-600" /> Connected Devices
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search devices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all w-full sm:w-64"
                    />
                  </div>
                  <button
                    onClick={() => setIsAddDeviceOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={14} /> Add Device
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                ${devicesTableStr}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );`;

// Find where `return (` is located on line 620
// And `{/* --- MODALS --- */}` around line 998
const startIdx = content.indexOf('  return (');
const endIdx = content.indexOf('      {/* --- MODALS --- */}');

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + splitScreenJSX + "\n\n      {/* --- MODALS --- */}" + content.substring(endIdx + 28);
  fs.writeFileSync(file, content);
  console.log("Replaced UI successfully");
} else {
  console.log("Could not find start or end index.");
}

