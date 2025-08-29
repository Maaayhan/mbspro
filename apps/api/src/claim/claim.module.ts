import { Module } from "@nestjs/common";
import { ClaimController } from "./claim.controller";
import { ClaimService } from "./claim.service";
import { SupabaseService } from "../services/supabase.service";

@Module({
  controllers: [ClaimController],
  providers: [ClaimService, SupabaseService],
  exports: [ClaimService],
})
export class ClaimModule {}
