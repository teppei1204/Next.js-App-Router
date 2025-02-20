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

