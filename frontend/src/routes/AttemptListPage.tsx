import { Link } from "react-router-dom";
import { PagePlaceholder } from "../components/PagePlaceholder";
export function AttemptListPage() {
  return <PagePlaceholder title="Attempts" description="過去の挑戦を日付順に確認し、カテゴリーや問題で絞り込みます。"><Link to="/attempts/new" className="font-semibold text-blue-600">最初の記録を作成する →</Link></PagePlaceholder>;
}
