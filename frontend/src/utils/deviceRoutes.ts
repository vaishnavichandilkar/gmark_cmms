export const getDeviceDashboardRoute = (deviceId: string): string => {
  const SCADA_ROUTES: Record<string, string> = {
    '20260508012': '/scada/flushing-terrace',
    '20260508045': '/scada/domestic-terrace',
    '20260508013': '/scada/tower-b-domestic',
    '20260526020': '/scada/tower-ac-domestic',
    '20260223035': '/scada/tower-b-flushing',
    '2026052022': '/scada/tower-ac-flushing',
    '2026526023': '/scada/gardan-system',
    '2026050910': '/scada/sub-soil-pump-01',
    '202605034': '/scada/sub-soil-pump-02',
    '2026050907': '/scada/sub-soil-pump-03',
    '2026050909': '/scada/sub-soil-pump-04',
    '20260506030': '/scada/sump-pump-01',
    '20260506029': '/scada/sump-pump-02',
    '20260506023': '/scada/sump-pump-03',
    '2026050913': '/scada/sump-pump-04',
    '2026051104': '/scada/sump-pump-05',
    '20260506027': '/scada/sump-pump-06',
  };
  return SCADA_ROUTES[deviceId] || `/devices/${deviceId}`;
};
