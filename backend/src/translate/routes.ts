import { Router, type NextFunction } from "express";
import { z, ZodError } from "zod";
import { ApiError } from "../errors";
import { TranslateService } from "./service";

const translateRequestSchema = z.object({
  english: z.string().trim().min(1, "english is required").max(500, "english must be 500 characters or fewer"),
}).strict();

function handleError(error: unknown, next: NextFunction): void {
  if (error instanceof ZodError) {
    next(new ApiError(400, "VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", ")));
    return;
  }
  next(error);
}

export function createTranslateRouter(service: TranslateService) {
  const router = Router();

  router.post("/", (req, res, next) => {
    let english: string;
    try {
      ({ english } = translateRequestSchema.parse(req.body));
    } catch (error) {
      handleError(error, next);
      return;
    }

    service.translate(english)
      .then((result) => res.json(result))
      .catch(next);
  });

  return router;
}
