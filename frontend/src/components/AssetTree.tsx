import { useState } from 'react';
import { ChevronRight, ChevronDown, Building, Building2, Cpu, Folder } from 'lucide-react';

export interface TreeNodeData {
  id: string;
  name: string;
  type: 'society' | 'building' | 'mainFacility' | 'facility' | 'device';
  originalData: any;
  children?: TreeNodeData[];
}

interface AssetTreeProps {
  data: TreeNodeData[];
  onSelect: (node: TreeNodeData) => void;
  selectedId: string | null;
  defaultExpanded?: boolean;
}

export const AssetTree = ({ data, onSelect, selectedId, defaultExpanded = false }: AssetTreeProps) => {
  return (
    <div className="w-full bg-white h-full overflow-y-auto py-2">
      {data.map(node => (
        <TreeNode key={node.id} node={node} onSelect={onSelect} selectedId={selectedId} defaultExpanded={defaultExpanded} />
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
  selectedId: string | null;
  level?: number;
  defaultExpanded?: boolean;
}

const TreeNode = ({ node, onSelect, selectedId, level = 0, defaultExpanded = false }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const getIcon = () => {
    switch (node.type) {
      case 'society':
      case 'mainFacility':
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'building':
      case 'facility':
        return <Building className="w-4 h-4 text-emerald-500" />;
      case 'device':
        return <Cpu className="w-4 h-4 text-orange-500" />;
      default:
        return <Folder className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
    if (hasChildren && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-gray-100 transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        <span 
          className="w-5 h-5 flex items-center justify-center shrink-0"
          onClick={handleExpandToggle}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 hover:text-gray-700" /> : <ChevronRight className="w-4 h-4 text-gray-400 hover:text-gray-700" />
          ) : (
            <span className="w-4 h-4" />
          )}
        </span>
        
        <span className="shrink-0">{getIcon()}</span>
        
        <span className="text-sm font-medium truncate">{node.name}</span>
      </div>

      {isExpanded && hasChildren && (
        <div className="flex flex-col relative">
           {/* Connecting line */}
           <div className="absolute top-0 bottom-0 w-px bg-gray-200" style={{ left: `${level * 16 + 18}px` }} />
           
          {node.children!.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
              onSelect={onSelect} 
              selectedId={selectedId} 
              level={level + 1} 
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};
