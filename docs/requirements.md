# 海外就活準備アプリ 要件定義書（v1.0）

## 1. 背景・目的
日本在住で海外就活（技術面接）準備をしている個人が、以下の分散した作業を1つのWebアプリに統合し、
- 学習の一元管理
- 進捗のカテゴリー別可視化
を実現する。

## 2. 現状のフローと課題

| # | ステップ | 現状ツール | 課題 |
|---|---------|-----------|------|
| 1 | 問題ピックアップ | NeetCode | どの問題をやったか一覧化されていない |
| 2 | コード作成 | Obsidian（テンプレート） | メモと進捗が分離 |
| 3 | 解答を録画 | Zoom | 録画とその問題の紐付けが手動 |
| 4 | UMPIRE解説生成 | ChatGPT/Claude（プロンプト） | 出力の保存・活用が個別管理 |
| 5 | メモをアップ | GitHub | 手動push |
| 6 | 動画をアップ | YouTube | 手動upload、リンク管理なし |
| - | 進捗確認 | なし | カテゴリー別消化状況が見えない |

## 3. ゴール（あるべき姿）
1つのWebアプリで「問題を選ぶ → 解く → 解説を生成 → メモを残す → 記録が残る → 進捗がグラフで見える」までが完結する。

## 4. 対象ユーザー
本人（単一ユーザー）。将来的なマルチユーザー化は現時点でスコープ外。

## 5. 機能要件

MVP（フェーズ1）で実装する機能と、フェーズ2以降に回す機能を明確化した。

### フェーズ1（MVP）

#### 5.1 問題マスタ【MVP】
- **NeetCode 150の問題名リストを静的マスタとしてDBに保持する**（Problemテーブル、7章参照）
- 問題のピックアップ（どれを解くか選ぶ行為）は引き続きNeetCodeサイトで行う
- 記録フォームの「問題名」はマスタからのオートコンプリート選択式にする（表記ゆれによる網羅率の狂いを防止）
- マスタ外の問題（NeetCode 150以外）も自由入力で記録可能だが、網羅率の分子にはカウントしない

#### 5.2 進捗ダッシュボード【MVP】
- カテゴリー別「網羅率」：記録済みのユニーク問題数（Problemマスタとの紐付けで判定）÷ 当該カテゴリーのマスタ問題総数
- カテゴリー別「総アタック数」：同一問題の複数回挑戦も含めた記録の総件数（復習量の可視化）
- 週次／月次の学習量推移
- 初期リリースでは以下7カテゴリーのみをマスタに投入（残りのNeetCode 150カテゴリーは今後追加予定）：
  Arrays and Hashing (9), Two Pointers (5), Sliding Window (6), Stack (6), Binary Search (7), Linked List (11), Trees (15)
- カテゴリー・問題はDBのマスタテーブルとして管理するため、**アプリのコードを変更せずに行を追加するだけで拡張可能**（後述7章参照）

#### 5.3 解答記録【MVP】
記録フォームの入力項目（確定）：
- 日にち（date）
- カテゴリー（category）：プルダウン固定（事前登録リストから選択。初期は7カテゴリー、5.2参照）
- 問題名（problem）：Problemマスタからのオートコンプリート選択（カテゴリー選択で候補を絞り込み）。マスタ外の問題は自由入力も可
- コードブロック（code）：プレーンテキストエリア（縦長・複数行のコードを書きやすいサイズ、シンタックスハイライト不要）
- 覚えたい英語（english_phrases）：**英語＋日本語訳のペアをリスト入力**
  - 英語フレーズを入力欄に入力
  - Anthropic API（Claude）が日本語訳を自動サジェスト（提案として表示）。翻訳には安価で高速なHaiku系モデルを使用
  - サジェストされた訳をそのまま採用するか、手動で書き換えるかを選べる
  - 「追加」ボタンで英語＋日本語のペアを確定し、「Phrases to remember」見出しの下に一覧表示
  - 追加後は入力欄がリセットされ、次の文をすぐ入力できる
  - 一覧内の各フレーズ（ペア）は削除可能（入力ミス修正のため）
  - 保存先は独立した`Phrase`テーブル（5.6のフラッシュカード復習で横断的に参照するため。7章参照）
- Video URL（video_url）：任意項目。登録時にYouTube URLが分かっていればその場で入力してよい。まだ動画がない場合は空欄で保存し、後から同じ記録を編集して貼り付ければよい（5.8参照）
- 文字起こし（transcript）：任意項目。録画を話した内容の書き起こしテキスト（プレーンテキストエリア）。入力方法は以下の2通り：
  1. **ファイルから読み込み**：`<input type="file">` + ブラウザのFile APIで、`leetcode-interview-prep`リポジトリの`transcribe.sh`が生成した`.txt`ファイルをローカルから選択し、その場でテキストエリアに読み込む（サーバーへのファイルアップロードではなく、ブラウザ内で完結する読み込み。この方式ならバックエンドがどこでホストされていても関係なく動く）
  2. **手動貼り付け**：テキストエリアに直接ペースト
  - **文字起こしの生成自体はこのアプリでは行わない**（後述の実装注記参照）。あくまで、すでに`leetcode-interview-prep`側のワークフロー（`/practice-wrapup`または`transcribe.sh`単体）で生成済みのテキストを取り込んで保存・閲覧できるようにするだけ
  - オンデバイス音声認識（macOS 26 SpeechAnalyzer）の特性上、フィラー（uh, um）や言い淀みがそのまま文字起こしに残ることがあるが、これは「詰まった箇所」のシグナルとして意図的にそのまま保持する（加工・整形はしない）

**実装注記（重要な制約）**：文字起こしスクリプト（`leetcode-interview-prep/scripts/transcribe.sh`）はmacOS 26のSpeechAnalyzer（Swift）を使ったオンデバイス処理であり、**macOS専用**。本アプリのバックエンド（Express）は将来AWS Lightsail（Linux）にデプロイする計画があるため、バックエンド側でこのスクリプトを直接実行する設計にはしない。文字起こしの実行は常にユーザー自身のMac上でローカルに行い、生成された`.txt`をアプリ側（ブラウザのFile API経由）で読み込んで保存するだけ、という役割分担を徹底する。これによりバックエンドがlocalhostで動いていてもAWS Lightsailに載っていても、この機能の動作は変わらない。

#### 5.4 GitHub連携【MVP】
- アプリ内でメモ・コードを編集
- 「Pushボタン」で該当リポジトリへ手動push（自動pushはしない＝誤送信防止のため意図的に手動）
- **既存のリポジトリ（asab0o/leetcode-interview-prep）と連携**（新規作成しない）
- **リポジトリ構成（確定）**：
  ```
  problems/
  ├── array-hashmap/
  ├── two-pointers/
  ├── stack/
  ├── binary-search/
  ├── sliding-window/
  ├── linked-list/
  ├── trees/
  ```
  Categoryマスタに`slug`フィールドを持ち、フォルダ名と対応させる（例：Arrays and Hashing → `array-hashmap`）
- **ファイル命名規則（今後の新規分）**：スペースを使わずkebab-caseで統一
  - 初回：`{番号}-{問題名スラッグ}.md`（例：`125-valid-palindrome.md`）
  - 2回目以降の再挑戦：末尾に連番（例：`125-valid-palindrome-2.md`）
  - 既存ファイル（`125. Valid Palindrome.md`等スペース入り）はリネームせずそのまま残す
- **競合回避ルール**：アプリが作成したファイルはアプリからのみ更新する。既存ファイル（Obsidian時代のもの）はアプリから触らない。ローカルからのpushとアプリからのpushが同一ファイルに重ならないようにする
- **上書き防止チェック**：push前に同一パスのファイルが既に存在するか確認し、意図しない上書き（番号の偶然の重複等）であればユーザーに警告を表示してから続行する

#### 5.5 UMPIRE解説生成【MVP】
- 記録フォーム内に問題文を貼り付ける欄を用意し、Anthropic API（Claude）経由で既存のUMPIREプロンプトを実行
- 生成結果は記録フォームと**同じ画面内**に表示し、「覚えたい英語」の入力と並行して参照できるようにする
- 生成結果はProblemマスタに保存し（マスタ外問題はAttemptに保存）、後から見返せるようにする
- コスト目安：1回あたり約$0.02〜0.04（Claude Sonnet系、2026年7月時点の料金）。個人利用では月$1〜数ドル程度で無視できる水準
- **生成結果の再利用**：UMPIRE解説はProblemマスタに1問1件で保存される。同一問題で既に生成済みの場合は保存済みの解説をそのまま表示し、再生成しない（コスト・待ち時間の削減）。明示的に「再生成」ボタンを押した場合のみ新規生成してProblem側の内容を上書きする
- **生成結果からのフレーズ追加**：UMPIRE解説パネル内のテキストを選択すると「Add to phrases」ポップアップが表示され、クリックすると選択した英文が5.3の入力欄にセットされる（続けて日本語訳のサジェスト→確定の流れに乗る）
- **問題タイトルの自動連携**：5.3の「問題名（problem_title）」欄に入力したタイトルを、UMPIRE解説パネルの「問題文貼り付け」欄の先頭行に自動反映する（例：`Merge Two Sorted Lists` と入力すると、問題文欄の1行目に自動挿入される）。問題文の本文部分はそのまま貼り付けを続けられる

#### 5.6 フラッシュカード復習【MVP】
- 課題感：フレーズを登録しても見直さないまま放置されてしまう
- **トリガー**：1日のうちアプリを最初に開いたタイミングで自動的に出題（2回目以降のアクセスでは出題しない）。「1日」の判定は**日本時間（JST）基準**で行い、サーバー側のQuizLogテーブルで管理する（別デバイスからのアクセスでも正しく判定される）
- **出題数**：ストックされている全フレーズから**完全ランダムに3問**選出（ストックが3件未満の場合はある分だけ出題、0件ならスキップ）
- **出題形式**：フラッシュカード形式
  1. 日本語訳を先に表示
  2. タップ／クリックで英語フレーズを表示（裏返す動き）
  3. 「次へ」で2問目に進む
  4. 3問終わったら、**完了メッセージは表示せずそのままダッシュボードへ遷移**する
- **クローズボタン**：画面左上に配置し、いつでも押すとその時点でダッシュボードへ遷移できる（3問終わっていなくても中断可能）
- 出題対象はカテゴリー・記録日を問わず、全Phraseレコードから横断的に選出

#### 5.7 過去データのインポート【MVP・開発時の一回限り】
- Obsidian時代の既存記録（GitHubリポジトリ`problems/`配下のMarkdownファイル）を、開発段階でアプリのDBに初期データとして投入する
- GitHubへの再pushは不要（既にpush済み）。あくまでDBにAttemptレコードとして取り込み、ダッシュボードの網羅率・アタック数に過去分を反映させることが目的
- 取り込み方法：リポジトリのファイル一覧からファイル名（問題番号・問題名・再挑戦連番）とフォルダ名（カテゴリー）を解析してAttemptを生成する一回限りのスクリプトを想定
- ファイル名から取得できない情報（日付など）はファイルのコミット日時で代用、フレーズ等は空でよい

#### 5.8 記録の閲覧【MVP】
- **記録一覧**：過去のAttemptを日付順に一覧表示。カテゴリー・問題名での絞り込みが可能
- **記録詳細**：一覧から選択すると、その記録の全内容を閲覧できる
  - 日付・カテゴリー・問題名・コード・登録フレーズ（英日ペア）・UMPIRE解説・文字起こし
  - **YouTube動画の埋め込み再生**：AttemptにYouTube URLが登録されていれば、詳細画面内にiframe埋め込みプレイヤーを表示してその場で再生できる
  - Video URL欄は記録フォーム（5.3）に最初から用意されており、記録時点では空欄で保存し、YouTubeアップロード後に同じ記録を編集してURLを貼る運用（フェーズ2の自動アップロード実装後は自動で紐付く）
  - 注意：埋め込み再生には動画の公開設定が「公開」または「限定公開（unlisted）」である必要がある（「非公開」は再生不可）。面接練習動画は限定公開を推奨
  - **文字起こしの表示**：登録されていれば、動画プレイヤーの下（または横）に文字起こし全文を表示する。長文になりうるため折りたたみ／展開表示にする。UMPIREのお手本解説と読み比べやすいよう、同一画面内に並べて配置する
- 詳細画面から編集モードに移行できる（記録フォームを既存データ入りで開く）

### フェーズ2（拡張）

#### 5.9 英語学習メモの一覧・検索ビュー【フェーズ2】
- MVPの「フラッシュカード復習」（5.6）はランダム3問の軽い出題のみ
- フェーズ2では、全フレーズを一覧化して検索・絞り込みできるビュー（単語帳の閲覧・棚卸し用途）や、間違えた／復習回数の少ないフレーズを優先出題するロジックを追加

#### 5.10 YouTube自動アップロード
- 録画ファイルをアプリからYouTube Data API経由で自動アップロード
- アップロード後、動画URLを自動でAttemptレコードに紐付け

## 6. 非機能要件
- 認証：GitHub OAuthでログイン（GitHub連携をそのまま認証にも利用）
- レスポンシブ：必須。スマホから進捗ダッシュボードを閲覧できること（編集はPC中心でも可）
- ホスティング：AWS（クレジット活用、**クレジット枯渇後も低コストで維持できる軽量構成**）
  - フロント：AWS Amplify Hosting（React SPA、無料枠内でほぼ収まる）
  - バックエンド＋DB：**AWS Lightsail の小型インスタンス1台**（月$5〜程度）にNode.js/Express＋**SQLite**を同居させる構成を第一候補とする
    - 単一ユーザー・低トラフィックのためSQLiteで十分。永続ディスク上にDBファイルを置き、定期バックアップ（S3へのスナップショット等）を設定
    - 将来マルチユーザー化や負荷増があればRDS (PostgreSQL)へ移行（SQLite→Postgresはスキーマ互換性が高く移行しやすい）
- **APIキーの管理**：Anthropic API・GitHub OAuthのクライアントシークレット等は、すべてバックエンド（Express）側の環境変数として保持する。フロントエンド（React SPA）には一切埋め込まない。UMPIRE生成・翻訳サジェストは必ずExpress経由でAnthropic APIを呼び出し、ブラウザから直接APIキーで叩くことはしない

## 7. データモデル（MVP版）
- **Category**（マスタ。初期は7件投入、今後行を追加するだけで拡張可能）
  - id
  - name（例：Two Pointers, Stack, Trees...）
  - slug（GitHubフォルダ名。例：`two-pointers`, `array-hashmap`）
  - sort_order（プルダウン・ダッシュボードでの表示順）
  - is_active（表示/非表示の切り替え用フラグ）
  - ※網羅率の分母はProblemマスタの件数から算出するため、neetcode150_totalフィールドは不要
- **Problem**（NeetCode 150の問題マスタ。初期は7カテゴリー59問を投入）
  - id
  - category_id（Categoryへの外部キー）
  - number（LeetCode問題番号。例：125）
  - title（例：Valid Palindrome）
  - slug（ファイル名用。例：`valid-palindrome`）
  - umpire_explanation（Claude APIで生成されたUMPIRE解説の全文。1問1解説として管理し、再生成時のみ上書き。TEXTカラムで十分、Document DBは不要）
- **Attempt**（記録の基本単位）
  - id
  - date（日にち）
  - problem_id（Problemへの外部キー。マスタ外の問題の場合はnull）
  - custom_title（マスタ外の問題の場合の自由入力タイトル、任意）
  - custom_number（マスタ外の問題の場合の問題番号、手入力。GitHubファイル名生成に使用）
  - attempt_number（同一問題の何回目の挑戦か。**保存時に自動採番**：同一problem_id（またはcustom_title）の既存Attempt件数+1。手入力させない）
  - code（コードブロック、プレーンテキスト）
  - problem_statement（UMPIRE生成用に貼り付けた問題文、任意）
  - video_url（YouTube動画URL。MVPでは手動登録、フェーズ2で自動アップロード後に自動設定）
  - transcript（録画の文字起こし全文。任意、TEXTカラム。`leetcode-interview-prep`側で生成した`.txt`をブラウザのFile API経由で読み込むか、手動貼り付けで保存。5.3参照）
  - github_pushed（push済みフラグ、任意）
  - created_at / updated_at
  - ※カテゴリーはproblem_id経由でProblemマスタから取得（マスタ外の問題のみcategory_idを直接保持）
  - category_id（マスタ外問題用、任意）
  - ※UMPIRE解説はAttemptではなくProblem側で1問1件管理（上記参照）。マスタ外問題の場合はAttempt側にumpire_explanationを持たせる想定
- **Phrase**（覚えたい英語フレーズ。フラッシュカード復習の対象）
  - id
  - attempt_id（Attemptへの外部キー）
  - english_text（英語フレーズ）
  - japanese_text（日本語訳。Claude APIサジェスト or 手動入力）
  - created_at
- **QuizLog**（フラッシュカード復習の出題履歴。1日1回判定と将来の優先出題ロジックに利用）
  - id
  - shown_date（出題した日付。この日付が今日かどうかで「本日出題済みか」を判定）
  - phrase_ids（出題した3件のPhrase idの配列）
  - created_at

※フェーズ2で以下を検討：
- Phraseへのreview_count等（間違えた回数・優先出題ロジック用、5.9参照）

**実装注記**：`QuizLog.phrase_ids`のような配列項目は、SQLiteに配列型が存在しないため**JSON文字列としてTEXTカラムに保存**する（SQLiteのJSON1拡張でクエリも可能）。他の将来的なリスト項目も同様の方針とする。

## 8. 技術スタック
- フロントエンド：React（Vite）+ TypeScript + Tailwind
- バックエンド：Node.js（Express）+ TypeScript
- ホスティング：
  - フロント：AWS Amplify Hosting（静的SPAとしてデプロイ）
  - バックエンド＋DB：AWS Lightsail 小型インスタンス（Express + SQLite同居、月$5〜）
- DB：SQLite（単一ユーザー向け軽量構成。将来必要になればRDS/PostgreSQLへ移行）
- 認証：GitHub OAuth（Express側でPassport.js等を利用）
- 外部API：
  - GitHub API（push用、MVP）
  - Anthropic API（MVP）：UMPIRE生成はSonnet系、フレーズの日本語訳サジェストはHaiku系を使用
  - YouTube Data API（フェーズ2）

## 9. 決定事項サマリー
- MVPスコープ：問題マスタ（NeetCode 150）／進捗ダッシュボード（網羅率＋総アタック数）／解答記録（オートコンプリート＋英日フレーズ登録＋Video URL＋文字起こし取り込み）／UMPIRE解説生成（Problem単位で保存・再利用）／フラッシュカード復習（1日1回3問、JST基準）／GitHub手動push／過去データの一括インポート／記録閲覧（YouTube埋め込み＋文字起こし表示）
- 文字起こし：生成自体は`leetcode-interview-prep`側のmacOS専用スクリプト（Swift/SpeechAnalyzer）でローカル実行し、アプリはブラウザのFile API経由で`.txt`を読み込んで保存・表示するだけ（バックエンドのホスティング先に依存しない設計）
- GitHub連携：既存リポジトリ`problems/`配下、カテゴリ別フォルダ（kebab-case）、新規ファイルは`{番号}-{slug}.md`形式、再挑戦は自動採番で`-2`連番。既存ファイルは触らない。push前に上書き警告チェックあり
- フェーズ2：英語メモの一覧・検索ビュー／優先出題ロジック／YouTube自動アップロード
- 技術スタック：React(Vite)+TS / Node.js(Express)+TS / Amplify Hosting + Lightsail(SQLite) / GitHub OAuth
- AIモデル使い分け：UMPIRE生成=Sonnet系、翻訳サジェスト=Haiku系。APIキーはすべてバックエンド側で管理

## 10. 残る論点（すべて解決済み ✅）
- ✅ 認証：GitHub OAuth
- ✅ レスポンシブ：必須（閲覧はスマホ、編集は主にPC）
- ✅ ホスティング：AWS（Amplify Hosting + Lightsail/SQLite の軽量構成）
- ✅ GitHubリポジトリ構成：既存リポジトリ`problems/`配下・kebab-case命名で確定
- ✅ 網羅率の精度：NeetCode 150問題マスタ＋オートコンプリートで表記ゆれを防止
- ✅ 過去データ：開発時にインポートスクリプトで一括投入

## 11. 画面構成（MVP）
- ログイン後の初期表示：条件によって分岐
  - **その日まだフラッシュカード復習をしていない場合**：復習画面を先に表示（3問終了後にダッシュボードへ遷移）
  - **既に復習済みの場合**：ダッシュボード画面をそのまま表示
- 画面構成（想定5画面）
  1. フラッシュカード復習（1日1回、3問、日本語→英語の順で出題）
  2. ダッシュボード（カテゴリー別進捗グラフ、週次/月次推移）
  3. 記録フォーム＋UMPIRE解説パネル（新規登録・編集）
     - PC幅：左に記録フォーム、右にUMPIRE解説パネルの2カラム
     - スマホ幅：記録フォームが上、UMPIRE解説パネルが下の縦積み
  4. 記録一覧（日付順、カテゴリー・問題名で絞り込み）
  5. 記録詳細（コード・フレーズ・UMPIRE解説・YouTube埋め込みプレイヤーの閲覧、編集モードへの導線）

## 12. 事前準備リスト（人間側の作業・Claude Codeでは代行不可）
- AWSアカウント作成、Lightsail小型インスタンスの起動
- GitHub OAuth Appの登録（Settings > Developer settings > OAuth Apps）し、Client ID / Client Secretを発行
- Anthropic APIキーの発行（console.anthropic.com）
- 上記のシークレット類を`.env`にまとめる（下記想定変数名）：
  - `ANTHROPIC_API_KEY`
  - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
  - `GITHUB_ALLOWED_USERNAME`（単一ユーザー制限用。このGitHubユーザー名以外はログイン不可にする）
  - `SESSION_SECRET`
  - `DB_PATH`（SQLiteファイルの保存先パス）
  - `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME`（`asab0o` / `leetcode-interview-prep`）

## 13. 認証の補足
- GitHub OAuthでログイン可能なのは`GITHUB_ALLOWED_USERNAME`と一致するGitHubアカウントのみとする（単一ユーザー前提のため、それ以外のログイン試行は拒否する）

## 付録A：Problemマスタ シードデータ（NeetCode 150、7カテゴリー59問）

### Arrays and Hashing（9問）
| number | title | slug |
|---|---|---|
| 217 | Contains Duplicate | contains-duplicate |
| 242 | Valid Anagram | valid-anagram |
| 1 | Two Sum | two-sum |
| 49 | Group Anagrams | group-anagrams |
| 347 | Top K Frequent Elements | top-k-frequent-elements |
| 271 | Encode and Decode Strings | encode-and-decode-strings |
| 238 | Product of Array Except Self | product-of-array-except-self |
| 36 | Valid Sudoku | valid-sudoku |
| 128 | Longest Consecutive Sequence | longest-consecutive-sequence |

### Two Pointers（5問）
| number | title | slug |
|---|---|---|
| 125 | Valid Palindrome | valid-palindrome |
| 167 | Two Sum II - Input Array Is Sorted | two-sum-ii-input-array-is-sorted |
| 15 | 3Sum | 3sum |
| 11 | Container With Most Water | container-with-most-water |
| 42 | Trapping Rain Water | trapping-rain-water |

### Sliding Window（6問）
| number | title | slug |
|---|---|---|
| 121 | Best Time to Buy and Sell Stock | best-time-to-buy-and-sell-stock |
| 3 | Longest Substring Without Repeating Characters | longest-substring-without-repeating-characters |
| 424 | Longest Repeating Character Replacement | longest-repeating-character-replacement |
| 567 | Permutation in String | permutation-in-string |
| 76 | Minimum Window Substring | minimum-window-substring |
| 239 | Sliding Window Maximum | sliding-window-maximum |

### Stack（6問）
| number | title | slug |
|---|---|---|
| 20 | Valid Parentheses | valid-parentheses |
| 155 | Min Stack | min-stack |
| 150 | Evaluate Reverse Polish Notation | evaluate-reverse-polish-notation |
| 739 | Daily Temperatures | daily-temperatures |
| 853 | Car Fleet | car-fleet |
| 84 | Largest Rectangle in Histogram | largest-rectangle-in-histogram |

### Binary Search（7問）
| number | title | slug |
|---|---|---|
| 704 | Binary Search | binary-search |
| 74 | Search a 2D Matrix | search-a-2d-matrix |
| 875 | Koko Eating Bananas | koko-eating-bananas |
| 33 | Search in Rotated Sorted Array | search-in-rotated-sorted-array |
| 153 | Find Minimum in Rotated Sorted Array | find-minimum-in-rotated-sorted-array |
| 981 | Time Based Key-Value Store | time-based-key-value-store |
| 4 | Median of Two Sorted Arrays | median-of-two-sorted-arrays |

### Linked List（11問）
| number | title | slug |
|---|---|---|
| 206 | Reverse Linked List | reverse-linked-list |
| 21 | Merge Two Sorted Lists | merge-two-sorted-lists |
| 143 | Reorder List | reorder-list |
| 19 | Remove Nth Node From End of List | remove-nth-node-from-end-of-list |
| 138 | Copy List with Random Pointer | copy-list-with-random-pointer |
| 2 | Add Two Numbers | add-two-numbers |
| 141 | Linked List Cycle | linked-list-cycle |
| 287 | Find the Duplicate Number | find-the-duplicate-number |
| 146 | LRU Cache | lru-cache |
| 23 | Merge k Sorted Lists | merge-k-sorted-lists |
| 25 | Reverse Nodes in k-Group | reverse-nodes-in-k-group |

### Trees（15問）
| number | title | slug |
|---|---|---|
| 226 | Invert Binary Tree | invert-binary-tree |
| 104 | Maximum Depth of Binary Tree | maximum-depth-of-binary-tree |
| 543 | Diameter of Binary Tree | diameter-of-binary-tree |
| 110 | Balanced Binary Tree | balanced-binary-tree |
| 100 | Same Tree | same-tree |
| 572 | Subtree of Another Tree | subtree-of-another-tree |
| 235 | Lowest Common Ancestor of a Binary Search Tree | lowest-common-ancestor-of-a-binary-search-tree |
| 102 | Binary Tree Level Order Traversal | binary-tree-level-order-traversal |
| 199 | Binary Tree Right Side View | binary-tree-right-side-view |
| 1448 | Count Good Nodes in Binary Tree | count-good-nodes-in-binary-tree |
| 98 | Validate Binary Search Tree | validate-binary-search-tree |
| 230 | Kth Smallest Element in a BST | kth-smallest-element-in-a-bst |
| 105 | Construct Binary Tree from Preorder and Inorder Traversal | construct-binary-tree-from-preorder-and-inorder-traversal |
| 124 | Binary Tree Maximum Path Sum | binary-tree-maximum-path-sum |
| 297 | Serialize and Deserialize Binary Tree | serialize-and-deserialize-binary-tree |

※出典：NeetCode公式ロードマップに基づく一般的な分類・並び順。実装前にneetcode.ioの最新表示と突き合わせて最終確認することを推奨（サイト側の分類が更新される場合があるため）。

## 付録B：UMPIREプロンプト（5.5で使用する生成プロンプト全文）

以下のプロンプトを、UMPIRE解説生成のシステムプロンプトまたはユーザープロンプトとしてAnthropic API呼び出し時に使用する。`{PASTE LEETCODE PROBLEM HERE}`部分を、ユーザーが貼り付けた問題文（`problem_statement`）に置換する。

```
You are a senior software engineer interviewer and English speaking coach.
I will provide a LeetCode problem.
Your task is to generate a complete UMPIRE walkthrough script that I can read aloud during a North American technical interview.
Requirements:
- Generate all sections: Understand, Match, Plan, Implement, Review, Evaluate.
- Use natural spoken English suitable for a real interview.
- Keep explanations concise but realistic.
- Include example questions I could ask the interviewer during the Understand phase.
- Generate at least 3 test cases during the Understand phase.
- In the Match phase, explain why the problem belongs to a particular pattern.
- In the Plan phase, explain:
    - algorithm overview
    - edge cases
    - data structures used
    - expected time and space complexity
- In the Implement phase, provide short spoken explanations for each major code block.
- In the Review phase, walk through one example step by step.
- In the Evaluate phase:
    - explain the dominant term
    - explain the time complexity
    - explain the space complexity
    - mention alternative approaches if applicable
Important:
Whenever you mention a complexity, include its pronunciation in parentheses.
Examples:
O(1) (Big O constant)
O(log n) (Big O log n)
O(n) (Big O linear)
O(n log n) (Big O n log n)
O(n²) (Big O quadratic)
O(n³) (Big O cubic)
O(2^n) (Big O exponential)
O(n!) (Big O factorial)
Output format:
# Understand
Spoken Script:
...
Questions:
...
Test Cases:
...
# Match
Spoken Script:
...
# Plan
Spoken Script:
...
# Implement
Code Block:
...
What to Say While Coding:
...
# Review
Spoken Script:
...
# Evaluate
Spoken Script:
...
Now generate the UMPIRE interview script for the following problem:
[PASTE LEETCODE PROBLEM HERE]
```
