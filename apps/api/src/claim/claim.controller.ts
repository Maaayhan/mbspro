import { Body, Controller, HttpCode, Post, Get, Query, Param } from "@nestjs/common";
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

  @Get("stats")
  @HttpCode(200)
  async getStats() {
    return this.svc.getClaimsStats();
  }

  @Get()
  @HttpCode(200)
  async getAllClaims(
    @Query("_count") count?: string,
    @Query("_sort") sort?: string,
    @Query("patient") patient?: string,
    @Query("_lastUpdated") lastUpdated?: string
  ) {
    const params: any = {};
    if (count) params._count = count;
    if (sort) params._sort = sort;
    if (patient) params.patient = patient;
    if (lastUpdated) params._lastUpdated = lastUpdated;

    return this.svc.getAllClaims(params);
  }

  @Get("patient/:patientId")
  @HttpCode(200)
  async getPatientClaims(@Param("patientId") patientId: string) {
    return this.svc.getPatientClaims(patientId);
  }
}
