import { Module } from '@nestjs/common';
import { BoosterRegisterParserService } from './booster-register-parser.service';

@Module({
  providers: [BoosterRegisterParserService],
  exports: [BoosterRegisterParserService],
})
export class ParserModule {}
