import { Router, type NextFunction } from "express";
import { z, ZodError } from "zod";
import { ApiError } from "../errors";
import { GithubService } from "./service";

const checkRequestSchema = z.object({
  attemptId: z.number().int().positive(),
}).strict();

const pushRequestSchema = z.object({
  attemptId: z.number().int().positive(),
  content: z.string().min(1).max(200_000).optional(),
  force: z.boolean().optional(),
}).strict();

function handleError(error: unknown, next: NextFunction): void {
  if (error instanceof ZodError) {
    next(new ApiError(400, "VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", ")));
    return;
  }
  next(error);
}

export function createGithubRouter(service: GithubService) {
  const router = Router();

  router.post("/check", (req, res, next) => {
    let body: z.infer<typeof checkRequestSchema>;
    try {
      body = checkRequestSchema.parse(req.body);
    } catch (error) {
      handleError(error, next);
      return;
    }

    service.check(body.attemptId)
      .then((result) => res.json(result))
      .catch(next);
  });

  router.post("/push", (req, res, next) => {
    let body: z.infer<typeof pushRequestSchema>;
    try {
      body = pushRequestSchema.parse(req.body);
    } catch (error) {
      handleError(error, next);
      return;
    }

    service.push(body.attemptId, body.content, body.force === true)
      .then((result) => res.json(result))
      .catch(next);
  });

  return router;
}
