import { Router, type NextFunction } from "express";
import { ZodError } from "zod";
import { ApiError } from "../errors";
import { AttemptService } from "./service";
import { attemptIdSchema, attemptInputSchema, attemptListQuerySchema } from "./validation";

function handleError(error: unknown, next: NextFunction): void {
  if (error instanceof ZodError) {
    next(new ApiError(400, "VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", ")));
    return;
  }
  next(error);
}

export function createAttemptRouter(service: AttemptService) {
  const router = Router();

  router.get("/", (req, res, next) => {
    try { res.json(service.list(attemptListQuerySchema.parse(req.query))); } catch (error) { handleError(error, next); }
  });
  router.get("/:id", (req, res, next) => {
    try { res.json(service.get(attemptIdSchema.parse(req.params.id))); } catch (error) { handleError(error, next); }
  });
  router.post("/", (req, res, next) => {
    try { res.status(201).json(service.create(attemptInputSchema.parse(req.body))); } catch (error) { handleError(error, next); }
  });
  router.put("/:id", (req, res, next) => {
    try { res.json(service.update(attemptIdSchema.parse(req.params.id), attemptInputSchema.parse(req.body))); } catch (error) { handleError(error, next); }
  });
  router.delete("/:id", (req, res, next) => {
    try { service.delete(attemptIdSchema.parse(req.params.id)); res.status(204).end(); } catch (error) { handleError(error, next); }
  });

  return router;
}
