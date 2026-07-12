import { useParams } from "react-router-dom";
import { PagePlaceholder } from "../components/PagePlaceholder";
export function AttemptDetailPage() {
  const { id } = useParams();
  return <PagePlaceholder title={`Attempt #${id ?? ""}`} description="解答記録の詳細を表示します。" />;
}
