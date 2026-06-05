import { Injectable } from '@nestjs/common';

@Injectable()
export class BoosterRegisterParserService {
  parse(deviceId: string, registers: number[]) {
    const reg = (registerNo: number) => registers[registerNo - 1] || 0;

    return {
      deviceId,
      deviceActive: reg(1) === 1,
      motor1Status: reg(2) === 1,
      motor2Status: reg(3) === 1,
      inputPowerFaultType: reg(6),
      averageVoltage: reg(7),
      ryVoltage: reg(8),
      ybVoltage: reg(9),
      rbVoltage: reg(10),
      motor1RCurrent: reg(11),
      motor1YCurrent: reg(12),
      motor1BCurrent: reg(13),
      motor2RCurrent: reg(14),
      motor2YCurrent: reg(15),
      motor2BCurrent: reg(16),
      waterAvailable: reg(23) === 1,
      pressureBar: reg(28) / 10.0, // Assuming typically scaled by 10, will adjust if needed
      transmitterConnected: reg(29) === 1,
      pressuremA: reg(30) / 10.0,
      pumpOnDelay: reg(31),
      nextFillingTime: reg(32),
      overloadResetDelay: reg(33),
      underloadResetDelay: reg(34),
      tankStatus: reg(36) === 1,
      pump1FaultType: reg(37),
      pump2FaultType: reg(38),
      motor1RunTime: reg(41),
      motor2RunTime: reg(42),
    };
  }
}
