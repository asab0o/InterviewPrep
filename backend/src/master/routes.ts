import { Router, type NextFunction } from "express";
import { z, ZodError } from "zod";
import { ApiError } from "../errors";
import { MasterService } from "./service";

const problemIdSchema = z.coerce.number().int().positive();
const problemListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
}).strict();

function handleError(error: unknown, next: NextFunction): void {
  if (error instanceof ZodError) {
    next(new ApiError(400, "VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", ")));
    return;
  }
  next(error);
}

export function createMasterRouter(service: MasterService) {
  const router = Router();

  router.get("/categories", (_req, res) => res.json(service.listCategories()));
  router.get("/problems", (req, res, next) => {
    try {
      const { categoryId } = problemListQuerySchema.parse(req.query);
      res.json(service.listProblems(categoryId));
    } catch (error) {
      handleError(error, next);
    }
  });
  router.get("/problems/:id", (req, res, next) => {
    try {
      res.json(service.getProblem(problemIdSchema.parse(req.params.id)));
    } catch (error) {
      handleError(error, next);
    }
  });

  return router;
}
