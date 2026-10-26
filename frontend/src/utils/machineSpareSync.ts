import { spareService, type SparePart, type MachineUsage } from '../services/spareService';

export const machineSpareSync = {
  /**
   * Called when a spare is added or updated inside a Machine (EditMachine / AddMachine)
   */
  async onSpareAddedToMachine(
    machine: { id: string | number; name: string; location?: string },
    spareItem: { id?: string | number; partName?: string; partCode?: string; quantityUsed?: number; rate?: number; total?: number; category?: string }
  ) {
    try {
      const allSpares = await spareService.getAll();
      const spare = allSpares.find(s => 
        (spareItem.id && String(s.id) === String(spareItem.id)) ||
        (spareItem.partCode && s.partCode && s.partCode.toLowerCase() === spareItem.partCode.toLowerCase()) ||
        (spareItem.partName && s.partName && s.partName.toLowerCase() === spareItem.partName.toLowerCase())
      );

      if (!spare) return;

      const currentList: MachineUsage[] = Array.isArray(spare.machinesList) ? [...spare.machinesList] : [];
      const qty = Number(spareItem.quantityUsed) || 1;
      const rate = Number(spareItem.rate) || 0;
      const total = Number(spareItem.total) !== undefined ? Number(spareItem.total) : qty * rate;

      const existingIdx = currentList.findIndex(m => 
        String(m.id) === String(machine.id) || 
        (m.name && machine.name && m.name.trim().toLowerCase() === machine.name.trim().toLowerCase())
      );

      const machineUsage: MachineUsage = {
        id: String(machine.id),
        name: machine.name,
        location: machine.location || 'Main Facility',
        quantityUsed: qty,
        rate: rate,
        total: total,
      };

      if (existingIdx >= 0) {
        currentList[existingIdx] = { ...currentList[existingIdx], ...machineUsage };
      } else {
        currentList.push(machineUsage);
      }

      await spareService.update(spare.id, { machinesList: currentList });
    } catch (err) {
      console.warn('Failed to sync spare addition to machine:', err);
    }
  },

  /**
   * Called when a spare is deleted from a Machine
   */
  async onSpareRemovedFromMachine(
    machineId: string | number,
    spareItem: { id?: string | number; partName?: string; partCode?: string }
  ) {
    try {
      const allSpares = await spareService.getAll();
      const spare = allSpares.find(s => 
        (spareItem.id && String(s.id) === String(spareItem.id)) ||
        (spareItem.partCode && s.partCode && s.partCode.toLowerCase() === spareItem.partCode.toLowerCase()) ||
        (spareItem.partName && s.partName && s.partName.toLowerCase() === spareItem.partName.toLowerCase())
      );

      if (!spare || !Array.isArray(spare.machinesList)) return;

      const updatedList = spare.machinesList.filter(m => String(m.id) !== String(machineId));
      await spareService.update(spare.id, { machinesList: updatedList });
    } catch (err) {
      console.warn('Failed to sync spare removal from machine:', err);
    }
  },

  /**
   * Called when a machine is added or updated inside SpareDetailsPage
   */
  onMachineAddedToSpare(
    spare: { id?: string | number; partName: string; partCode?: string; category?: string; location?: string; rate?: number; unitCost?: number },
    machineItem: { id: string | number; name: string; location?: string; quantityUsed?: number; rate?: number; total?: number }
  ) {
    try {
      const storageKey = `machine_${machineItem.id}_spares`;
      const raw = localStorage.getItem(storageKey);
      let sparesList: any[] = [];
      if (raw) {
        try { sparesList = JSON.parse(raw); } catch { sparesList = []; }
      }

      const qty = Number(machineItem.quantityUsed) || 1;
      const rate = Number(machineItem.rate) || Number(spare.rate) || Number(spare.unitCost) || 0;
      const total = Number(machineItem.total) !== undefined ? Number(machineItem.total) : qty * rate;

      const spareEntry = {
        id: spare.id || Date.now(),
        partName: spare.partName,
        partCode: spare.partCode || '',
        category: spare.category || 'General',
        location: spare.location || machineItem.location || 'Main Store',
        quantityUsed: qty,
        stockQuantity: qty,
        inHandQuantity: qty,
        rate: rate,
        unitCost: Number(spare.unitCost) || rate,
        total: total,
      };

      const existingIdx = sparesList.findIndex(s => 
        (spare.id && String(s.id) === String(spare.id)) ||
        (spare.partCode && s.partCode && s.partCode.toLowerCase() === spare.partCode.toLowerCase()) ||
        (spare.partName && s.partName && s.partName.toLowerCase() === spare.partName.toLowerCase())
      );

      if (existingIdx >= 0) {
        sparesList[existingIdx] = { ...sparesList[existingIdx], ...spareEntry };
      } else {
        sparesList.push(spareEntry);
      }

      localStorage.setItem(storageKey, JSON.stringify(sparesList));
    } catch (err) {
      console.warn('Failed to sync machine addition to spare:', err);
    }
  },

  /**
   * Called when a machine is removed from SpareDetailsPage
   */
  onMachineRemovedFromSpare(
    spareIdOrNameOrCode: string | number,
    machineId: string | number
  ) {
    try {
      const storageKey = `machine_${machineId}_spares`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const sparesList = JSON.parse(raw);
      if (Array.isArray(sparesList)) {
        const filtered = sparesList.filter(s => 
          String(s.id) !== String(spareIdOrNameOrCode) &&
          s.partName?.toLowerCase() !== String(spareIdOrNameOrCode).toLowerCase() &&
          s.partCode?.toLowerCase() !== String(spareIdOrNameOrCode).toLowerCase()
        );
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn('Failed to sync machine removal from spare:', err);
    }
  },

  /**
   * Scans all localStorage machine spares and merges any linked machines into the given spare's machinesList
   */
  getMergedMachinesForSpare(
    spare: { id?: string | number; partName?: string; partCode?: string },
    currentMachinesList: MachineUsage[] = [],
    availableMachines: { id: string; machineName: string; location?: string }[] = []
  ): MachineUsage[] {
    const merged = Array.isArray(currentMachinesList) ? [...currentMachinesList] : [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('machine_') && key.endsWith('_spares')) {
          const mId = key.replace('machine_', '').replace('_spares', '');
          try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(list)) {
              const matched = list.find((s: any) => 
                (spare.id && String(s.id) === String(spare.id)) ||
                (spare.partCode && s.partCode && s.partCode.toLowerCase() === spare.partCode.toLowerCase()) ||
                (spare.partName && s.partName && s.partName.toLowerCase() === spare.partName.toLowerCase())
              );

              if (matched) {
                const foundMachine = availableMachines.find(m => String(m.id) === String(mId));
                const mName = foundMachine?.machineName || matched.machineName || `Machine #${mId}`;
                const mLocation = foundMachine?.location || matched.location || 'Main Facility';
                const qty = Number(matched.quantityUsed) || Number(matched.stockQuantity) || 1;
                const rate = Number(matched.rate) || Number(matched.unitCost) || 0;
                const total = matched.total !== undefined ? Number(matched.total) : qty * rate;

                const alreadyInIdx = merged.findIndex(m => String(m.id) === String(mId) || m.name?.toLowerCase() === mName.toLowerCase());
                const item: MachineUsage = {
                  id: String(mId),
                  name: mName,
                  location: mLocation,
                  quantityUsed: qty,
                  rate: rate,
                  total: total,
                };

                if (alreadyInIdx >= 0) {
                  merged[alreadyInIdx] = { ...merged[alreadyInIdx], ...item };
                } else {
                  merged.push(item);
                }
              }
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Error reading localStorage in getMergedMachinesForSpare:', e);
    }

    return merged;
  },

  /**
   * Scans all catalog spares and merges any spares that reference this machine into machineSpares
   */
  getMergedSparesForMachine(
    machineId: string | number,
    machineName: string,
    currentMachineSpares: any[] = [],
    allCatalogSpares: SparePart[] = []
  ): any[] {
    const merged = Array.isArray(currentMachineSpares) ? [...currentMachineSpares] : [];

    for (const spare of allCatalogSpares) {
      if (Array.isArray(spare.machinesList)) {
        const found = spare.machinesList.find(m => 
          String(m.id) === String(machineId) ||
          (machineName && m.name && m.name.trim().toLowerCase() === machineName.trim().toLowerCase())
        );

        if (found) {
          const qty = Number(found.quantityUsed) || 1;
          const rate = Number(found.rate) || Number(spare.rate) || Number(spare.unitCost) || 0;
          const total = Number(found.total) !== undefined ? Number(found.total) : qty * rate;

          const alreadyIdx = merged.findIndex(s => 
            String(s.id) === String(spare.id) ||
            (s.partCode && spare.partCode && s.partCode.toLowerCase() === spare.partCode.toLowerCase()) ||
            (s.partName && spare.partName && s.partName.toLowerCase() === spare.partName.toLowerCase())
          );

          const spareItem = {
            id: spare.id,
            partName: spare.partName,
            partCode: spare.partCode || '',
            category: spare.category || 'General',
            location: spare.location || found.location || 'Main Store',
            quantityUsed: qty,
            stockQuantity: qty,
            inHandQuantity: qty,
            rate: rate,
            unitCost: Number(spare.unitCost) || rate,
            total: total,
          };

          if (alreadyIdx >= 0) {
            merged[alreadyIdx] = { ...merged[alreadyIdx], ...spareItem };
          } else {
            merged.push(spareItem);
          }
        }
      }
    }

    return merged;
  }
};
