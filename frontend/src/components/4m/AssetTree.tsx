import { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Building, 
  Building2, 
  Cpu, 
  Folder, 
  Briefcase, 
  User, 
  GripVertical, 
  FolderInput,
  Shield 
} from 'lucide-react';

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
  enableDragAndDrop?: boolean;
  onDropNode?: (source: TreeNodeData, target: TreeNodeData) => void;
  onMove?: (node: TreeNodeData) => void;
  onGiveAccess?: (node: TreeNodeData) => void;
}

// Helper: Check if targetId is a descendant of parentNode
export const isDescendantNode = (parent: TreeNodeData, targetId: string): boolean => {
  if (!parent.children || parent.children.length === 0) return false;
  for (const child of parent.children) {
    if (child.id === targetId) return true;
    if (isDescendantNode(child, targetId)) return true;
  }
  return false;
};

// Helper: Determine if source node can be dropped into target node
export const canDropNode = (source: TreeNodeData | null, target: TreeNodeData): boolean => {
  if (!source) return false;
  if (source.id === target.id) return false;
  if (isDescendantNode(source, target.id)) return false;

  // 1. Moving Machine / Device
  if (source.type === 'device') {
    // Can drop into a Sub-Facility, Main Facility, Building, Society, or another Machine (as sub-machine)
    return target.type === 'facility' || target.type === 'mainFacility' || target.type === 'building' || target.type === 'society' || target.type === 'device';
  }

  // 2. Moving Facility
  if (source.type === 'facility') {
    // Can drop into a Main Facility or another Facility (as sub-facility)
    return target.type === 'mainFacility' || target.type === 'facility';
  }

  // 3. Moving Building
  if (source.type === 'building') {
    // Can drop into a Main Facility or a Society
    return target.type === 'mainFacility' || target.type === 'society';
  }

  return false;
};

// Helper: Determine if node can be dragged
export const canDragNode = (node: TreeNodeData, enabled: boolean): boolean => {
  if (!enabled) return false;
  return node.type === 'device' || node.type === 'facility' || node.type === 'building';
};

export const AssetTree = ({ 
  data, 
  onSelect, 
  onDoubleClick, 
  selectedId, 
  defaultExpanded = false,
  enableDragAndDrop = false,
  onDropNode,
  onMove,
  onGiveAccess,
}: AssetTreeProps) => {
  const [draggedNode, setDraggedNode] = useState<TreeNodeData | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const draggedNodeRef = useRef<TreeNodeData | null>(null);

  const handleDragStartNode = (node: TreeNodeData, _e: React.DragEvent) => {
    draggedNodeRef.current = node;
    setDraggedNode(node);
  };

  const handleDragEndNode = () => {
    draggedNodeRef.current = null;
    setDraggedNode(null);
    setDragOverNodeId(null);
  };

  const handleDragOverNode = (node: TreeNodeData, e: React.DragEvent) => {
    const currentSource = draggedNodeRef.current || draggedNode;
    if (currentSource && canDropNode(currentSource, node)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverNodeId !== node.id) {
        setDragOverNodeId(node.id);
      }
    }
  };

  const handleDragLeaveNode = (node: TreeNodeData, e: React.DragEvent) => {
    // Prevent clearing when moving over child elements of the row
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    if (dragOverNodeId === node.id) {
      setDragOverNodeId(null);
    }
  };

  const handleDropOnNode = (targetNode: TreeNodeData, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const source = draggedNodeRef.current || draggedNode;
    draggedNodeRef.current = null;
    setDraggedNode(null);
    setDragOverNodeId(null);

    if (source && canDropNode(source, targetNode) && onDropNode) {
      onDropNode(source, targetNode);
    }
  };

  return (
    <div className="w-full bg-white h-full overflow-y-auto py-2">
      {data.map(node => (
        <TreeNode 
          key={node.id} 
          node={node} 
          onSelect={onSelect} 
          onDoubleClick={onDoubleClick} 
          selectedId={selectedId} 
          defaultExpanded={defaultExpanded}
          enableDragAndDrop={enableDragAndDrop}
          draggedNode={draggedNode}
          dragOverNodeId={dragOverNodeId}
          onDragStartNode={handleDragStartNode}
          onDragEndNode={handleDragEndNode}
          onDragOverNode={handleDragOverNode}
          onDragLeaveNode={handleDragLeaveNode}
          onDropOnNode={handleDropOnNode}
          onMove={onMove}
          onGiveAccess={onGiveAccess}
        />
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
  enableDragAndDrop: boolean;
  draggedNode: TreeNodeData | null;
  dragOverNodeId: string | null;
  onDragStartNode: (node: TreeNodeData, e: React.DragEvent) => void;
  onDragEndNode: (e: React.DragEvent) => void;
  onDragOverNode: (node: TreeNodeData, e: React.DragEvent) => void;
  onDragLeaveNode: (node: TreeNodeData, e: React.DragEvent) => void;
  onDropOnNode: (targetNode: TreeNodeData, e: React.DragEvent) => void;
  onMove?: (node: TreeNodeData) => void;
  onGiveAccess?: (node: TreeNodeData) => void;
}

const TreeNode = ({ 
  node, 
  onSelect, 
  onDoubleClick, 
  selectedId, 
  level = 0, 
  defaultExpanded = false,
  enableDragAndDrop,
  draggedNode,
  dragOverNodeId,
  onDragStartNode,
  onDragEndNode,
  onDragOverNode,
  onDragLeaveNode,
  onDropOnNode,
  onMove,
  onGiveAccess,
}: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isDraggingRef = useRef(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const canDrag = canDragNode(node, enableDragAndDrop);
  const isBeingDragged = draggedNode?.id === node.id;
  const isOver = dragOverNodeId === node.id;
  const isTargetValid = draggedNode ? canDropNode(draggedNode, node) : false;

  // Auto-expand folder/facility if hovered with a dragged item for 700ms
  useEffect(() => {
    if (isOver && isTargetValid && hasChildren && !isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isOver, isTargetValid, hasChildren, isExpanded]);

  const getIconConfig = () => {
    switch (node.type) {
      case 'society':
      case 'mainFacility':
        return { icon: <Building2 className="w-3.5 h-3.5 text-emerald-600" />, bg: 'bg-emerald-50', border: 'border-emerald-100' };
      case 'building':
      case 'facility':
        return { icon: <Building className="w-3.5 h-3.5 text-[#00a651]" />, bg: 'bg-green-50', border: 'border-green-100' };
      case 'device':
        return { icon: <Cpu className="w-3.5 h-3.5 text-orange-600" />, bg: 'bg-orange-50', border: 'border-orange-100' };
      case 'department':
        return { icon: <Building className="w-3.5 h-3.5 text-indigo-600" />, bg: 'bg-indigo-50', border: 'border-indigo-100' };
      case 'designation':
        return { icon: <Briefcase className="w-3.5 h-3.5 text-purple-600" />, bg: 'bg-purple-50', border: 'border-purple-100' };
      case 'employee':
        return { icon: <User className="w-3.5 h-3.5 text-teal-600" />, bg: 'bg-teal-50', border: 'border-teal-100' };
      default:
        return { icon: <Folder className="w-3.5 h-3.5 text-gray-600" />, bg: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
    onSelect(node);
    if (hasChildren && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
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

  const handleDragStart = (e: React.DragEvent) => {
    isDraggingRef.current = true;
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStartNode(node, e);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    onDragEndNode(e);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const handleDrop = (e: React.DragEvent) => {
    onDropOnNode(node, e);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const { icon, bg, border } = getIconConfig();

  return (
    <div>
      <div 
        className={`group relative flex items-center gap-1.5 py-1 px-2.5 transition-all ${
          isBeingDragged 
            ? 'opacity-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg scale-[0.99]' 
            : isOver && isTargetValid
            ? 'bg-emerald-50/90 border-2 border-dashed border-emerald-500 rounded-lg ring-2 ring-emerald-500/20 shadow-xs z-20'
            : isSelected 
            ? 'bg-emerald-50/80 text-emerald-700' 
            : 'text-gray-700 hover:bg-gray-50'
        } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        style={{ paddingLeft: `${level * 18 + 8}px` }}
        draggable={canDrag}
        onDragStart={canDrag ? handleDragStart : undefined}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => onDragOverNode(node, e)}
        onDragLeave={(e) => onDragLeaveNode(node, e)}
        onDrop={handleDrop}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
      >
        {/* Left accent bar for selection */}
        {isSelected && !isOver && (
           <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-emerald-500" />
        )}

        {/* Drag grip icon */}
        {canDrag && (
          <span 
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity shrink-0 -ml-1 cursor-grab" 
            title="Drag to move"
          >
            <GripVertical className="w-3 h-3" />
          </span>
        )}

        {/* Expand/Collapse chevron */}
        <div 
          className={`w-4 h-4 flex items-center justify-center shrink-0 transition-colors z-10 bg-white ${hasChildren ? 'hover:bg-gray-200 rounded cursor-pointer text-gray-500 hover:text-gray-900' : 'opacity-0'}`}
          onClick={hasChildren ? handleExpandToggle : undefined}
        >
           {hasChildren && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </div>
        
        {/* Rich Icon Wrapper */}
        <span className="shrink-0 z-10">
          <div className={`w-6 h-6 rounded-md border ${bg} ${border} flex items-center justify-center shadow-2xs`}>
             {icon}
          </div>
        </span>
        
        {/* Title & Actions */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2 ml-1 z-10">
          <span className={`text-xs truncate transition-colors ${isSelected ? 'font-bold' : 'font-medium group-hover:text-gray-900'}`}>
            {node.name}
          </span>
          
          <div className="flex items-center gap-2">
            {/* Visual drop target indicator */}
            {isOver && isTargetValid && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse shrink-0">
                <FolderInput className="w-3.5 h-3.5" /> Move here
              </span>
            )}

            {/* Direct Give Access Button */}
            {onGiveAccess && ['mainFacility', 'facility', 'device', 'building', 'society'].includes(node.type) && !isOver && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGiveAccess(node);
                }}
                className="opacity-80 group-hover:opacity-100 hover:opacity-100 transition-all px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                title={`Give user access to ${node.name}`}
              >
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Access</span>
              </button>
            )}

            {/* Direct One-Click Move Button */}
            {canDrag && onMove && !isOver && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(node);
                }}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                title={`Move / Reassign ${node.name}`}
              >
                <FolderInput className="w-3 h-3 text-blue-600" />
                <span>Move</span>
              </button>
            )}

            {hasChildren && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors shrink-0 ${
                isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
              }`}>
                {node.children!.length}
              </span>
            )}
          </div>
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
                    enableDragAndDrop={enableDragAndDrop}
                    draggedNode={draggedNode}
                    dragOverNodeId={dragOverNodeId}
                    onDragStartNode={onDragStartNode}
                    onDragEndNode={onDragEndNode}
                    onDragOverNode={onDragOverNode}
                    onDragLeaveNode={onDragLeaveNode}
                    onDropOnNode={onDropOnNode}
                    onMove={onMove}
                    onGiveAccess={onGiveAccess}
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
