import { Injectable } from '@nestjs/common';

@Injectable()
export class BoosterRegisterParserService {
  // NOTE: The latest BMS Register Mapping document is the authoritative source of truth.
  // This service extracts telemetry properties using the exact 0-based register indices.
  parse(deviceId: string, registers: any[]) {
    const reg = (registerNo: number) => {
      const found = registers.find((r) => Number(r.register) === registerNo);
      return found ? Number(found.value) : 0;
    };

    return {
      deviceId,
      deviceActive: reg(0) > 0,
      motor1Status: reg(1) > 0,
      motor2Status: reg(2) > 0,
      motor3Status: reg(3) > 0,
      motor4Status: reg(4) > 0,
      inputPowerFaultType: reg(5),
      averageVoltage: reg(6),
      ryVoltage: reg(7),
      ybVoltage: reg(8),
      rbVoltage: reg(9),
      motor1RCurrent: reg(10),
      motor1YCurrent: reg(11),
      motor1BCurrent: reg(12),
      motor2RCurrent: reg(13),
      motor2YCurrent: reg(14),
      motor2BCurrent: reg(15),
      motor3RCurrent: reg(16),
      motor3YCurrent: reg(17),
      motor3BCurrent: reg(18),
      motor4RCurrent: reg(19),
      motor4YCurrent: reg(20),
      motor4BCurrent: reg(21),
      pressureSwitch1: reg(22) > 0,
      pressureSwitch2: reg(23) > 0,
      pressureSwitch3: reg(24) > 0,
      pressureSwitch4: reg(25) > 0,
      pressureSwitch5: reg(26) > 0,
      pressureBar: reg(27) / 10.0,
      transmitterConnected: reg(28) > 0,
      pressuremA: reg(29) / 10.0,
      pumpOnDelay: reg(30),
      nextFillingTime: reg(31),
      overloadResetDelay: reg(32),
      underloadResetDelay: reg(33),
      vfdResetAfter: reg(34),
      waterAvailable: reg(35) > 0,
      pressureTankPressure: reg(36),
      pump1FaultType: reg(43),
      pump2FaultType: reg(44),
      pump3FaultType: reg(45),
      pump4FaultType: reg(46),
      motor1RunTime: reg(47),
      motor2RunTime: reg(48),
      motor3RunTime: reg(49),
      motor4RunTime: reg(50),
      motor1ConfigActivate: reg(89) > 0,
      motor2ConfigActivate: reg(90) > 0,
      motor3ConfigActivate: reg(91) > 0,
      motor4ConfigActivate: reg(92) > 0,
    };
  }
}
