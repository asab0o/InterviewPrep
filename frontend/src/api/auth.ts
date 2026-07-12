import type { MeResponse } from "../types/api";
import { apiRequest } from "./client";

export const getMe = () => apiRequest<MeResponse>("/auth/me");
export const logout = () => apiRequest<void>("/auth/logout", { method: "POST" });
