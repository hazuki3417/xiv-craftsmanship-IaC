# Private GHCR・単一EC2でのコンテナ運用（設計）

ステータス: **運用設計案 / 未実装**。コマンド例は本番環境での実行を指示するものではない。

## 1. イメージ管理

| サービス | Image | 発行方式 |
| --- | --- | --- |
| Web | Private GHCR `ghcr.io/hazuki3417/xiv-craftsmanship-web`（候補名） | WebリポジトリのGitHub Actions |
| API | Private GHCR `ghcr.io/hazuki3417/xiv-craftsmanship-api`（候補名） | APIリポジトリのGitHub Actions |
| DB | Private GHCR `ghcr.io/hazuki3417/xiv-craftsmanship-db`（候補名） | DBリポジトリのGitHub Actions |
| Caddy | Official Caddy image | 公式registryからPull。自前Build・Private GHCRへの再登録はしない |

各リポジトリの対象ブランチへのマージ後にbuildしてGHCRへ自動pushする。具体的なtriggerブランチは各Repositoryの運用方針を照合して実装する。GitHub Actionsの `GITHUB_TOKEN` には `packages: write`、`contents: read` の最小権限を付与し、必要に応じてPackage側のActions権限を設定する。PackageのvisibilityはPrivateとする。

配信成功は**デプロイ済み**を意味しない。タグはCommit SHA等のimmutable識別を使い、EC2の起動時はmanifest digest `@sha256:...` を基本とする。Caddyも実際に取得・検証したversionまたはdigestで固定し、`latest` / mutable major tagのみには依存しない。

## 2. 手動デプロイ

1. 管理者がGitHub Actionsの発行成功、対象commit、image digestを確認する。
2. SSMでEC2へ接続する（SSHポートは開けない）。
3. Private GHCRの読み取り専用Credentialを**Pull時だけ**使用する。一時的なDocker認証ディレクトリを作成し、Pull後に認証情報を破棄する。`docker login` のcredentialをホストの恒久的な `~/.docker/config.json` へ残さない。
4. Image digestとCompose runtime設定を照合し、すべてのイメージを**起動を停止する前に**Pullする。
5. 変更対象コンテナのみ、Composeで更新する。DBを更新する場合はデータ再初期化の影響と起動時間を明示してから実施。
6. Caddy/Web/API/DBのhealthcheckと、実際の画面表示・APIリクエスト・DB参照を確認する。
7. 導入したimage digest、実施者、時刻、検証結果を記録する。

`runtime/development/compose.yaml` とスクリプトはTerraformリポジトリでversion管理する。デプロイ手順をScript化する場合は、environment単位の同時実行を禁止し、認証情報やenv内容をログへ出さない。

## 3. Composeの契約

- Caddyのみhostの80/443ポートをPublish。Webの3000、APIの8080、PostgreSQLの5432はPublishしない。
- Caddy -> `web:3000`、Web server -> `api:8080`、API -> `db:5432`。
- Webの現行 `app/next.config.mjs` にある `http://localhost:8080` rewriteはCompose内のサービス名に変更が必要。ブラウザ側の環境変数 `NEXT_PUBLIC_*` とビルド時展開にも注意。
- DB接続資格情報は実運用のSecretとしてGit管理外に置く。現在の固定 `example` は再利用しない。PostgreSQL初期化を同じ認証設定で行う。
- DBは初期化データセットから再構築可能であることを要検証。データボリューム・バックアップを義務にしないが、意図せぬ初期化を許容する仕様として明記する。
- Caddyの `/data` は再起動・再作成にまたがり保持し、HTTPS証明書を管理する。Web/API/DBと異なる保持方針であることに注意する。
- Healthcheckと起動順序を適用し、`depends_on` のみでDB readyを保証したとみなさない。

## 4. ロールバック

以前に動作確認済みのimmutable digestを再指定し、対象コンテナをComposeで復元する。DBのスキーマ・データ更新を含む場合には、以前のイメージだけで戻せるとは限らない（DBバックアップを採用しない場合、データ再生成を許容する）。イメージ固定、Caddy設定のversion管理、停止時間、復旧時の手順を受け入れテスト対象に含める。

## 5. 受け入れ条件

- 一般公開の `https://xiv-craftsmanship.com` がHTTPSで表示できる。
- `http://` はHTTPSにredirectされる。
- WebからAPIへリクエストでき、APIからDB参照できる。
- インターネット側から3000/8080/5432/22に直接アクセスできない。
- 登録されたGHCR PackageがPrivateであり、無認証Pullできない。
- GitHub ActionsでのPush後もEC2上の稼働digestは自動で変わらず、管理者による手動操作でのみ変わる。
- Web/API/DBの更新と、直前の動作確認済みバージョンへの切り戻しを再現できる。
- DBを再生成しても参照用のテーブル/データ/関数が正しく復元される。
- Caddyコンテナを再作成してもTLS証明書用データが保持される。

この表はテスト仕様であり、実施済みの検証結果ではない。
