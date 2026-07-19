import { Router } from "express";
import type { QuizService } from "./service";

export function createQuizRouter(service: QuizService) {
  const router = Router();

  router.get("/today", (_req, res, next) => {
    try {
      res.json(service.today());
    } catch (error) {
      next(error);
    }
  });

  return router;
}
