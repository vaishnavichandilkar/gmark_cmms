export interface ActiveFault {
  key: string;      // Unique key for tracking changes (e.g. 'power_1', 'water_failure')
  message: string;  // Dynamic text spoken by Speech Synthesis API
  label: string;    // Human-readable title shown in alerts / toast popups
  severity: 'warning' | 'error';
}

export interface FaultStatus {
  hasFault: boolean;
  activeFaults: ActiveFault[];
}

export const detectFaults = (parsedData: Record<string, number>): FaultStatus => {
  const activeFaults: ActiveFault[] = [];

  // Check if we actually have register data loaded (to prevent false alarms on initial load)
  if (Object.keys(parsedData).length === 0) {
    return { hasFault: false, activeFaults: [] };
  }

  // 1. Input Power Fault / R/Y/B Phase Faults / Phase Reverse / No Power (Register 6)
  const powerFaultCode = parsedData['6'];
  if (powerFaultCode !== undefined && powerFaultCode > 0) {
    let message = 'Input power fault detected. Please check.';
    let label = 'Input Power Fault';
    let severity: 'warning' | 'error' = 'error';

    switch (powerFaultCode) {
      case 1:
        message = 'R phase fault detected. Please check.';
        label = 'R Phase Fault';
        break;
      case 2:
        message = 'Y phase fault detected. Please check.';
        label = 'Y Phase Fault';
        break;
      case 3:
        message = 'B phase fault detected. Please check.';
        label = 'B Phase Fault';
        break;
      case 4:
        message = 'Phase reverse detected.';
        label = 'Phase Reverse';
        severity = 'warning';
        break;
      case 5:
        message = 'No power detected.';
        label = 'No Power';
        break;
    }

    activeFaults.push({
      key: `power_${powerFaultCode}`,
      message,
      label,
      severity,
    });
  }

  // 2. Pump 1 Fault (Register 42)
  const pump1Fault = parsedData['42'];
  if (pump1Fault !== undefined && pump1Fault > 0) {
    activeFaults.push({
      key: `pump1_${pump1Fault}`,
      message: 'Pump one fault detected.',
      label: `Pump 1 Fault (Code ${pump1Fault})`,
      severity: 'error',
    });
  }

  // 3. Pump 2 Fault (Register 43)
  const pump2Fault = parsedData['43'];
  if (pump2Fault !== undefined && pump2Fault > 0) {
    activeFaults.push({
      key: `pump2_${pump2Fault}`,
      message: 'Pump two fault detected.',
      label: `Pump 2 Fault (Code ${pump2Fault})`,
      severity: 'error',
    });
  }

  // 4. Pump 3 Fault (Register 44)
  const pump3Fault = parsedData['44'];
  if (pump3Fault !== undefined && pump3Fault > 0) {
    activeFaults.push({
      key: `pump3_${pump3Fault}`,
      message: 'Pump three fault detected.',
      label: `Pump 3 Fault (Code ${pump3Fault})`,
      severity: 'error',
    });
  }

  // 5. Water Failure (Register 23 - Inlet Water Available: 1 is Available, 0 is Unavailable)
  const waterAvailable = parsedData['23'];
  if (waterAvailable !== undefined && waterAvailable === 0) {
    activeFaults.push({
      key: 'water_failure',
      message: 'Water supply unavailable.',
      label: 'Water Failure',
      severity: 'warning',
    });
  }

  // 6. Communication Failure (Register 29 - Transmission Connection: 1 is Connected, 0 is Disconnected)
  const transmissionConnection = parsedData['29'];
  if (transmissionConnection !== undefined && transmissionConnection === 0) {
    activeFaults.push({
      key: 'comm_failure',
      message: 'Communication failure detected.',
      label: 'Communication Failure',
      severity: 'error',
    });
  }

  return {
    hasFault: activeFaults.length > 0,
    activeFaults,
  };
};
