# TimeLog（タイムログ）

インターバル（HIIT等）と、休憩のみ（ウェイト等）の **トレーニングタイマー**。  
Next.js + Supabase で作成し、Vercel にデプロイしています。

- **インターバル**：トレーニング時間 + 休憩時間を自動ループ
- **休憩のみ**：休憩だけ計測（セット中はカウントしない）
  - スタートで休憩開始
  - 次へで休憩終了（早送り） or 次の休憩開始

---

## デモ（Production）

- https://timelog-interval.vercel.app

---

## 主な機能

- Supabase Auth（Email / Password）ログイン
- プリセット管理
  - インターバル（timed）
  - 休憩のみ（manual）
- タイマー実行（`/timer/[id]`）
  - スタート / 一時停止 / 再開 / 次へ / リセット（条件あり）
  - 「保存して終了」で履歴保存
- 履歴表示（`/sessions`）
  - 直近最大50件
  - 削除

---

## 技術スタック

- Next.js（App Router）
- TypeScript
- Supabase（Auth / DB / RLS）
- Vercel（Hosting）

---

## 画面

- `/login`：ログイン / 新規登録
- `/presets`：プリセット作成・一覧
- `/timer/[id]`：タイマー
- `/sessions`：履歴

---

## Supabase セットアップ（DB / RLS）

1. Supabaseで新規プロジェクトを作成
2. SQL Editor を開く
3. `supabase/schema.sql` を実行（テーブル作成）
4. `supabase/rls.sql` を実行（RLS + Policy）
5. Authentication → Providers
   - Email を有効（デフォルトでOK）
6. Project Settings → API から以下を取得（後で環境変数に使用）
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## セットアップ（ローカル）

### 1) 依存関係のインストール

```bash
npm i
```

### 2) 環境変数を設定

プロジェクト直下に **`.env.local`** を作成して、以下を設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Supabase管理画面で以下から取得できます：

- Project Settings → API → Project URL
- Project Settings → API → anon public key

### 3) 起動

```bash
npm run dev
```

- http://localhost:3000 で確認できます。

---

## デプロイ（Vercel）

### 1) GitHubへ push

`main` に push すると Vercel が自動デプロイします。

```bash
git push origin main
```

### 2) Vercel側の環境変数

Vercel Project → Settings → Environment Variables に以下を登録：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

登録後、**Redeploy** するか、`main` にもう一回 push すれば反映されます。

---

## 使い方

1. `/login` でログイン（または新規登録）
2. `/presets` でプリセット作成
3. 作成したプリセットの「開始」から `/timer/[id]` へ
4. タイマーを実行し、最後に「保存して終了」
5. `/sessions` で履歴確認

---

## 仕様メモ（タイマー）

### インターバル（timed）

- スタート → トレ開始
- トレ終了 → 休憩へ自動遷移
- 休憩終了 → 次のトレへ自動遷移（セット+1）

### 休憩のみ（manual）

- スタート → 休憩開始
- 休憩終了 → セット中（待機）へ（セット+1）
- 次へ
  - 休憩中：休憩を早送りで終了（セット+1）
  - セット中：次の休憩開始
