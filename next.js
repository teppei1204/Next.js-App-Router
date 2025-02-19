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
