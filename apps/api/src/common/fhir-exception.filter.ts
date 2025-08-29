import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { FhirHttpError } from "../claim/fhir.error";

@Catch(FhirHttpError)
export class FhirHttpExceptionFilter implements ExceptionFilter {
  catch(exception: FhirHttpError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception.status || 502;

    const payload = exception.outcome ?? {
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: exception.message,
          details: { text: (exception.raw || "").slice(0, 800) },
        },
      ],
    };

    (res as any).status(Number(status)).json(payload);
  }
}
