# The Unknown - 実装計画

## 概要

このドキュメントはMVP（最小実装）から完成までの実装ロードマップを示します。

---

## Phase 1: MVP（最小実装）- 目標期間: 1-2週間

### 目標
基本的なゲームループが動作する最小限のプロトタイプを作成

### タスク

#### 1.1 プロジェクト初期セットアップ
- [ ] Viteプロジェクトの作成
- [ ] TypeScript設定
- [ ] TailwindCSS設定
- [ ] 基本的なディレクトリ構造の作成
- [ ] ESLint/Prettier設定

**コマンド例**:
```bash
npm create vite@latest . -- --template react-ts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install zustand idb lucide-react
npm install -D vitest @vitest/ui
```

#### 1.2 基本型定義
ファイル: `src/stores/types.ts`
- [ ] ResourceType定義
- [ ] CharacterResource/IconResource定義
- [ ] Building定義
- [ ] Recipe定義
- [ ] Cell/Grid定義

#### 1.3 定数定義
ファイル: `src/lib/constants.ts`
- [ ] GAME_CONFIG
- [ ] BASE58_CHARS
- [ ] BUILDING_TYPES
- [ ] DIRECTIONS

#### 1.4 ユーティリティ実装
- [ ] `src/core/utils/base58.ts` - base58文字管理
- [ ] `src/core/utils/hash.ts` - ハッシュ生成
- [ ] `src/core/utils/random.ts` - ランダム関数、シャッフル

#### 1.5 アイコン管理システム
ファイル: `src/lib/icons.ts`
- [ ] getAllIcons() - Lucideからアイコン取得
- [ ] IconData型定義

ファイル: `src/core/systems/IconPoolSystem.ts`
- [ ] initialize() - アイコンプールの初期化
- [ ] unlockNext() - 次のアイコン解放
- [ ] シャッフル機能

#### 1.6 リソースシステム
ファイル: `src/core/systems/ResourceSystem.ts`
- [ ] unlockCharacter() - 文字リソース解放
- [ ] unlockIcon() - アイコンリソース解放
- [ ] produce() - リソース生成
- [ ] consume() - リソース消費
- [ ] getAll() - 全リソース取得

**初期実装**: Tier 1のみ（文字1つ、アイコン1つ）

#### 1.7 グリッドシステム
ファイル: `src/core/systems/GridSystem.ts`
- [ ] initializeGrid() - 5x5グリッド初期化
- [ ] placeBuilding() - 建物配置
- [ ] removeBuilding() - 建物削除
- [ ] getCell() - セル取得
- [ ] tick() - 毎フレーム更新

#### 1.8 フローエンジン（簡易版）
ファイル: `src/core/engine/FlowEngine.ts`
- [ ] calculateFlows() - フロー計算
- [ ] processGenerator() - Generator処理
- [ ] processMerger() - Merger処理（後回し可）
- [ ] getAdjacentCell() - 隣接セル取得

**初期実装**: Generatorのみ動作

#### 1.9 ゲームエンジン
ファイル: `src/core/engine/GameEngine.ts`
- [ ] TickManager実装
- [ ] start/stop実装
- [ ] tick処理
- [ ] executeFlow実装
- [ ] システム統合

#### 1.10 状態管理
ファイル: `src/stores/gameStore.ts`
```typescript
// Zustandストア
- GameEngineインスタンス
- リソース状態
- グリッド状態
- UI状態
```

#### 1.11 UIコンポーネント（最小限）
- [ ] `src/components/Grid/GridCanvas.tsx` - グリッド表示（CSS Grid）
- [ ] `src/components/Grid/CellView.tsx` - セル表示
- [ ] `src/components/UI/ResourceDisplay.tsx` - リソース表示
- [ ] `src/components/UI/BuildingMenu.tsx` - 建物選択UI
- [ ] `src/App.tsx` - メインアプリ

**スタイル**: TailwindCSSで最小限のスタイリング

#### 1.12 基本的なゲームループ
- [ ] GameEngineの起動
- [ ] Generator配置
- [ ] リソース生成の確認
- [ ] UIへの反映

### Phase 1 完成基準
- [x] 5x5グリッドが表示される
- [x] Generatorを配置できる
- [x] リソースが生成される
- [x] リソース数がUIに表示される
- [x] 基本的なゲームループが動作する

### Phase 1 スキップ項目
- Merger（Phase 2で実装）
- Conveyor（Phase 2で実装）
- スキルツリー
- コレクション図鑑
- セーブ/ロード

---

## Phase 2: コアループ - 目標期間: 2-3週間

### 2.1 建物の拡充
- [ ] Conveyor実装
- [ ] Merger実装
- [ ] Output実装
- [ ] 建物の向き変更機能
- [ ] 建物の削除機能

### 2.2 コレクションシステム
ファイル: `src/core/systems/CollectionSystem.ts`
- [ ] generateRecipes() - レシピ自動生成
- [ ] onCraft() - レシピ発見処理
- [ ] getDiscovered() - 発見済みレシピ取得
- [ ] レア度計算

### 2.3 コレクションUI
- [ ] `src/components/Collection/CollectionGrid.tsx`
- [ ] `src/components/Collection/RecipeCard.tsx`
- [ ] フィルター機能（Tier, レア度）
- [ ] 未発見レシピの表示（???）

### 2.4 Tierシステム
ファイル: `src/core/systems/TierSystem.ts`
- [ ] canAdvanceTier() - Tier進行条件チェック
- [ ] advanceTier() - Tier上昇処理
- [ ] 新リソース解放
- [ ] グリッド拡大

### 2.5 経験値システム
- [ ] gainExperience() - 経験値獲得
- [ ] レベルアップ処理
- [ ] 経験値UI表示

### 2.6 Tier 2-3実装
- [ ] 文字リソース追加（"1", "2", "3"）
- [ ] アイコンリソース追加（3つ）
- [ ] グリッドサイズ拡大（7x7, 10x10）
- [ ] レシピ自動生成のテスト

### 2.7 セーブ/ロード
ファイル: `src/lib/db.ts`
- [ ] IndexedDB初期化
- [ ] saveGame() - ゲーム保存
- [ ] loadGame() - ゲーム読込
- [ ] シリアライゼーション（bigint対応）

### Phase 2 完成基準
- [x] Merger/Conveyorが動作する
- [x] リソースフローがグリッド上を流れる
- [x] レシピが自動発見される
- [x] コレクション図鑑が表示される
- [x] Tier 2-3に進める
- [x] セーブ/ロードが機能する

---

## Phase 3: 拡張 - 目標期間: 3-4週間

### 3.1 スキルツリー
ファイル: `src/core/systems/SkillSystem.ts`
- [ ] スキルノード定義
- [ ] unlock() - スキル解放
- [ ] コスト計算（指数関数）
- [ ] 効果適用

UI: `src/components/Skills/SkillTree.tsx`
- [ ] ツリー表示
- [ ] ノードクリック処理
- [ ] 前提条件の可視化

### 3.2 追加建物
- [ ] Splitter - リソース分解
- [ ] Filter - フィルタリング
- [ ] Buffer - バッファリング
- [ ] Catalyst - 加速

### 3.3 Tier 4-10実装
- [ ] 動的リソース生成
- [ ] グリッド拡大（15x15, 20x20）
- [ ] レシピ数の増加テスト
- [ ] パフォーマンステスト

### 3.4 レア度システム
- [ ] レア度表示（色分け）
- [ ] ボーナス効果実装
- [ ] レシピ統計表示

### 3.5 ボーナス効果
- [ ] production - 生産量増加
- [ ] efficiency - 効率増加
- [ ] unlock - 建物解放
- [ ] grid - グリッド拡大

### Phase 3 完成基準
- [x] スキルツリーが機能する
- [x] 全建物タイプが実装される
- [x] Tier 10まで到達可能
- [x] レア度システムが機能する
- [x] ボーナス効果が適用される

---

## Phase 4: ポリッシュ - 目標期間: 2-3週間

### 4.1 アニメーション
- [ ] リソースフローアニメーション
- [ ] 建物配置アニメーション
- [ ] レシピ発見アニメーション
- [ ] Framer Motion統合

### 4.2 サウンド（オプション）
- [ ] 効果音（配置、発見、レベルアップ）
- [ ] BGM（オプション）

### 4.3 チュートリアル
- [ ] 初回プレイ時のガイド
- [ ] ツールチップ
- [ ] ヘルプモーダル

### 4.4 統計画面
- [ ] プレイ時間
- [ ] 総生産量
- [ ] レシピ発見率
- [ ] Tier到達状況

### 4.5 実績システム（オプション）
- [ ] 実績定義
- [ ] 実績解除処理
- [ ] 実績UI

### 4.6 パフォーマンス最適化
- [ ] React.memo最適化
- [ ] 大規模グリッドの最適化
- [ ] IndexedDB書き込み最適化

### 4.7 テスト
ファイル: `src/**/*.test.ts`
- [ ] ユーティリティ関数のテスト
- [ ] システムロジックのテスト
- [ ] UI コンポーネントのテスト

### Phase 4 完成基準
- [x] アニメーションがスムーズ
- [x] チュートリアルが機能する
- [x] 統計画面が表示される
- [x] テストカバレッジ60%以上
- [x] パフォーマンスが良好

---

## Phase 5: クラウド版（将来）- 目標期間: 4-6週間

### 5.1 Cloudflare D1統合
- [ ] D1データベース作成
- [ ] APIエンドポイント作成
- [ ] ローカルとクラウドの切り替え

### 5.2 アカウントシステム
- [ ] Cloudflare Workers Auth
- [ ] ユーザー登録/ログイン
- [ ] セッション管理

### 5.3 クロスデバイス同期
- [ ] セーブデータの同期
- [ ] コンフリクト解決

### 5.4 リーダーボード（オプション）
- [ ] Tier到達ランキング
- [ ] レシピ発見数ランキング

### Phase 5 完成基準
- [x] クラウド保存が機能する
- [x] 複数デバイスで同期できる
- [x] アカウントシステムが機能する

---

## 技術的検討事項

### パフォーマンス目標
- **初期ロード**: < 2秒
- **FPS**: 60fps（アニメーション時）
- **Tick Rate**: 10 ticks/second
- **大規模グリッド**: 20x20で60fps維持

### ブラウザ対応
- Chrome/Edge: 最新2バージョン
- Firefox: 最新2バージョン
- Safari: 最新2バージョン
- モバイル: iOS Safari, Chrome Android

### データサイズ
- **セーブデータ**: < 1MB (Tier 10まで)
- **アイコンライブラリ**: 遅延ロード
- **IndexedDB**: 最大10MB

---

## 開発環境

### 必須ツール
- Node.js 18+
- npm or pnpm
- Git
- VSCode (推奨)

### 推奨VSCode拡張
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

### 開発コマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# テスト
npm run test

# テスト（UI）
npm run test:ui

# Lint
npm run lint
```

---

## リスクと対策

### リスク1: パフォーマンス低下
**対策**:
- 早期にパフォーマンステスト
- React.memoの適切な使用
- Canvas描画への移行検討

### リスク2: IndexedDB容量不足
**対策**:
- セーブデータの圧縮
- 古いセーブデータの削除機能
- クラウド移行の促進

### リスク3: アイコン枯渇
**対策**:
- 複数アイコンライブラリの使用
- アイコンの組み合わせ生成
- カスタムSVG生成

### リスク4: ゲームバランス崩壊
**対策**:
- 早期のバランステスト
- プレイテストの実施
- 調整可能な設定値

---

## マイルストーン

| Phase | 期間 | 主要機能 | 完了目標 |
|-------|------|----------|----------|
| Phase 1 | Week 1-2 | MVP実装 | 基本ループ動作 |
| Phase 2 | Week 3-5 | コアループ | Tier 3到達可能 |
| Phase 3 | Week 6-9 | 拡張機能 | Tier 10到達可能 |
| Phase 4 | Week 10-12 | ポリッシュ | 公開準備完了 |
| Phase 5 | Week 13+ | クラウド版 | クラウド対応 |

**総開発期間目安**: 3-6ヶ月

---

## 次のアクション

### 今すぐ始めること
1. Viteプロジェクトの作成
2. 基本型定義の実装
3. GameEngineの骨格実装

### コマンド例
```bash
# プロジェクト作成
npm create vite@latest . -- --template react-ts

# 依存関係インストール
npm install zustand idb lucide-react
npm install -D tailwindcss postcss autoprefixer
npm install -D vitest @vitest/ui

# TailwindCSS初期化
npx tailwindcss init -p

# 開発サーバー起動
npm run dev
```

---

## 参考資料

### ドキュメント
- [GAME_DESIGN.md](./GAME_DESIGN.md) - ゲーム設計
- [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) - 技術仕様

### ライブラリドキュメント
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Zustand](https://docs.pmnd.rs/zustand/)
- [Lucide Icons](https://lucide.dev/)
- [idb](https://github.com/jakearchibald/idb)
- [Vitest](https://vitest.dev/)
