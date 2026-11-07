# 紅葉ドライブ地図

箱根・芦ノ湖・御殿場、山梨、秩父・多摩の19スポットを、写真と地図から選ぶWebアプリです。

## 開発を始める

Node.js 24 LTS と npm 11 を推奨します（`.nvmrc` を同梱）。

```sh
nvm use
npm ci
npm run dev
```

開発サーバーのURLは端末に表示されます。APIキーやアカウント登録は不要です。地図タイルの読み込みにはインターネット接続が必要です。

```sh
npm run check      # Gitへの混入確認、型検査、テスト、本番ビルド
npm run build      # 静的HTMLの本番ビルド（dist/client/）
npm start          # ビルドしたアプリのローカル確認
```

## 機能

- 「すべて」＋3方面の4ボタンで19・4・6・9件を切り替え。
- PCは4列、スマートフォンは2列の写真アルバム。
- 景色タブと地図タブのスポット一覧から、各スポットの個別アルバムへ移動。
- 全19スポット・59枚の秋の写真。個別ページは `/spots/p01/`〜`/spots/p19/`。
- 写真の拡大、前後送り、左右キー、スマートフォンの横スワイプ、Escapeで閉じる操作に対応。
- 個別アルバムはスポット名と写真を表示。紹介文・アクセス案内・装飾的なコピーは掲載せず、出典は折りたたんで表示。
- 地図のズーム・移動・クラスタ、PCのホバー写真、タップ／キーボードでの選択。
- 写真・地点情報の出典、駐車場や徒歩の確認状況、個別Googleマップへのリンク。
- 表示モードと選択条件を端末内に保存。保存できないブラウザでも利用可能。
- 地図や画像の読み込みに失敗しても、一覧と外部リンクを利用可能。

ルートは方面別の候補グループです。全地点を巡る経路や所要時間は生成しません。

## ディレクトリ構成

```text
app/                   一覧・個別アルバムページと共通レイアウト
src/
  components/          アルバム、地図、詳細、出典表示
  data/                スポット・方面・画像のデータ
  lib/                 表示状態の復元などの処理
  styles/              共通スタイルと地図スタイル
  types/               データの型
public/
  images/spots/        写真、一覧用サムネイル、出典情報
tests/                 データ、状態復元、非公開ファイルの検証
scripts/               Git混入チェックとフック設定
.githooks/             commit・push前のチェック
.github/workflows/     GitHub Actionsによるチェック
requirment/            ローカル専用資料（Git対象外）
```

フロントエンドは React + TypeScript、静的HTMLへのビルドは Vite / Vinext、地図は Leaflet / OpenStreetMap です。ページ構成には Vinext の App Router を使用します。データベースや認証サーバーは使いません。

## GitHubへ載せる前に

`requirment/`、環境変数ファイル、作業ファイル、依存パッケージ、ビルド成果物は `.gitignore` で除外しています。Gitを初期化してから `npm ci` を実行すると、このリポジトリ内に限り `.githooks/` が有効になります。

- commit前：ステージされたファイルに非公開資料が混じっていないか確認。
- push前・CI・ビルド前：Git追跡ファイルに同じ資料が混じっていないか確認。
- 開発サーバー：`requirment/`、`.env*`、`.git/` 等へのファイル配信を拒否。

```sh
git check-ignore -v requirment/requirment.md
npm run check:privacy
git status --short
```

`git add -f` や `--no-verify` で保護を外さないでください。`.gitignore` は既存のGit履歴を消す機能ではありません。別のリポジトリへ移す場合も、非公開資料が追跡されていないことを確認してください。

## GitHub Pagesへの公開

公開先は [紅葉ドライブ地図](https://deraryo4559.github.io/20261115-koyo/) です。

ソースは `main`、公開済みの静的ファイルは独立した `gh-pages` ブランチで管理します。`main` へのpushとPull RequestではGitHub Actionsによる検査・ビルドを行います。サイトの更新は、検証済みの成果物を `gh-pages` へpushして行います。

- Pagesの公開元：**Deploy from a branch → gh-pages → / (root)**。
- 公開パス：`/20261115-koyo/`（ワークフローの `SITE_BASE_PATH`）。
- 公開対象：`dist/client/20261115-koyo/` の静的ファイルだけ。
- 画像・favicon・JavaScript・CSSは公開パス付きのURLで読み込みます。
- サーバー用コードや `requirment/` はPagesのアップロード対象に含めません。
- 公開ブランチの `.nojekyll` により、静的ファイルをそのまま配信します。

更新時はまず上記の `npm run check` を公開パス付きで実行し、下記の成果物チェックにも合格させます。初回だけ `gh-pages` の作業用コピーを作成します。

```sh
git clone --single-branch --branch gh-pages https://github.com/deraryo4559/20261115-koyo.git .local/pages-publish
```

以後の公開手順（プロジェクトのルートから実行）：

```sh
SITE_BASE_PATH=/20261115-koyo npm run check
SITE_BASE_PATH=/20261115-koyo node scripts/check-pages-artifact.mjs
git -C .local/pages-publish pull --ff-only
rsync -a --delete --exclude='.git/' dist/client/20261115-koyo/ .local/pages-publish/
touch .local/pages-publish/.nojekyll
git -C .local/pages-publish add .
git -C .local/pages-publish commit -m "Update published site"
git -C .local/pages-publish push origin gh-pages
```

`rsync` のコピー先は公開ブランチ専用です。手書きのソースや非公開資料を置かないでください。`main` だけをpushしても公開サイトは更新されません。

同じ公開パスで手元の成果物を確認する場合：

```sh
SITE_BASE_PATH=/20261115-koyo npm run check
SITE_BASE_PATH=/20261115-koyo node scripts/check-pages-artifact.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist/client
```

`http://127.0.0.1:4173/20261115-koyo/` を開きます。開発時の `npm run dev` は従来どおりルートパスで動作します。

## データと写真の更新

- `src/data/spots.json`：P01〜P19の名称、元地点の座標とGoogle Maps CID、公式案内、地点の意味、アクセスの確認状況。
- `src/data/routes.ts`：3方面の名前と件数。
- `src/data/photos.json`：各スポットの写真配列。先頭が表紙。パス、サムネイルパス、実寸、代替文、作者、出典、利用条件の表記、季節を記録。
- 画像を追加するときは `public/images/spots/` に置き、出典・利用条件・写真と地点の対応を確認して登録してください。

位置情報は元リストの個別地点と照合済みです。湖・道路・渓谷等の代表位置を駐車場や車の入口として扱わないでください。変更後は `npm run check` を実行します。

### 現時点の写真の確認状況

全19地点に2〜4枚、合計59枚の秋の写真を登録しています。評議原（P11）と大血川（P13）の写真も含みます。仙石原すすき草原（P01）は指定された4画像で、すすきの景色を掲載しています。

紅葉期以外の既存写真は差し替えました。御坂峠（P09）は峠周辺の紅葉と富士山の風景、芦ノ湖スカイライン（P03）の補助写真には運営会社掲載の秋の芦ノ湖空撮を含みます。写真の撮影場所や対象は写真データと出典一覧に記録しています。写真は過去の景色で、今年の見頃を保証する情報ではありません。

検索で確認した公式・観光・写真サイトの掲載画像と、一部Creative Commonsの画像を使用しています。出典・作者・公開されている利用条件はアプリ内と `public/images/spots/ATTRIBUTION.md` に記載しています。「出典サイト掲載写真」は再利用許諾を確認済みという意味ではありません。CC BY-NC-NDの画像は全体を表示し、トリミングや色調加工をしないでください。

アルバムは元写真の解像度を保ち、一覧・地図プレビューには `public/images/spots/thumbs/` の軽量版を使います。画像は最大長辺1920pxで、一部は元の提供画像が小さいため、その実寸を維持しています。

## 地図について

標準の地図タイルは OpenStreetMap を使用し、帰属表示を常時表示しています。[タイル利用方針](https://operations.osmfoundation.org/policies/tiles/)に沿い、表示に必要なタイルだけを読み込みます。大量アクセスやオフライン配信を行う場合は、対応するタイル提供サービスへ切り替えてください。URLと帰属表示は `src/components/SpotMap.tsx` で管理しています。

## 確認範囲

自動テストは地点数・所属・削除地点の除外、各地点の複数枚の秋写真と出典情報、保存状態の復元、非公開ファイルを強制ステージした場合の拒否を検証します。実機や通信条件を固定した性能計測、全地点の駐車場・通行規制・営業状況の現地確認は含みません。

ブラウザでは320px・390px・1280px幅の表示、19→4/6/9件の切り替え、クラスタの展開、フォーカスによる写真プレビュー、選択の固定、地図位置の保持、Escapeと元の写真への復帰、出典ダイアログを確認しました。本番ビルドでも写真・地図の読み込みと方面切り替えを確認しています。個別アルバムの静的HTML19ページと参照アセットも検査し、両タブの一覧からアルバムへの遷移、写真の拡大と前後送り、Escapeで閉じる操作を確認しています。

非公開資料のHTTPアクセスは、開発サーバーで403、本番サーバーで404になることを確認しています。
