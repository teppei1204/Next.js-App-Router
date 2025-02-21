# Next.js App Routerのベストプラクティスを解説

## コンポーネント

### @ClientComponent

1. ファイルの先頭に `"use client"` を記述
2. 無闇に使わない
3. ユースケース
   - **Hooksを利用する時** (useState, useEffect, useRef...)
   - **イベントハンドラを利用する時** (onClick, onChange...)
   - **ブラウザAPIを利用する時** (localStorage, sessionStorage, window, document)
   - **クライアント操作が多いコンポーネント** (フォームコンポーネント, 検索コンポーネント, タブ切り替え/ハンバーガーメニュー開閉)

### @ServerComponent

- デフォルトで **ServerComponent** (基本的に推奨。その理由は後述)
  - **データフェッチが高速になる**  
    サーバーがAPIやデータセンターと近い位置にあるため
  - **サーバー側でレンダリング (SSR)** されるので、JSバンドルサイズが削減される
    - **Q: JSバンドルサイズって？**  
      **A:** クライアント側で処理するJSの総量  
      バンドルサイズが大きくなると初期ロードに時間がかかる
      - **注意:** `ClientComponent` は JSバンドルに含まれるので注意
  - **クライアントのスペックに依存しなくなる**
  - **SEOの向上**
    - 完全なHTMLの状態でクライアントに表示されるため、ページ表示速度が向上する
    - 動的メタデータ設定が可能 (例: title, description, ogp)
  - **セキュリティの強化**
    - サーバー側で実行されるので、クライアント側で漏洩しにくくなる (APIキー, DBのクエリなど)
    - **注意:** `ClientComponent` は最小限に

## 注意点

### Client Boundary

- 子コンポーネントは自動的に `ClientComponent` になる
- 意図しない `ClientComponent` 化に注意  
  (末端だけ `ClientComponent` にするイメージ)
- **Compositionパターンで回避** できる (参考文献参照)

## コンポーネントのベストプラクティス

- **ServerComponent** を積極的に利用
- **ClientComponent** は控えめに


# データフェッチ

## ・fetch()
- `fetch("https://dummy.com/user/1")`
  - Next.js では拡張されている
  - デフォルトで **SSR** (v14まではSSGがデフォルトだった)
  - v15以降ではSSRがデフォルト (変更可能性あり)
  - オプトインで **SSG/SSR/ISR** に変更可能
  - キャッシュ設定が簡単
  - **Request Memoization**
  - レンダリングで後述

## ・ORM等を利用した関数
- `prisma.post.findMany();`
  - **Route Handler (API)** で書く必要がない
  - **Route Handlerとは？**
    - `app/api/posts/route.ts`
    - Next.js で API が作れる機能
  - 通信回数が増える
  - APIを配布する予定がある場合は便利
    - それなら **Rails** や **Laravel** を利用するかも
  - データ送信では使うかも？
    - ただし **ServerActions** が登場した
    - これでも利用するケースは少ないかも
  - キャッシュ方法は後述

## ・サードパーティライブラリ
- **ClientComponentの場合**
  - `useSWR()`
  - **Tanstack Query**
  - `useEffect` ← 非推奨
  - 基本的には非推奨
    - 学習コスト
    - パブリックなネットワークへの公開
    - JSバンドルサイズの増加

## ・ベストプラクティス
- **ServerComponentを利用する**
  - 初回ページ読み込み速度の向上
  - SEOの向上
  - セキュア
  - キャッシュの利用
  - ただしデメリットもある
    - リアルタイム性に弱い
      - **WebSocket**
      - **楽観的UI更新**
        - `useState()`
        - `useOptimistic()`
    - ユーザー操作に基づいたデータフェッチに弱い
      - フォーム入力や検索機能等
        - `react-hook-form`
        - `useSearchParams()`
        - `usePathname()`
      - ただし **ServerActions** の登場で、ServerComponentのみでも処理可能
        - JS無効な環境でも操作できる
          - プログレッシブエンハンスメント
          - UX向上
        - ただしリアルタイムバリデーションが困難
        - **ServerActions** がベストプラクティスになりつつある
          - `useActionState()`
          - `useFormStatus()`
    - **ClientComponentも併用して使い分けよう**
      - **Container/Presentationパターン**
        - **Container** = データ取得層
        - **Presentation** = 見た目の部分
        - 実装例: [https://zenn.dev/buyselltech/articles/9460c75b7cd8d1](https://zenn.dev/buyselltech/articles/9460c75b7cd8d1)
        - **なぜ?**
          - テストしやすくなる
            - **React Testing Library**
              - ServerComponentのテストに未対応
              - HTMLの部分ならテストが簡単
            - **StoryBook**
              - 対応はしているが書きづらいらしい
          - **Compositionパターンにも対応しやすい**
            - Containerから実装すると良い
            - その後にPresentationを実装する
            - データ取得コンポーネント → 見た目コンポーネント
            - データ取得は **ServerComponent** 、見た目は **ClientComponent**
        - 小規模ならオーバーエンジニアリングかもしれない

## ・並行データフェッチング
- 同期よりも並行を優先
  - **並行 = パラレル**
  - 具体例: 家事
    - 洗濯物を回しながら皿洗い
    - 空いた時間は別の仕事をすると効率的
  - コンポーネントに分割すると自動的に非同期データフェッチになる
  - `Promise.all()`
    ```js
    const [results, tags] = await Promise.all([
      getSearchResults(query),
      getRelatedTags(query),
    ]);
    ```
  - **N + 1データフェッチ** に注意


  # キャッシュ

  ## ・そもそもキャッシュって？
  - データを一時的に保存し再度取り出しやすくすること
    - 例: 図書館
      - よく貸し出される人気の本
      - 書物の奥底ではなく、フロント近くの本棚に置いておく
      - すぐに本が提供できて便利
  
  ## ・Request Memoization
  - 同じリクエストは「重複排除」される（重なったリクエストに関しては一つにまとめる）
    - 注意:
      - URLやオプションが少しでも違うとメモ化されない
      - `fetch()`を使う場合は関数化しておくと良い
        - データ取得層 = **DAL (Data Access Layer)** に分離しておく
      - ただデータ取得を関数化しておくこと
  
  - ServerComponentで `fetch()` を使う場合のみ適用
    - ORM等で作った関数はメモ化されない
    - RouteHandler(API)内での利用では適用されない
    - `fetch` 以外なら React cache を利用
  
  - コンポーネント最下層で `fetch` しても問題ない
    - 動的メタデータ設定の際などに効果を発揮する
      - `generateMetadata()`
      - 同じ `fetch` リクエストしても重複排除される
    - キャッシュ期間:
      - 永続的ではない
      - `fetch` リクエスト毎
  
  ## ・Data Cache
  - アプリ全体に関わるキャッシュ
    - 理解しておかないと意図しないデータが返ってくる
  - `fetch()` で **Data Cache** 設定できる
    - `fetch("https://...", {cache: "force-cache"})`
    - `fetch("https://...", {cache: "no-store"})`
    - `fetch("https://...", {cache: {next: {revalidate: 3600}}})`
    - **SSG/SSR/ISR** が関係する
  
  - キャッシュ期間:
    - 永続的
    - サーバーを再起動/際ビルドしても **Data Cache** は残る
    - 最新のデータを返したい場合:
      - SSRにする
      - `no-store` を `fetch` で指定する
      - v15ではデフォルトで `no-store`
      - Route Segment Configを指定する: `export const dynamic = 'force-dynamic'`
    - **Data Cache** の再検証を設けることも可能
      - `revalidate` // 日本語で再検証
  
  ## ・Full Route Cache
  - ページ全体のキャッシュ
    - 静的なHTMLやRSC Payloadをキャッシュする
    - `fetch()` ここのキャッシュではない
    - **Data Cache** は `fetch` で返ってきた JSON をキャッシュしている
  
  - Static Renderingのみ適用:
    - **SSG/ISR時のみ**
    - **SSRの場合はキャッシュされない**
    - **AppRouter** は StaticRendering を推奨
      - **Full Route Cache** でページ全体を自動キャッシュ
      - 純粋に早いから
      - 意図しない DynamicRendering に注意
        - `cookies()` / `Headers()`
        - **dynamic function**
        - 自動で Dynamic Rendering になる
  
  - キャッシュ期間:
    - 永続的
    - ユーザー間を超えてキャッシュを共有される
    - 指定時には慎重に
  
  ## ・Router Cache
  - ナビゲーション用のキャッシュ
    - ページを訪問すると RSC ペイロードが自動キャッシュされる
      - すぐに戻る/進むナビゲーションができる
      - UXの向上
    - クライアント側でメモリ内にキャッシュされる
  
  ### ・<Link/>
  - 静的ページ:
    - `prefetch` はデフォルトで **true**
    - バックグラウンドでプリロードされている
      - 事前ページ読み込み
      - リンクを押した瞬間にページ遷移可能に
    - **production** のみ有効
  
  - 動的ページ:
    - 共通レイアウト（動的以外の部分）は `prefetch` されている
    - 動的な部分は `loading.js` でローディング UI の表示
      - ロード UI とストリーミング:
        - `loading.js`
        - `<Suspense />`
      - ストリーミングについては後述
  
  - キャッシュを無効にしたい時は:
    - **ServerActions** で
      - `revalidatePath` / `revalidateTag`
      - `cookies.set` / `cookies.delete`
    - `router.refresh`
  
  - キャッシュ期間:
    - セッション中のみ = ブラウザのタブが閉じるまで
    - 静的ページ:
      - デフォルトで **5分間**
    - 動的ページ:
      - デフォルトで **30秒**
    - **staleTimes**
      - 詳細に時間決定ができる
  
  ## ・ベストプラクティス
  - キャッシュの挙動をちゃんと理解しよう
    - 予期しないキャッシュが発生しなければ OK
    - キャッシュすべき箇所も把握できれば最高
    - ドキュメントから最新情報を知ると尚良い
  
  - キャッシュをもっと制御したい場合:
    - **Remix** 等を利用する
    - WebAPI 標準に準拠している
    - キャッシュの詳細なカスタマイズが可能
  
    # レンダリング

    ## ・レンダリングって？
    - HTML/CSS/JSを組み合わせてページとして見れる状態にすること
      - ① HTMLの骨格を形成
      - ② CSSでスタイリング
      - ③ JSでインタラクティブ化
      - [詳細記事](https://zenn.dev/oreo2990/articles/280d39a45c203e)
    
    - クライアント側orサーバー側でレンダリングするかでパフォーマンスが変わる
      - パフォーマンスって何で図る？
        - どれだけ早くユーザーのデバイスにコンテンツを表示させるか
        - **TTFB**...
          - **Time To First Byte**
          - サーバーから最初の1Byteがクライアントに届くまでの時間
    
    - Next.jsでは基本サーバー側でレンダリングさせる
      - クライアント側に負荷をかけさせない
      - 事前にデータフェッチしておくため
    
    ## ・Static Rendering
    - **SSG**
      - 最速
      - `fetch("https://...", {cache: "force-cache"})`
      - 静的ページで有効:
        - ドキュメント
        - ヘルプページ
        - ポリシーページ
        - 更新の少ないブログメディア等
    
    - **ISR**
      - これも早い
      - データのキャッシュ更新時間を指定可能
      - 静的と動的の中間ページで有効:
        - ブログメディア
        - ニュースサイト
        - ECサイト...
      - `fetch("https://...", {cache: {next: {revalidate: 3600}}})`
    
    ## ・Dynamic Rendering
    - **SSR**
      - 程よく早い
        - 初期ロードは **ClientComponent** よりも早い傾向
      - リクエスト毎に都度サーバーでレンダリング
      - `fetch("https://...", {cache: "no-store"})`
        - `no-store` = ストアしない = キャッシュしない
        - 都度データソースにアクセスする
    
    - 注意点:
      - キャッシュされません
      - 都度APIリクエストを投げるので負荷がかかる
      - `headers()` / `cookies()` で自動的に **SSR** になる
        - `dynamic function`
        - 意図しない **SSR** に注意
    
    ## ・Suspense / Streaming
    - **ストリーミングって？**
      - 段階的にUIやデータを提供すること
      - **SSR** の時に利用する
        - **streaming SSR**
      - 見えていない部分は即時フォールバックUIを表示する
        - UXや滞在時間の向上
        - `<Suspense fallback="Loading..." />`
    
    ## ・Partial Pre Rendering (PPR)
    - レンダリング方式の新時代へ突入か
      - v15で実験的に導入されている
      - **Partial** = 部分的、**Pre Rendering** = 部分レンダリング
        - **Static** と **Dynamic** の混在が可能
          - **Suspense境界の外側**が **StaticRendering**
          - **Suspense境界の内側**が **DynamicRendering**
    
    - ページ単位からUI単位でのレンダリング方式決定へ
      - **SSG** or **SSR** 等の判別議論が過去のものになる？
      - 今のうちにキャッチアップしておくと良いかも
    
    ## ・ベストプラクティス
    - 実装箇所によってレンダリング方式を判別できたらOK
      - 例: ヘルプページ → **SSG**
      - 例: プロフィールページ → **ISR** / **SSR**
      - 例: タイムライン → **SSR** / **CSR**
      
    - ただ、**PPR** の登場で考えるべき粒度が変わる可能性も
      - ページ単位 → UI単位へ
    
    - デフォルトでは **StaticRendering** を推奨
      - 必要に応じて **Dynamic Rendering** を
    
    - キャッシュも同様に
    - Next.jsユーザーであれば理解しておくべきトピック
    