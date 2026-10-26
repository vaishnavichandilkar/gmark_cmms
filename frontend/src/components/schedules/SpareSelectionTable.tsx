import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Package, RefreshCw, Plus } from 'lucide-react';
import { spareService } from '../../services/spareService';

interface SpareSelectionTableProps {
  selectedSpares: { sparePartId?: number; partName: string; partCode?: string; quantity: number; unitCost?: number }[];
  onSelectionChange: (spares: { sparePartId?: number; partName: string; partCode?: string; quantity: number; unitCost?: number }[]) => void;
}

export function SpareSelectionTable({ selectedSpares, onSelectionChange }: SpareSelectionTableProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = await spareService.getAll();
      if (data && Array.isArray(data)) {
        setCatalog(data);
      } else {
        setCatalog([]);
      }
    } catch (err) {
      console.error('Failed to load spare parts catalog', err);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCatalog = catalog.filter(part => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (part.partName && part.partName.toLowerCase().includes(q)) ||
      (part.partCode && part.partCode.toLowerCase().includes(q)) ||
      (part.category && part.category.toLowerCase().includes(q)) ||
      (part.description && part.description.toLowerCase().includes(q))
    );
  });

  const isSelected = (partId: number) => {
    return selectedSpares.some(s => s.sparePartId === partId);
  };

  const toggleSelectPart = (part: any) => {
    const cost = Number(part.unitCost ?? part.rate ?? 0);
    if (isSelected(part.id)) {
      onSelectionChange(selectedSpares.filter(s => s.sparePartId !== part.id));
    } else {
      onSelectionChange([
        ...selectedSpares,
        {
          sparePartId: part.id,
          partName: part.partName,
          partCode: part.partCode,
          quantity: 1,
          unitCost: cost,
        },
      ]);
    }
  };

  const handleQtyChange = (partId: number, qty: number) => {
    if (qty < 1) return;
    onSelectionChange(
      selectedSpares.map(s => (s.sparePartId === partId ? { ...s, quantity: qty } : s))
    );
  };

  return (
    <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Package size={18} className="text-emerald-600" />
            <h4 className="font-bold text-gray-900 text-sm">Required Spares Selection</h4>
          </div>
          <p className="text-[11px] text-gray-500">
            Search inventory and select spare parts required for this maintenance schedule
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Spare Name, Code, Model..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Spare Selection Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-xs max-h-64 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 font-bold border-b sticky top-0 z-10">
            <tr>
              <th className="p-2.5 text-center w-10">Select</th>
              <th className="p-2.5">Spare Name & Code</th>
              <th className="p-2.5">Make & Model</th>
              <th className="p-2.5">Description</th>
              <th className="p-2.5 text-center">Stock</th>
              <th className="p-2.5 text-right">Unit Cost</th>
              <th className="p-2.5 text-center w-28">Quantity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                  Loading Spare Catalog...
                </td>
              </tr>
            ) : filteredCatalog.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="font-semibold text-gray-600">No spare parts found</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {searchQuery
                      ? `No spares matching "${searchQuery}"`
                      : 'No spare parts found in inventory.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/spares/new', { state: { returnUrl: location.pathname } })}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={13} className="stroke-[2.5]" />
                    <span>Add in Spare Management</span>
                  </button>
                </td>
              </tr>
            ) : (
              filteredCatalog.map(part => {
                const checked = isSelected(part.id);
                const selectedPartObj = selectedSpares.find(s => s.sparePartId === part.id);
                const currentQty = selectedPartObj?.quantity || 1;
                const unitCost = Number(part.unitCost ?? part.rate ?? 0);
                const stock = Number(part.stockQuantity ?? part.totalStock ?? part.inHandQuantity ?? 0);
                const makeModel = part.make || part.modelNumber
                  ? `${part.make || ''} ${part.modelNumber ? '/ ' + part.modelNumber : ''}`.trim()
                  : `${part.category || 'Standard'} / ${part.subCategory || '-'}`;

                return (
                  <tr
                    key={part.id}
                    className={`hover:bg-emerald-50/40 transition-colors ${
                      checked ? 'bg-emerald-50/60 font-semibold' : ''
                    }`}
                  >
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelectPart(part)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-2.5">
                      <span className="font-bold text-gray-900 block">{part.partName}</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded inline-block">
                        {part.partCode}
                      </span>
                    </td>
                    <td className="p-2.5 text-gray-700">
                      {makeModel}
                    </td>
                    <td className="p-2.5 text-gray-500 max-w-xs truncate" title={part.description || part.notes}>
                      {part.description || part.notes || 'Standard spare part component'}
                    </td>
                    <td className="p-2.5 text-center font-bold text-gray-800">{stock}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-700">₹{unitCost}</td>
                    <td className="p-2.5 text-center">
                      {checked ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(part.id, currentQty - 1)}
                            className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold px-1.5">{currentQty}</span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(part.id, currentQty + 1)}
                            className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Summary Badge */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-gray-500">
          Selected Spares: <strong>{selectedSpares.length} item(s)</strong>
        </span>
        <span className="font-bold text-emerald-700">
          Total Estimated Cost: ₹
          {selectedSpares
            .reduce((acc, s) => acc + s.quantity * (s.unitCost || 0), 0)
            .toLocaleString()}
        </span>
      </div>
    </div>
  );
}
