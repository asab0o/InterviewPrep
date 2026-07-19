import type { GithubConfig } from "../config";

export type GithubGetFileResult = { sha: string } | null;
export type GithubPutFileResult = { commitUrl: string; sha: string };
export type GithubDirEntry = { name: string; type: "file" | "dir" };

// GitHub Contents API・Commits APIへの薄いラッパ。GithubServiceはこのインターフェースにのみ
// 依存するため、テストでは実通信をせずモック実装を注入できる（Anthropic呼び出しと同じDI思想）。
// listDirectory/getLastCommitDateは過去データインポート（5.7・scripts/import-legacy.ts）専用の
// 追加メソッド（既存のgetFile/putFileと同じ設計思想：404はnull、非2xxは汎用Error＋ステータスのみログ）。
export type GithubClient = {
  getFile(path: string): Promise<GithubGetFileResult>;
  putFile(path: string, content: string, message: string, sha?: string): Promise<GithubPutFileResult>;
  listDirectory(path: string): Promise<GithubDirEntry[] | null>;
  getLastCommitDate(path: string): Promise<string | null>;
};

const API_VERSION = "2022-11-28";

// @octokit/rest ではなく素のfetch（Node24はグローバルfetchあり）で実装する。
// Contents APIはGET/PUTの2エンドポイントしか使わず、@octokit/restを追加しても薄いラッパ以上の
// 恩恵が薄い一方、依存が1つ増えることでDI境界（GithubClientインターフェース）の見通しが
// かえって悪くなるため、依存を増やさない方針を採った。
export function createFetchGithubClient(config: GithubConfig): GithubClient {
  const baseUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents`;
  const headers = {
    Authorization: `Bearer ${config.pushToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
  };

  return {
    async getFile(path: string): Promise<GithubGetFileResult> {
      const response = await fetch(`${baseUrl}/${encodeContentsPath(path)}`, { headers });
      if (response.status === 404) return null;
      if (!response.ok) {
        // レスポンスボディ・トークンは出力しない。ステータスコードのみ残し、401/403（トークン失効）・
        // 429（レート制限）・5xx（一時障害）を運用時に判別できるようにする（クライアントには
        // GithubServiceが502 GITHUB_CHECK_FAILEDとして正規化して返すため、詳細はここでのみ確認する）。
        console.error(`[github] getFile failed with status ${response.status}`);
        throw new Error(`GitHub getFile failed with status ${response.status}`);
      }
      const body = (await response.json()) as { sha: string };
      return { sha: body.sha };
    },

    async putFile(path: string, content: string, message: string, sha?: string): Promise<GithubPutFileResult> {
      const response = await fetch(`${baseUrl}/${encodeContentsPath(path)}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          content: Buffer.from(content, "utf-8").toString("base64"),
          ...(sha ? { sha } : {}),
        }),
      });
      if (!response.ok) {
        // getFileと同様、ステータスコードのみサーバーログに残す（ボディ・トークンは出力しない）。
        console.error(`[github] putFile failed with status ${response.status}`);
        throw new Error(`GitHub putFile failed with status ${response.status}`);
      }
      const body = (await response.json()) as { content: { sha: string }; commit: { html_url: string } };
      return { commitUrl: body.commit.html_url, sha: body.content.sha };
    },

    // Contents APIはディレクトリパスに対してGETすると要素の配列を返す（ファイルパスなら単一オブジェクト）。
    // import-legacyは常にディレクトリパス（problems/ とその直下）にのみ呼ぶため、配列以外は異常として扱う。
    async listDirectory(path: string): Promise<GithubDirEntry[] | null> {
      const response = await fetch(`${baseUrl}/${encodeContentsPath(path)}`, { headers });
      if (response.status === 404) return null;
      if (!response.ok) {
        console.error(`[github] listDirectory failed with status ${response.status}`);
        throw new Error(`GitHub listDirectory failed with status ${response.status}`);
      }
      const body: unknown = await response.json();
      if (!Array.isArray(body)) {
        throw new Error(`GitHub listDirectory expected a directory listing at "${path}"`);
      }
      return (body as Array<{ name: string; type: string }>).map((entry) => ({
        name: entry.name,
        type: entry.type === "dir" ? "dir" : "file",
      }));
    },

    // Commits API（?path=...&per_page=1）でそのファイルの最終コミット日時を取得する。
    // インポート時のAttempt.dateの代用に使う（設計書02-api-design.md 359行）。
    async getLastCommitDate(path: string): Promise<string | null> {
      const commitsUrl =
        `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/commits` +
        `?path=${encodeURIComponent(path)}&per_page=1`;
      const response = await fetch(commitsUrl, { headers });
      if (response.status === 404) return null;
      if (!response.ok) {
        console.error(`[github] getLastCommitDate failed with status ${response.status}`);
        throw new Error(`GitHub getLastCommitDate failed with status ${response.status}`);
      }
      const body = (await response.json()) as Array<{ commit: { committer?: { date?: string }; author?: { date?: string } } }>;
      const date = body[0]?.commit.committer?.date ?? body[0]?.commit.author?.date;
      return date ?? null;
    },
  };
}

function encodeContentsPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
