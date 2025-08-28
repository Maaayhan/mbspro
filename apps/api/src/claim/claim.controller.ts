import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ClaimService } from "./claim.service";
import { BuildClaimDto } from "./dto/build-claim.dto";
import { SubmitBundleDto } from "./dto/submit-bundle.dto";

@Controller("claim")
export class ClaimController {
  constructor(private readonly svc: ClaimService) {}

  @Post("build")
  @HttpCode(200)
  async build(@Body() dto: BuildClaimDto) {
    return this.svc.buildClaim(dto);
  }

  @Post("submit")
  @HttpCode(200)
  async submit(@Body() dto: BuildClaimDto) {
    return this.svc.buildAndSubmit(dto);
  }

  @Post("bundle/submit")
  @HttpCode(200)
  async bundle(@Body() dto: SubmitBundleDto) {
    return this.svc.submitBundle(dto);
  }
}
