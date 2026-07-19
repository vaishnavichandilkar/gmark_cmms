const fs = require('fs');
const file = '/home/vallabh-ghatge/GmarkSoftPvtLtd/hypn/frontend/src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the old devices block which starts with `{activeAdminTab === 'devices' && (` and ends right before `</div>\n\n      {/* --- MODALS --- */}`
const oldDevicesBlockRegex = /\{activeAdminTab === 'devices' && \([\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* --- MODALS --- \*\/\}/;

const devicesTable = `{activeAdminTab === 'devices' && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-5 flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-emerald-500" size={18} />
              <span className="text-xs font-bold text-emerald-500 tracking-wider uppercase">Devices</span>
            </div>
            {selectedTowerId && (
              <button
                onClick={() => setIsAddDeviceOpen(true)}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-full text-[10px] font-bold text-white transition-all cursor-pointer"
              >
                <Plus size={10} />
                Device
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[580px] custom-scrollbar rounded-xl border border-gray-100">
            {!selectedTowerId ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm font-medium p-12">
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
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium text-xs">
                        No devices found for this tower.
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map(dev => (
                      <tr key={dev.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                              <Building2 size={16} />
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
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => handleDeleteDevice(dev.id, e)}
                                  className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                                >
                                  Del
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
      )}
      </div>

      {/* --- MODALS --- */}`;

content = content.replace(oldDevicesBlockRegex, devicesTable);

fs.writeFileSync(file, content);
console.log("Fixed Devices Table and Syntax.");
