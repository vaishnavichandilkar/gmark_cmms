import React, { useState, useRef } from 'react';
import type { TreeNodeData } from './AssetTree';
import { Building2, Building, Cpu, Wifi, Image as ImageIcon, QrCode, Activity, MapPin, User, Navigation, Settings, FileText, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getDeviceDashboardRoute, navigateToDeviceDashboard } from '../../utils/deviceRoutes';

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
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${node.type === 'device' ? 'bg-orange-50 text-orange-600' :
              node.type === 'building' || node.type === 'facility' ? 'bg-emerald-50 text-emerald-600' :
                'bg-[#00a651]/10 text-[#00a651]'
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
      <div className="flex-1 p-6 bg-gray-50/50">
        {node.type === 'device' ? <DeviceDetails device={node.originalData} /> : <FacilityDetails node={node} />}
      </div>
    </div>
  );
};

const FacilityDetails = ({ node }: { node: TreeNodeData }) => {
  const data = node.originalData;
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const idCode = data.mainFacilityCode || data.facilityCode || data.id || 'N/A';
  const name = node.name || 'N/A';
  const type = node.type.replace(/([A-Z])/g, ' $1').trim();
  const status = data.status || 'Active';
  const headName = data.mainFacilityHead || data.facilityHeadName || 'Not Assigned';
  const category = data.category || 'N/A';
  const subCategory = data.subcategory || data.subCategory || 'N/A';

  const address = data.address || '';
  const city = data.city || '';
  const state = data.state || '';
  const country = data.country || '';
  const postalCode = data.postalCode || '';

  const fullAddress = [address, city, state, country, postalCode].filter(Boolean).join(', ') || 'Address not available';

  const latitude = data.latitude;
  const longitude = data.longitude;
  const coordinates = latitude && longitude ? `${latitude}, ${longitude}` : 'Not available';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="text-[#00a651]" size={20} />
            General Information
          </h3>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
            {status}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ID / Code</p>
            <p className="text-sm font-medium text-gray-900">{idCode}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</p>
            <p className="text-sm font-medium text-gray-900">{name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Type</p>
            <p className="text-sm font-medium text-gray-900">{type}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Facility Head</p>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm font-medium text-gray-900">
              <User size={14} className="text-gray-400" />
              {headName}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</p>
            <p className="text-sm font-medium text-gray-900">{category}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subcategory</p>
            <p className="text-sm font-medium text-gray-900">{subCategory}</p>
          </div>
          {data.gstNumber && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">GST Number</p>
              <p className="text-sm font-medium text-gray-900">{data.gstNumber}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2 border-b border-gray-100 pb-4">
          <MapPin className="text-[#00a651]" size={20} />
          Location & Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Address</p>
            <p className="text-sm font-medium text-gray-900">{fullAddress}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Coordinates</p>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm font-medium text-gray-900 font-mono">
              <Navigation size={14} className="text-gray-400" />
              {coordinates}
            </div>
          </div>
          {(data.description || data.notes) && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description / Notes</p>
              <p className="text-sm font-medium text-gray-900 whitespace-pre-line">{data.description || data.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center h-48 text-gray-400 flex-col group relative overflow-hidden">
        {imageSrc ? (
          <img src={imageSrc} alt="Facility Cover" className="w-full h-full object-cover" />
        ) : (
          <>
            <ImageIcon className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No Cover Image Available</p>
          </>
        )}
        <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button onClick={triggerUpload} className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:text-[#00a651] transition-colors">Upload Image</button>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
        </div>
      </div>
    </div>
  );
};

const DeviceDetails = ({ device }: { device: any }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [imageSrc, setImageSrc] = useState<string>("https://images.unsplash.com/photo-1611145624794-d4212df88289?auto=format&fit=crop&w=800&q=80");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'doc', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'specs', label: 'Specs', icon: <Activity className="w-4 h-4" /> },
    { id: 'spl', label: 'Spl. Support', icon: <Wrench className="w-4 h-4" /> },
    { id: 'iot', label: 'IOT', icon: <Wifi className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Top Section */}
      <div className="flex gap-6 h-48 shrink-0">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative group">
          <img 
            src={imageSrc} 
            alt="Device" 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&q=80';
            }}
          />
          <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button onClick={triggerUpload} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:text-[#00a651]">Upload Image</button>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          </div>
        </div>
        <div className="w-64 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center p-4">
          <QrCode className="w-24 h-24 text-gray-800 mb-3" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Scan for details</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-[#00a651] bg-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabBottom"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00a651]"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-8">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Machine Name</p>
                <p className="text-sm font-medium text-gray-900">{device.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">MAC ID / Device ID</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded inline-block font-mono">{device.deviceId}</p>
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
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
              <Wifi className="w-16 h-16 text-[#00a651] mb-6 opacity-90" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">HYPN Cloud Connected</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">This device is connected to the cloud via MAC ID: <br /><span className="font-mono bg-gray-50 px-3 py-1 rounded text-gray-800 mt-2 inline-block border border-gray-200">{device.deviceId}</span></p>

              <button
                onClick={() => navigateToDeviceDashboard(device, undefined, navigate)}
                className="bg-[#00a651] hover:bg-[#009040] text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm w-full flex items-center justify-center gap-2"
              >
                <Activity size={18} />
                Open SCADA Dashboard
              </button>
            </div>
          )}

          {(activeTab === 'doc' || activeTab === 'specs' || activeTab === 'spl') && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[200px]">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-500">No documents uploaded yet</p>
              <button className="mt-4 text-[#00a651] hover:text-[#009040] text-sm font-medium transition-colors">Upload Document</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
