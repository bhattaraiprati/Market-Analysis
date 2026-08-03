import { Module } from '@nestjs/common';
import { WriterAgent } from './writer.agent';

@Module({
  providers: [WriterAgent],
  exports: [WriterAgent],
})
export class WriterModule {}
