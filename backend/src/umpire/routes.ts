import { Router, type NextFunction } from "express";
import { z, ZodError } from "zod";
import { ApiError } from "../errors";
import { UmpireService } from "./service";

const problemIdSchema = z.coerce.number().int().positive();

const generateUmpireRequestSchema = z.object({
  problemStatement: z.string().trim().min(1, "problemStatement is required")
    .max(20000, "problemStatement must be 20000 characters or fewer"),
  force: z.boolean().optional(),
}).strict();

const previewUmpireRequestSchema = z.object({
  problemStatement: z.string().trim().min(1, "problemStatement is required")
    .max(20000, "problemStatement must be 20000 characters or fewer"),
}).strict();

function handleError(error: unknown, next: NextFunction): void {
  if (error instanceof ZodError) {
    next(new ApiError(400, "VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", ")));
    return;
  }
  next(error);
}

export function createUmpireRouter(service: UmpireService) {
  const router = Router();

  router.post("/problems/:id/umpire", (req, res, next) => {
    let id: number;
    let problemStatement: string;
    let force: boolean | undefined;
    try {
      id = problemIdSchema.parse(req.params.id);
      ({ problemStatement, force } = generateUmpireRequestSchema.parse(req.body));
    } catch (error) {
      handleError(error, next);
      return;
    }

    service.generateForProblem(id, problemStatement, force === true)
      .then((result) => res.json(result))
      .catch(next);
  });

  router.post("/umpire/preview", (req, res, next) => {
    let problemStatement: string;
    try {
      ({ problemStatement } = previewUmpireRequestSchema.parse(req.body));
    } catch (error) {
      handleError(error, next);
      return;
    }

    service.preview(problemStatement)
      .then((result) => res.json(result))
      .catch(next);
  });

  return router;
}
