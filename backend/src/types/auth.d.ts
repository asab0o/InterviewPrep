declare global {
  namespace Express {
    interface User extends import("../auth/user").AuthUser {}
  }
}

export {};
