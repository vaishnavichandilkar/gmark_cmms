import React, { useState, useRef } from 'react';
import { Upload, Eye, Pencil, Trash2, Maximize2, Loader2, ZoomIn, ZoomOut, RotateCw, Download, X, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface MachineImageCardProps {
  imageUrl?: string;
  localPreviewUrl?: string;
  uploading?: boolean;
  onImageChange: (file: File) => void;
  onImageRemove: () => void;
  machineName?: string;
  machineCategory?: string;
  machineSubCategory?: string;
  status?: string;
  onStatusClick?: () => void;
}

export function MachineImageCard({
  imageUrl,
  localPreviewUrl,
  uploading = false,
  onImageChange,
  onImageRemove,
  machineName,
  machineCategory,
  machineSubCategory,
  status = 'Online',
  onStatusClick,
}: MachineImageCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const resolveImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (url.includes(':3001/uploads/')) {
        return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):3001/, '');
      }
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

  const currentImage = localPreviewUrl || imageUrl;
  const displayUrl = currentImage ? resolveImageUrl(currentImage) : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG, JPG, WEBP, etc.)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      onImageChange(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG, JPG, WEBP, etc.)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      onImageChange(file);
    }
  };

  const openViewer = () => {
    setImageZoom(1);
    setImageRotation(0);
    setIsViewerOpen(true);
  };

  const handleDownload = () => {
    if (!displayUrl) return;
    const link = document.createElement('a');
    link.href = displayUrl;
    link.download = `${(machineName || 'machine').toLowerCase().replace(/\s+/g, '_')}_photo.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="w-full lg:w-64 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4 shrink-0">
        {/* Upload Container Box */}
        <div className="space-y-3">
          <div
            onClick={() => {
              if (uploading) return;
              if (displayUrl) {
                openViewer();
              } else {
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`w-full aspect-square bg-[#fbfdfc] rounded-2xl border-2 border-dashed ${
              displayUrl
                ? 'border-gray-200 hover:border-emerald-500'
                : 'border-emerald-400/90 hover:border-emerald-500 hover:bg-[#ebfbf3]/30'
            } flex flex-col items-center justify-center relative overflow-hidden group transition-all cursor-pointer`}
            title={displayUrl ? 'Click to view full image' : 'Click to upload image'}
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center p-4 gap-2 text-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <span className="text-xs text-gray-600 font-bold">Uploading image...</span>
              </div>
            ) : displayUrl ? (
              <>
                <img
                  src={displayUrl}
                  alt={machineName || 'Machine Photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (currentImage && !target.src.includes(':3001') && !target.src.startsWith('data:')) {
                      target.src = `http://localhost:3001${currentImage.startsWith('/') ? currentImage : `/${currentImage}`}`;
                    }
                  }}
                />
                {/* Hover Overlay with Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 z-10 backdrop-blur-[2px]">
                  <span className="text-[11px] font-bold text-white/90 flex items-center gap-1 mb-1">
                    <Maximize2 className="w-3.5 h-3.5" /> Click to view
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openViewer();
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                      title="View full image"
                    >
                      <Eye className="w-3 h-3 text-emerald-600" />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                      title="Edit / Replace image"
                    >
                      <Pencil className="w-3 h-3 text-emerald-600" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageRemove();
                      }}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center select-none">
                <div className="w-14 h-14 rounded-2xl bg-[#ebfbf3] text-[#009a43] flex items-center justify-center mb-2.5 border border-emerald-100 group-hover:scale-105 transition-all duration-200 shadow-xs">
                  <Upload className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">
                  Click to upload image
                </span>
                <span className="text-[10px] text-gray-400 mt-1">
                  PNG, JPG, WEBP up to 10MB
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Under-image Action Buttons if Image Present */}
          {displayUrl && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openViewer}
                className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-emerald-200 transition-colors shadow-xs cursor-pointer"
                title="View full image"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-200 transition-colors shadow-xs cursor-pointer"
                title="Edit / Replace image"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={onImageRemove}
                className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs flex items-center justify-center border border-red-200 transition-colors shadow-xs cursor-pointer"
                title="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Status Badge - 4M Green button matching screenshot */}
          <button
            type="button"
            onClick={onStatusClick}
            className="w-full bg-[#009a43] hover:bg-[#00863a] text-white py-2 px-4 rounded-xl font-bold text-center text-xs tracking-wide shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Status : {status || 'Online'}</span>
          </button>
        </div>

        {/* Key Summary Labels matching user screenshot */}
        <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Machine Name</div>
            <div className="font-bold text-slate-900 mt-0.5 truncate" title={machineName}>
              {machineName || 'New Machine'}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-medium">Machine Category</div>
            <div className="font-bold text-slate-900 mt-0.5 truncate" title={machineCategory}>
              {machineCategory || 'Machine Category'}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-medium">Machine Sub-Category</div>
            <div className="font-bold text-slate-900 mt-0.5 truncate" title={machineSubCategory}>
              {machineSubCategory || 'Machine Sub-Category'}
            </div>
          </div>
        </div>
      </div>

      {/* FULL PREVIEW MODAL */}
      {isViewerOpen && displayUrl && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsViewerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {machineName ? `${machineName} - Photo Preview` : 'Machine Photo Preview'}
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    High-resolution preview & orientation controls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Canvas */}
            <div className="flex-1 bg-gray-950 p-6 flex items-center justify-center overflow-hidden min-h-[360px] relative select-none">
              <div
                className="transition-transform duration-200 flex items-center justify-center"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                }}
              >
                <img
                  src={displayUrl}
                  alt={machineName || 'Machine Photo'}
                  className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-2xl"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (currentImage && !target.src.includes(':3001') && !target.src.startsWith('data:')) {
                      target.src = `http://localhost:3001${currentImage.startsWith('/') ? currentImage : `/${currentImage}`}`;
                    }
                  }}
                />
              </div>

              {(imageRotation !== 0 || imageZoom !== 1) && (
                <div className="absolute top-4 left-4 bg-black/60 text-white text-[10px] px-3 py-1.5 rounded-full font-mono backdrop-blur-xs flex items-center gap-2">
                  <span>Zoom: {Math.round(imageZoom * 100)}%</span>
                  <span>•</span>
                  <span>Rotate: {imageRotation}°</span>
                </div>
              )}
            </div>

            {/* Footer Toolbar */}
            <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImageZoom((prev) => Math.min(prev + 0.25, 3))}
                  className="p-1.5 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom((prev) => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                  className="p-1.5 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="text-xs">Rotate</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewerOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Replace Photo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
