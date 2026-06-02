import { FAULT_LABELS } from './constants';

export const parseRegisterData = (registers: { register: string; value: number }[]) => {
  const parsed: Record<string, number> = {};
  registers.forEach((item) => {
    parsed[item.register] = item.value;
  });
  return parsed;
};

export const getFaultLabel = (faultCode: number | undefined): string => {
  if (faultCode === undefined) return 'Unknown';
  return FAULT_LABELS[faultCode.toString()] || `Unknown Code: ${faultCode}`;
};

export const getVoltageColor = (voltage: number | undefined): string => {
  if (voltage === undefined) return 'text-slate-400';
  if (voltage < 380 || voltage > 440) return 'text-red-500'; // Assuming 415 is ideal
  if (voltage < 400 || voltage > 430) return 'text-orange-500';
  return 'text-green-500';
};

export const getStatusColor = (status: number | undefined, isBinary: boolean = true) => {
  if (status === undefined) return 'bg-slate-600';
  if (isBinary) {
    return status === 1 ? 'bg-green-500' : 'bg-red-500';
  }
  return status === 0 ? 'bg-green-500' : 'bg-red-500'; // For faults, 0 is ok usually
};
