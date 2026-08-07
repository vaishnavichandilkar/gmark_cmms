import { useState } from 'react';
import { ChevronRight, ChevronDown, Building, Building2, Cpu, Folder, Briefcase, User } from 'lucide-react';

export interface TreeNodeData {
  id: string;
  name: string;
  type: 'society' | 'building' | 'mainFacility' | 'facility' | 'device' | 'department' | 'designation' | 'employee';
  originalData: any;
  children?: TreeNodeData[];
}

interface AssetTreeProps {
  data: TreeNodeData[];
  onSelect: (node: TreeNodeData) => void;
  onDoubleClick?: (node: TreeNodeData) => void;
  selectedId: string | null;
  defaultExpanded?: boolean;
}

export const AssetTree = ({ data, onSelect, onDoubleClick, selectedId, defaultExpanded = false }: AssetTreeProps) => {
  return (
    <div className="w-full bg-white h-full overflow-y-auto py-2">
      {data.map(node => (
        <TreeNode key={node.id} node={node} onSelect={onSelect} onDoubleClick={onDoubleClick} selectedId={selectedId} defaultExpanded={defaultExpanded} />
      ))}
      {data.length === 0 && (
        <div className="p-4 text-sm text-gray-500 text-center">No assets found</div>
      )}
    </div>
  );
};

interface TreeNodeProps {
  node: TreeNodeData;
  onSelect: (node: TreeNodeData) => void;
  onDoubleClick?: (node: TreeNodeData) => void;
  selectedId: string | null;
  level?: number;
  defaultExpanded?: boolean;
}

const TreeNode = ({ node, onSelect, onDoubleClick, selectedId, level = 0, defaultExpanded = false }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const getIconConfig = () => {
    switch (node.type) {
      case 'society':
      case 'mainFacility':
        return { icon: <Building2 className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-50', border: 'border-blue-100' };
      case 'building':
      case 'facility':
        return { icon: <Building className="w-4 h-4 text-[#00a651]" />, bg: 'bg-green-50', border: 'border-green-100' };
      case 'device':
        return { icon: <Cpu className="w-4 h-4 text-orange-600" />, bg: 'bg-orange-50', border: 'border-orange-100' };
      case 'department':
        return { icon: <Building className="w-4 h-4 text-indigo-600" />, bg: 'bg-indigo-50', border: 'border-indigo-100' };
      case 'designation':
        return { icon: <Briefcase className="w-4 h-4 text-purple-600" />, bg: 'bg-purple-50', border: 'border-purple-100' };
      case 'employee':
        return { icon: <User className="w-4 h-4 text-teal-600" />, bg: 'bg-teal-50', border: 'border-teal-100' };
      default:
        return { icon: <Folder className="w-4 h-4 text-gray-600" />, bg: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
    if (hasChildren && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDoubleClick) {
      onDoubleClick(node);
    }
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const { icon, bg, border } = getIconConfig();

  return (
    <div className="select-none">
      <div 
        className={`group relative flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-blue-50/80 text-blue-700' 
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
      >
        {/* Left accent bar for selection */}
        {isSelected && (
           <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />
        )}

        {/* Expand/Collapse chevron */}
        <div 
          className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors z-10 bg-white ${hasChildren ? 'hover:bg-gray-200 rounded cursor-pointer text-gray-500 hover:text-gray-900' : 'opacity-0'}`}
          onClick={hasChildren ? handleExpandToggle : undefined}
        >
           {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
        </div>
        
        {/* Rich Icon Wrapper */}
        <span className="shrink-0 z-10">
          <div className={`w-7 h-7 rounded-md border ${bg} ${border} flex items-center justify-center shadow-sm`}>
             {icon}
          </div>
        </span>
        
        {/* Title */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-3 ml-1 z-10">
          <span className={`text-sm truncate transition-colors ${isSelected ? 'font-bold' : 'font-medium group-hover:text-gray-900'}`}>
            {node.name}
          </span>
          
          {hasChildren && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors shrink-0 ${
              isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
            }`}>
              {node.children!.length}
            </span>
          )}
        </div>
      </div>

      {/* Children Container */}
      <div 
        className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded && hasChildren ? 'opacity-100' : 'max-h-0 opacity-0'}`}
      >
        {isExpanded && hasChildren && (
          <div className="flex flex-col relative">
             {/* Strong Vertical Connection Line */}
             <div className="absolute top-0 bottom-0 w-[2px] bg-gray-200" style={{ left: `${level * 24 + 21}px` }} />
             
            {node.children!.map((child, index) => {
              const isLast = index === node.children!.length - 1;
              return (
                <div key={child.id} className="relative">
                  {/* Horizontal Elbow Line for each child */}
                  <div className="absolute top-[22px] w-[12px] h-[2px] bg-gray-200" style={{ left: `${level * 24 + 21}px` }} />
                  
                  {/* Mask for the last child's vertical line drop */}
                  {isLast && (
                    <div className="absolute bottom-0 w-[4px] bg-white z-0" style={{ left: `${level * 24 + 20}px`, top: '24px' }} />
                  )}

                  <TreeNode 
                    node={child} 
                    onSelect={onSelect} 
                    onDoubleClick={onDoubleClick}
                    selectedId={selectedId} 
                    level={level + 1} 
                    defaultExpanded={defaultExpanded}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
