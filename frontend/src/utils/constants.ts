export const REGISTER_MAP: Record<string, string> = {
  '1': 'Device Activate',
  '2': 'Motor 1 ON/OFF',
  '3': 'Motor 2 ON/OFF',
  '4': 'Motor 3 ON/OFF',
  '6': 'Input Power Fault Type',
  '7': 'Average Input Supply',
  '8': 'R-Y Voltage',
  '9': 'Y-B Voltage',
  '10': 'R-B Voltage',
  '11': 'MOTOR 1 R Phase Current',
  '12': 'MOTOR 1 Y Phase Current',
  '13': 'MOTOR 1 B Phase Current',
  '14': 'MOTOR 2 R Phase Current',
  '15': 'MOTOR 2 Y Phase Current',
  '16': 'MOTOR 2 B Phase Current',
  '17': 'MOTOR 3 R Phase Current',
  '18': 'MOTOR 3 Y Phase Current',
  '19': 'MOTOR 3 B Phase Current',
  '23': 'Inlet Water Available',
  '28': 'Pressure Bar Value',
  '29': 'Transmission Connection',
  '30': 'Pressure Bar Value in mA',
  '31': 'Delay For Pump ON',
  '32': 'Next Filling Time',
  '33': 'Over Load Reset Delay',
  '34': 'Under Load Reset Delay',
  '35': 'Underground Tank Full/Empty',
  '42': 'Pump 1 Fault Type',
  '43': 'Pump 2 Fault Type',
  '44': 'Pump 3 Fault Type',
  '46': 'Motor 1 ON Time',
  '47': 'Motor 2 ON Time',
  '48': 'Motor 3 ON Time'
};

export const FAULT_LABELS: Record<string, string> = {
  '0': 'Power OK',
  '1': 'R Phase Fault',
  '2': 'Y Phase Fault',
  '3': 'B Phase Fault',
  '4': 'Phase Reverse',
  '5': 'No Power'
};

export const WRITE_COMMANDS = {
  MOTOR_AUTO_MANUAL: 94,
  MOTOR_1_ON_OFF: 39,
  MOTOR_2_ON_OFF: 40,
  MOTOR_3_ON_OFF: 41,
  MOTOR_4_ON_OFF: 42
};
