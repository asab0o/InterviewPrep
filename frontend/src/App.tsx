import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./features/auth/RequireAuth";
import { AttemptDetailPage } from "./routes/AttemptDetailPage";
import { AttemptFormPage } from "./routes/AttemptFormPage";
import { AttemptListPage } from "./routes/AttemptListPage";
import { DashboardPage } from "./routes/DashboardPage";
import { EntryRedirect } from "./routes/EntryRedirect";
import { LoginPage } from "./routes/LoginPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { ReviewPage } from "./routes/ReviewPage";

const protectedLayout = <RequireAuth><Layout /></RequireAuth>;

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: protectedLayout,
    children: [
      { path: "/", element: <EntryRedirect /> },
      { path: "/review", element: <ReviewPage /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/attempts", element: <AttemptListPage /> },
      { path: "/attempts/new", element: <AttemptFormPage /> },
      { path: "/attempts/:id", element: <AttemptDetailPage /> },
      { path: "/attempts/:id/edit", element: <AttemptFormPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
