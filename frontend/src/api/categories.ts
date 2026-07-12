import type { Category } from "../types/api";
import { apiRequest } from "./client";

export const getCategories = () => apiRequest<Category[]>("/api/categories");
