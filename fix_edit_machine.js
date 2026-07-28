const fs = require('fs');
let code = fs.readFileSync('./frontend/src/pages/machines/EditMachine.tsx', 'utf8');

const brokenPart = `<span className="text-sm font-semibold text-gray-700">This Machine is a part of</span>
                    <CustomSelect
                      name="headOfDepartment"
                      value={formData.headOfDepartment}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[
                        { label: 'Head 1', value: 'Head 1' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Machine Owner<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="machineOwner"
                      value={formData.machineOwner}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[
                        { label: 'Owner 1', value: 'Owner 1' }
                      ]}
                    />
                  </div>
                </div>`;

const fixedPart = `<span className="text-sm font-semibold text-gray-700">This Machine is a part of</span>
                    <CustomSelect
                      name="locationId"
                      value={formData.locationId}
                      onChange={handleChange}
                      disabled={!formData.isLocationPart}
                      placeholder="Select Location"
                      options={facilities.map(f => ({ label: f.facilityName, value: f.id.toString() }))}
                    />
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center \${!formData.isLocationPart ? 'border-[#00a651]' : 'border-gray-300'}\`}>
                      {!formData.isLocationPart && <div className="w-2.5 h-2.5 bg-[#00a651] rounded-full"></div>}
                    </div>
                    <input 
                      type="radio" 
                      className="hidden" 
                      checked={!formData.isLocationPart}
                      onChange={() => setFormData(prev => ({ ...prev, isLocationPart: false }))}
                    />
                    <span className="text-sm font-semibold text-gray-700">This Machine is not a part of another location, is located at</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Latitude<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      placeholder="Enter Latitude"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Longitude<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      placeholder="Enter Longitude"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Cost Center<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="costCenter"
                      value={formData.costCenter}
                      onChange={handleChange}
                      placeholder="Enter"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Select Head of Department<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="headOfDepartment"
                      value={formData.headOfDepartment}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[
                        { label: 'Head 1', value: 'Head 1' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Machine Owner<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="machineOwner"
                      value={formData.machineOwner}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[
                        { label: 'Owner 1', value: 'Owner 1' }
                      ]}
                    />
                  </div>
              </div>`;

code = code.replace(brokenPart, fixedPart);
fs.writeFileSync('./frontend/src/pages/machines/EditMachine.tsx', code);
