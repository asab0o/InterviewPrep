import { Link } from "react-router-dom";
export function NotFoundPage() {
  return <main className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold">ページが見つかりません</h1><Link to="/" className="mt-4 inline-block text-blue-600">ホームへ戻る</Link></div></main>;
}
