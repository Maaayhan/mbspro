export class FhirHttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public outcome?: any, // HAPI OperationOutcome
    public contentType?: string,
    public raw?: string
  ) {
    super(`FHIR ${status} ${statusText}`);
    this.name = "FhirHttpError";
  }
}
