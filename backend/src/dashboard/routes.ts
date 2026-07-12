import { Router, type NextFunction } from "express";
import { z, ZodError } from "zod";
import { ApiError } from "../errors";
import { DashboardService } from "./service";

const trendQuerySchema = z.object({
  granularity: z.enum(["weekly", "monthly"]),
}).strict();

function handleError(error: unknown, next: NextFunction): void {
  if (error instanceof ZodError) {
    next(new ApiError(400, "VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", ")));
    return;
  }
  next(error);
}

export function createDashboardRouter(service: DashboardService) {
  const router = Router();

  router.get("/coverage", (_req, res) => res.json(service.coverage()));
  router.get("/trend", (req, res, next) => {
    try {
      const { granularity } = trendQuerySchema.parse(req.query);
      res.json(service.trend(granularity));
    } catch (error) {
      handleError(error, next);
    }
  });
  return router;
}
