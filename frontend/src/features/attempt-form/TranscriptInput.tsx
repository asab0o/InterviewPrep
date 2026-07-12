import { useFormContext } from "react-hook-form";
import { useFileText } from "../../hooks/useFileText";
import type { AttemptFormValues } from "./schema";

export function TranscriptInput() {
  const { register, setValue } = useFormContext<AttemptFormValues>();
  const file = useFileText((text) => setValue("transcript", text, { shouldDirty: true }));
  return (
    <label className="block text-sm font-medium text-slate-700">文字起こし
      <input type="file" accept=".txt,text/plain" onChange={(event) => void file.readFile(event.target.files?.[0])} className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium" />
      {file.error && <span role="alert" className="mt-1 block text-xs text-red-600">{file.error}</span>}
      <textarea {...register("transcript")} rows={7} className="mt-2 block w-full rounded-lg border-slate-300 text-sm" placeholder=".txtを読み込むか、直接貼り付けてください" />
    </label>
  );
}
