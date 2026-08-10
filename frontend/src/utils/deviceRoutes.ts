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
    // Also map secondary panels so they don't fall back to live monitor if used directly
    '20260508011': '/scada/tower-b-flushing',
    '2026050805': '/scada/tower-b-domestic',
    '20260526021': '/scada/tower-ac-domestic',
    '20260508010': '/scada/tower-ac-flushing',
  };
  return SCADA_ROUTES[deviceId] || `/devices/${deviceId}`;
};

export const navigateToDeviceDashboard = (device: any, buildingName: string | undefined, navigate: any) => {
  const name = device.name || '';
  const lowerName = name.toLowerCase();
  
  const isFlushing = lowerName.includes('flushing terrace');
  const isDomestic = lowerName.includes('domestic terrace');
  const isTowerBDomestic = lowerName.includes('tower b domestic');
  const isTowerACDomestic = lowerName.includes('tower a&c domestic');
  const isTowerBFlushing = lowerName.includes('tower b flushing');
  const isTowerACFlushing = lowerName.includes('tower a&c flushing');
  const isGardenSystem = lowerName.includes('gardan system') || lowerName.includes('garden system');
  const isSubSoilPump01 = lowerName.includes('sub soil pump-01');
  const isSubSoilPump02 = lowerName.includes('sub soil pump-02');
  const isSubSoilPump03 = lowerName.includes('sub soil pump-03');
  const isSubSoilPump04 = lowerName.includes('sub soil pump-04');
  const isSumpPump01 = lowerName.includes('sump pump-01');
  const isSumpPump02 = lowerName.includes('sump pump-02');
  const isSumpPump03 = lowerName.includes('sump pump-03');
  const isSumpPump04 = lowerName.includes('sump pump-04');
  const isSumpPump05 = lowerName.includes('sump pump-05');
  const isSumpPump06 = lowerName.includes('sump pump-06');

  const isScada = isFlushing || isDomestic || isTowerBDomestic || isTowerACDomestic ||
    isTowerBFlushing || isTowerACFlushing || isGardenSystem ||
    isSubSoilPump01 || isSubSoilPump02 || isSubSoilPump03 || isSubSoilPump04 ||
    isSumpPump01 || isSumpPump02 || isSumpPump03 ||
    isSumpPump04 || isSumpPump05 || isSumpPump06;

  if (!isScada) {
    // If it's not a known SCADA dashboard device, fall back to Live Monitor
    navigate(`/devices/${device.deviceId || device.id}`);
    return;
  }

  const lowerBuilding = (buildingName || '').toLowerCase();
  const deviceIdStr = (device.deviceId || device.id).toString();
  let p1Id = deviceIdStr;
  let p2Id = '';
  let p3Id = '';

  if (isFlushing) {
    if (lowerBuilding.includes('a building')) {
      p1Id = '20260508012';
      p2Id = '20260508045';
    } else if (lowerBuilding.includes('b building')) {
      p1Id = '2026050805';
      p2Id = '20260508011';
    } else {
      p1Id = '20260508010';
      p2Id = '20260526021';
    }
    p3Id = '20260506023';
  } else if (isDomestic) {
    if (lowerBuilding.includes('a building')) {
      p1Id = '20260508045';
      p2Id = '20260508012';
    } else if (lowerBuilding.includes('b building')) {
      p1Id = '20260508011';
      p2Id = '2026050805';
    } else {
      p1Id = '20260526021';
      p2Id = '20260508010';
    }
    p3Id = '20260506023';
  } else if (isTowerBDomestic) {
    p1Id = '20260508013';
    p2Id = '2026050805';
    p3Id = '20260506023';
  } else if (isTowerACDomestic) {
    p1Id = '20260526020';
    p2Id = '2026050805';
    p3Id = '20260506023';
  } else if (isTowerBFlushing) {
    p1Id = deviceIdStr;
    p2Id = '20260508011';
    p3Id = '20260506023';
  } else if (isTowerACFlushing) {
    p1Id = deviceIdStr;
    p2Id = '20260508011';
    p3Id = '20260506023';
  } else if (isGardenSystem) {
    p1Id = deviceIdStr;
    p2Id = '20260508011';
    p3Id = '20260506023';
  } else {
    p1Id = deviceIdStr;
    p2Id = '2026050805';
    p3Id = '20260506023';
  }

  const showPressure = !(
    isSubSoilPump01 || isSubSoilPump02 || isSubSoilPump03 || isSubSoilPump04 ||
    isSumpPump01 || isSumpPump02 || isSumpPump03 || isSumpPump04 || isSumpPump05 || isSumpPump06
  );

  const inletTank = (
    isSubSoilPump01 || isSubSoilPump02 || isSubSoilPump03 || isSubSoilPump04 ||
    isSumpPump01 || isSumpPump02 || isSumpPump03 || isSumpPump04 || isSumpPump05 || isSumpPump06
  )
    ? 'Underground Sump'
    : (isTowerBDomestic || isTowerACDomestic || isTowerBFlushing || isTowerACFlushing || isGardenSystem)
      ? 'Underground Tank'
      : 'Underground Tank';

  const outType = (isTowerBDomestic || isTowerACDomestic || isTowerBFlushing || isTowerACFlushing || isGardenSystem) ? 'tank' : 'label';
  const outTitle = (isTowerBDomestic || isTowerACDomestic || isTowerBFlushing || isTowerACFlushing || isGardenSystem) ? 'Overhead Tank' : 'OUTLET';

  const routeState = {
    panelId: deviceIdStr,
    buildingName: buildingName || (lowerName.includes('(stp)') ? 'STP' : 'C Building'),
    title: name,
    pump1Id: p1Id,
    pump2Id: p2Id,
    pump3Id: p3Id,
    showPressureCard: showPressure,
    inletTankTitle: inletTank,
    outletType: outType,
    outletTitle: outTitle,
  };

  if (isFlushing) navigate('/scada/flushing-terrace', { state: routeState });
  else if (isDomestic) navigate('/scada/domestic-terrace', { state: routeState });
  else if (isTowerBDomestic) navigate('/scada/tower-b-domestic', { state: routeState });
  else if (isTowerACDomestic) navigate('/scada/tower-ac-domestic', { state: routeState });
  else if (isTowerBFlushing) navigate('/scada/tower-b-flushing', { state: routeState });
  else if (isTowerACFlushing) navigate('/scada/tower-ac-flushing', { state: routeState });
  else if (isGardenSystem) navigate('/scada/gardan-system', { state: routeState });
  else if (isSubSoilPump01) navigate('/scada/sub-soil-pump-01', { state: routeState });
  else if (isSubSoilPump02) navigate('/scada/sub-soil-pump-02', { state: routeState });
  else if (isSubSoilPump03) navigate('/scada/sub-soil-pump-03', { state: routeState });
  else if (isSubSoilPump04) navigate('/scada/sub-soil-pump-04', { state: routeState });
  else if (isSumpPump01) navigate('/scada/sump-pump-01', { state: routeState });
  else if (isSumpPump02) navigate('/scada/sump-pump-02', { state: routeState });
  else if (isSumpPump03) navigate('/scada/sump-pump-03', { state: routeState });
  else if (isSumpPump04) navigate('/scada/sump-pump-04', { state: routeState });
  else if (isSumpPump05) navigate('/scada/sump-pump-05', { state: routeState });
  else if (isSumpPump06) navigate('/scada/sump-pump-06', { state: routeState });
};
