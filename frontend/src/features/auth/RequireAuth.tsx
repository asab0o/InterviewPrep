import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useMe } from "./useMe";

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const me = useMe();
  if (me.isPending) return <StatusScreen message="ログイン状態を確認しています…" />;
  if (me.error instanceof ApiError && me.error.status === 401) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (me.isError) return <StatusScreen message="サーバーに接続できませんでした。時間をおいて再読み込みしてください。" />;
  return children;
}

function StatusScreen({ message }: { message: string }) {
  return <main className="grid min-h-screen place-items-center p-6 text-center text-sm text-slate-600">{message}</main>;
}
