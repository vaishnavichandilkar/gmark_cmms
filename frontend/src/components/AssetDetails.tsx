import { useState } from 'react';
import type { TreeNodeData } from './AssetTree';
import { Building2, Building, Cpu, FileText, Settings, Wifi, Image as ImageIcon, QrCode, Activity, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface AssetDetailsProps {
  node: TreeNodeData | null;
}

export const AssetDetails = ({ node }: AssetDetailsProps) => {
  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
        <Cpu className="w-16 h-16 mb-4 text-gray-300" />
        <h3 className="text-xl font-medium text-gray-600">No Asset Selected</h3>
        <p className="text-sm mt-2 text-gray-500">Select an asset from the tree to view its details</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${
            node.type === 'device' ? 'bg-orange-50 text-orange-600' :
            node.type === 'building' || node.type === 'facility' ? 'bg-emerald-50 text-emerald-600' :
            'bg-blue-50 text-blue-600'
          }`}>
            {node.type === 'device' && <Cpu className="w-6 h-6" />}
            {(node.type === 'building' || node.type === 'facility') && <Building className="w-6 h-6" />}
            {(node.type === 'society' || node.type === 'mainFacility') && <Building2 className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{node.name}</h2>
            <p className="text-sm text-gray-500 capitalize tracking-wide mt-0.5">{node.type.replace(/([A-Z])/g, ' $1').trim()}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 bg-gray-50/30">
        {node.type === 'device' ? <DeviceDetails device={node.originalData} /> : <FacilityDetails node={node} />}
      </div>
    </div>
  );
};

const FacilityDetails = ({ node }: { node: TreeNodeData }) => {
  const data = node.originalData;
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">General Information</h3>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ID / Code</p>
            <p className="text-sm font-medium text-gray-900">{data.mainFacilityCode || data.facilityCode || data.id}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</p>
            <p className="text-sm font-medium text-gray-900">{node.name}</p>
          </div>
          {data.city && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">City</p>
              <p className="text-sm font-medium text-gray-900">{data.city}</p>
            </div>
          )}
          {data.category && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</p>
              <p className="text-sm font-medium text-gray-900">{data.category}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-center h-48 text-gray-400 flex-col">
        <ImageIcon className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm font-medium">No Image Available</p>
      </div>
    </div>
  );
};

const DeviceDetails = ({ device }: { device: any }) => {
  const [activeTab, setActiveTab] = useState('general');
  const navigate = useNavigate();

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'doc', label: 'Doc', icon: <FileText className="w-4 h-4" /> },
    { id: 'specs', label: 'Specs', icon: <Activity className="w-4 h-4" /> },
    { id: 'spl', label: 'Spl. Spt', icon: <Wrench className="w-4 h-4" /> },
    { id: 'iot', label: 'IOT', icon: <Wifi className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Top Section: Image & QR */}
      <div className="flex gap-6 h-48">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center overflow-hidden relative group">
          <ImageIcon className="w-16 h-16 text-gray-200" />
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:text-green-600">Upload Image</button>
          </div>
        </div>
        <div className="w-48 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center p-4">
           <QrCode className="w-24 h-24 text-gray-800 mb-2" />
           <p className="text-xs text-gray-500 font-medium">Scan for details</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-green-600 bg-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabBottom"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Machine Name</p>
                <p className="text-sm font-medium text-gray-900">{device.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">MAC ID / Device ID</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded inline-block">{device.deviceId}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Application</p>
                <p className="text-sm font-medium text-gray-900">{device.application || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Controller</p>
                <p className="text-sm font-medium text-gray-900">{device.controller || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pump Type</p>
                <p className="text-sm font-medium text-gray-900">{device.pumpType || 'N/A'}</p>
              </div>
            </div>
          )}

          {activeTab === 'iot' && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
               <Wifi className="w-16 h-16 text-blue-500 mb-4 opacity-80" />
               <h3 className="text-lg font-bold text-gray-900 mb-2">HYPN Cloud Connected</h3>
               <p className="text-sm text-gray-500 mb-6">This device is connected to the cloud via MAC ID: <span className="font-mono bg-gray-100 px-1 rounded">{device.deviceId}</span></p>
               
               <button 
                  onClick={() => navigate(`/devices/${device.deviceId}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm w-full"
               >
                 Open Live Monitor
               </button>
            </div>
          )}

          {(activeTab === 'doc' || activeTab === 'specs' || activeTab === 'spl') && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <FileText className="w-12 h-12 mb-3 text-gray-300" />
               <p className="text-sm font-medium">No documents uploaded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
