import type { GithubConfig } from "../config";

export type GithubGetFileResult = { sha: string } | null;
export type GithubPutFileResult = { commitUrl: string; sha: string };

// GitHub Contents APIへの薄いラッパ。GithubServiceはこのインターフェースにのみ依存するため、
// テストでは実通信をせずモック実装を注入できる（Anthropic呼び出しと同じDI思想）。
export type GithubClient = {
  getFile(path: string): Promise<GithubGetFileResult>;
  putFile(path: string, content: string, message: string, sha?: string): Promise<GithubPutFileResult>;
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
  };
}

function encodeContentsPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
