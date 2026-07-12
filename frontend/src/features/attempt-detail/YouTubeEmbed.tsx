import { getSafeHttpUrl, getYouTubeVideoId } from "../../lib/youtube";

export function YouTubeEmbed({ url }: { url: string }) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) {
    const safeUrl = getSafeHttpUrl(url);
    return <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">YouTube URLを認識できないため埋め込み再生できません。 {safeUrl && <a href={safeUrl} target="_blank" rel="noreferrer" className="font-semibold underline">URLを開く</a>}</div>;
  }
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-slate-950">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="Practice video"
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
