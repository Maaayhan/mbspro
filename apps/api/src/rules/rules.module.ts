import { Module } from "@nestjs/common";
import { RulesService } from "./rules.service";
import { RulesController } from "./rules.controller";

@Module({
  controllers: [RulesController],
  providers: [RulesService],
})
export class RulesModule {}
