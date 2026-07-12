import { useParams } from "react-router-dom";
import { PagePlaceholder } from "../components/PagePlaceholder";
export function AttemptFormPage() {
  const { id } = useParams();
  return <PagePlaceholder title={id ? "Edit attempt" : "New attempt"} description="解答、英語フレーズ、文字起こし、振り返りを記録します。" />;
}
