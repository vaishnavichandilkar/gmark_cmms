import { Injectable } from '@nestjs/common';

@Injectable()
export class BoosterRegisterParserService {
  parse(deviceId: string, registers: any[]) {
    const reg = (registerNo: number) => {
      const offsetRegisterStr = String(registerNo - 1);
      const found = registers.find(r => String(r.register) === offsetRegisterStr);
      return found ? Number(found.value) : 0;
    };

    return {
      deviceId,
      deviceActive: reg(1) === 1,
      motor1Status: reg(2) === 1,
      motor2Status: reg(3) === 1,
      motor3Status: reg(4) === 1,
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
      motor3RCurrent: reg(17),
      motor3YCurrent: reg(18),
      motor3BCurrent: reg(19),
      waterAvailable: reg(23) === 1,
      pressureBar: reg(28) / 10.0, // Assuming typically scaled by 10, will adjust if needed
      transmitterConnected: reg(29) === 1,
      pressuremA: reg(30) / 10.0,
      pumpOnDelay: reg(31),
      nextFillingTime: reg(32),
      overloadResetDelay: reg(33),
      underloadResetDelay: reg(34),
      tankStatus: reg(35) === 1,
      pump1FaultType: reg(42),
      pump2FaultType: reg(43),
      pump3FaultType: reg(44),
      motor1RunTime: reg(46),
      motor2RunTime: reg(47),
      motor3RunTime: reg(48),
    };
  }
}
