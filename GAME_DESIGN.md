# The Unknown - ゲーム設計ドキュメント

## 概要

### ゲームコンセプト
- **タイトル**: The Unknown
- **世界観**: どの世界の言語でもない、抽象的な概念空間
- **ビジュアル**: base58文字とSVGアイコンのみで構成
- **目的**: 運用コストを極限まで削減し、無限に続くゲーム体験を提供

### コアコンセプト
プレイヤーは「観測者」として、未知の**概念空間**を探索する。すべてはbase58エンコードされた文字列（`1-9 A-H J-N P-Z a-k m-z`）と、アイコンライブラリからランダムに選択されたSVGアイコンで表現される。

**重要**: SVGアイコンは文字とは全く関係なく、様々なアイコンライブラリ（Lucide、Heroicons等）からランダムに選ばれたものを使用する。

---

## コアメカニクス

### ゲームタイプ
**配置パズル型リソースフロー**

- グリッド上に建物（Generator, Transformer, Merger等）を配置
- リソース（文字またはアイコン）がグリッド上をフローする
- 配置と接続を最適化して効率を上げる
- 2次元的なリソースフローにより無限の組み合わせが発生

### ゲームループ

**重要**: フェーズは存在しない。プレイヤーはいつでも以下の行動を自由に行える：

- **リアルタイム**: リソースフローは常時動作している
- **配置変更**: いつでも建物を配置/削除/回転できる
- **スキル解放**: リソースがあればいつでもスキルツリーを解放できる
- **Tier進行**: 条件を満たせばいつでもTierを上げられる
- **レシピ発見**: 建物が実際にリソースを処理したとき自動的に発見される

プレイヤーの体験：
```
1. グリッドを観察
   - リソースフローを確認
   - ボトルネックを特定

2. 建物を配置/変更
   - より効率的な配置を試行錯誤
   - 新しい組み合わせを実験

3. レシピ発見
   - 新しい組み合わせが自動的にコレクションに追加
   - ボーナス効果を獲得

4. リソース蓄積
   - スキル解放に使用
   - Tier進行の条件達成

5. 拡張
   - グリッドサイズ拡大
   - 新しいリソースタイプ追加
   - 新しい建物解放
```

---

## リソースシステム

### リソースの種類

ゲーム内には**2種類の独立したリソースタイプ**が存在：

#### 1. 文字リソース (Character Resource)
```typescript
type CharacterResource = {
  id: string;          // "char_A3k"
  value: string;       // base58文字 (例: "A", "k", "3")
  tier: number;        // 解放tier
  amount: bigint;      // 所持数
}
```

**base58文字セット**: `1-9 A-H J-N P-Z a-k m-z`
- 紛らわしい文字を除外: `0 O I l`
- 合計58文字

#### 2. アイコンリソース (Icon Resource)
```typescript
type IconResource = {
  id: string;          // "icon_star"
  iconName: string;    // "Star" (アイコンライブラリの名前)
  svg: SVGComponent;   // SVGコンポーネント
  tier: number;        // 解放tier
  amount: bigint;      // 所持数
}
```

**アイコンの選択**:
- アイコンライブラリ（Lucide、Heroicons等）からランダムに選択
- 文字とは全く関係ない
- tierごとに新しいアイコンが1つ追加される

### Tierシステム

Tierが上がるごとに新しいリソースが1つ追加される

```
Tier 1:
  - 文字: "A"
  - アイコン: Star
  合計: 2リソース

Tier 2:
  - 文字: "A", "B"
  - アイコン: Star, Circle
  合計: 4リソース

Tier 3:
  - 文字: "A", "B", "C"
  - アイコン: Star, Circle, Square
  合計: 6リソース

Tier N:
  - 文字: N個
  - アイコン: N個
  合計: 2N個のリソース
```

**重要**: tierに上限はない。無限に続く。

**組み合わせ爆発**:
- 2N個のリソースから2つ選ぶ: (2N)P2 = 2N × (2N-1)
- 3つ選ぶ: (2N)P3 = 2N × (2N-1) × (2N-2)
- 文字とアイコンを混在できる

---

## 建物システム

### 建物タイプ

#### Tier 1（基本）
```
[Generator]
  機能: 特定のリソースを生成（X/秒）
  出力: 1方向
  種類: 各リソースごとに専用のジェネレーターが存在
  例: Generator(A), Generator(Star)

  重要: リソース間の変換は不可。
        各リソースは専用ジェネレーターからのみ生成可能。
        これによりゲームバランスを保つ。

[Conveyor →]
  機能: リソースを転送
  方向: 上下左右

[Output]
  機能: ストレージに蓄積
  入力: 任意
```

#### Tier 2以降
```
[Merger]
  機能: 複数リソースを合成
  入力: 2-4方向
  出力: 1方向
  例:
    "A" + "B" → "AB"
    Star + Circle → (新しいアイコン)
    "A" + Star → (文字+アイコンの合成)

[Splitter]
  機能: 合成リソースを分解
  入力: 1方向
  出力: 2-4方向
  例: "AB" → "A" + "B"

[Filter]
  機能: 特定リソースのみ通過
  入力: 1方向
  出力: 1方向（フィルタリング済み）

[Buffer]
  機能: 一時貯蔵（キャパシティあり）
  入力: 1方向
  出力: 1方向

[Catalyst]
  機能: 隣接する建物を加速
  効果範囲: 隣接8マス
  効果: 処理速度 +20%
```

### 建物の配置
```typescript
type Building = {
  type: BuildingType;
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  level: number;
  recipe?: Recipe;  // Generator, Merger用
}
```

---

## グリッドシステム

### グリッドサイズ進化
```
Tier 1:  5x5   (25マス)
Tier 2:  7x7   (49マス)
Tier 3:  10x10 (100マス)
Tier 5:  15x15 (225マス)
Tier 10: 20x20 (400マス)
...
```

### 建物数制限
```typescript
// インフレ対策：建物数に上限を設ける
function getMaxBuildings(tier: number): number {
  return Math.floor(10 * Math.pow(1.3, tier));
}

// 例
Tier 1: 10個
Tier 2: 13個
Tier 3: 17個
Tier 5: 29個
Tier 10: 138個
```

---

## コレクションシステム

### コレクション = レシピ

**重要**: レシピ自体がコレクション要素となる

```typescript
type Collection = {
  id: string;              // "recipe_T2_A_B"
  tier: number;            // 解放tier
  type: 'generation' | 'compound';

  // レシピ情報
  input: Resource[];       // 入力リソース（順序付き、generationの場合は空配列）
  output: Resource;        // 出力リソース
  building: BuildingType;  // 使用建物

  // メタ情報
  discovered: boolean;
  discoveredAt?: Date;
  timesUsed: bigint;       // 使用回数

  // ビジュアル
  displayIcon: SVGComponent;  // 表示用アイコン

  // ゲーム効果
  bonus?: Effect;          // 発見ボーナス
  rarity: number;          // レア度（1-1000）
}

type Resource = {
  type: 'character' | 'icon';
  id: string;
  display: string | SVGComponent;  // 表示用
}
```

### レシピの種類

#### 1. Generation Recipe（生成）
```
入力: なし
出力: 1種類
建物: Generator

例:
  Generator(A) → "A"
  Generator(Star) → Star

重要: 各リソースは専用ジェネレーターからのみ生成される
```

#### 2. Compound Recipe（合成）
```
入力: 2種類以上（順序あり）
出力: 1種類
建物: Merger

例:
  "A" + "B" → "AB"
  "B" + "A" → "BA"  (異なる結果)
  Star + Circle → (複合アイコン)
  "A" + Star → (文字+アイコンの合成)
  "A" + "B" + "C" → "ABC"
  Star + Circle + Square → (複合アイコン)
```

### コレクション数の計算

```typescript
// Tierごとのレシピ総数

function calculateTotalRecipes(tier: number): number {
  const n = tier * 2;  // 文字とアイコンで2倍

  // Generation: 各リソースごとに1つのジェネレーター
  const generation = n;

  // Compound (2つ): 順列 nP2 = n!/(n-2)!
  const compound2 = n * (n - 1);

  // Compound (3つ): 順列 nP3 = n!/(n-3)!
  const compound3 = n * (n - 1) * (n - 2);

  // Compound (4つ): 順列 nP4
  const compound4 = n * (n - 1) * (n - 2) * (n - 3);

  return generation + compound2 + compound3 + compound4;
}

// 例
Tier 1 (2リソース: A, Star):
  Generation: 2
  Compound2: 2×1 = 2
  Total: 4レシピ

Tier 2 (4リソース: A, B, Star, Circle):
  Generation: 4
  Compound2: 4×3 = 12
  Compound3: 4×3×2 = 24
  Total: 40レシピ

Tier 3 (6リソース):
  Generation: 6
  Compound2: 6×5 = 30
  Compound3: 6×5×4 = 120
  Compound4: 6×5×4×3 = 360
  Total: 516レシピ

Tier 10 (20リソース):
  Generation: 20
  Compound2: 20×19 = 380
  Compound3: 20×19×18 = 6,840
  Compound4: 20×19×18×17 = 116,280
  Total: 123,520レシピ
```

### 発見方法

#### 自動発見（実際に生成したとき）

建物が実際にリソースを処理したとき自動的に発見される

```typescript
function onBuildingProcess(
  building: Building,
  input: Resource[],
  output: Resource
) {
  const recipeId = generateRecipeId(input, output, building.type);

  let recipe = recipeDB.get(recipeId);

  if (!recipe) {
    // 初めて生成 → 新規レシピとして登録
    recipe = createRecipe(input, output, building.type);
    recipeDB.set(recipeId, recipe);
    recipe.discovered = true;

    showDiscoveryNotification(recipe);
    grantBonus(recipe.bonus);
  }

  recipe.timesUsed++;
}
```

**計算コスト**: O(1) - ハッシュマップ検索のみ

**探索ボタンは存在しない**: レシピはプレイヤーが実際に試すことでのみ発見される

---

## レア度システム

### レア度計算

```typescript
function calculateRarity(recipe: Recipe): number {
  let rarity = 100;  // ベース

  // 入力数が多いほどレア
  rarity *= Math.pow(2, recipe.input.length - 1);

  // Tierが高いほどレア
  rarity *= (1 + recipe.tier * 0.1);

  // 建物タイプでレア度調整
  if (recipe.building === 'merger') rarity *= 1.5;
  if (recipe.building === 'catalyst') rarity *= 3.0;

  // 文字とアイコンの混在はレア
  const hasChar = recipe.input.some(r => r.type === 'character');
  const hasIcon = recipe.input.some(r => r.type === 'icon');
  if (hasChar && hasIcon) rarity *= 2.0;

  return Math.floor(rarity);
}

// レアリティ分類
function getRarityClass(rarity: number): string {
  if (rarity < 100) return 'common';
  if (rarity < 300) return 'uncommon';
  if (rarity < 700) return 'rare';
  if (rarity < 1500) return 'epic';
  return 'legendary';
}
```

### ボーナス効果

```typescript
type Effect = {
  type: 'production' | 'efficiency' | 'unlock' | 'grid';
  value: number;
  target?: string;  // 特定リソースやビルディング
}

// レシピ発見時のボーナス例
const bonuses = {
  common: { type: 'production', value: 0.05 },      // +5%
  uncommon: { type: 'efficiency', value: 0.10 },    // +10%
  rare: { type: 'production', value: 0.15 },        // +15%
  epic: { type: 'unlock', value: 'new_building' },  // 新建物
  legendary: { type: 'grid', value: 1 }             // グリッド+1
};
```

---

## スキルツリー

### 構造

```
スキルツリー（無限）
├─ 基礎ブランチ（有限）
│  ├─ グリッド拡張
│  ├─ 建物スロット拡張
│  └─ Tier解放
│
├─ 効率ブランチ（無限）
│  ├─ 生成速度 +5% (level 1-∞)
│  ├─ 変換速度 +5% (level 1-∞)
│  └─ 合成速度 +5% (level 1-∞)
│
└─ 特殊ブランチ（準無限）
   ├─ 新建物解放
   ├─ 新メカニクス解放
   └─ 複数ジェネレーター
```

### スキルノード

```typescript
type SkillNode = {
  id: string;
  type: 'base' | 'efficiency' | 'special';
  name: string;
  description: string;

  level: number;
  maxLevel: number | null;  // null = 無限

  cost: (level: number) => bigint;
  effect: Effect;

  prerequisites: string[];  // 前提スキルID
  unlocked: boolean;
}
```

**重要**: リソースがあればいつでもスキルを解放できる（フェーズ制限なし）

### コスト設計（インフレ対策）

```typescript
// 指数関数的コスト増加
function calculateSkillCost(baseSkill: SkillNode, level: number): bigint {
  const base = BigInt(baseSkill.baseCost);
  const multiplier = baseSkill.costMultiplier; // 1.15-1.25

  return base * BigInt(Math.floor(Math.pow(multiplier, level)));
}

// 例: base=100, multiplier=1.2
Level 1:   100
Level 10:  619
Level 20:  3,834
Level 50:  910,044
Level 100: 8,281,751,839
```

### 効果設計（インフレ対策）

```typescript
// 固定値加算（割合）
function applyEfficiencySkill(level: number): number {
  return 1.0 + (level * 0.05);  // +5%ずつ
}

// Level 1:  105%
// Level 10: 150%
// Level 20: 200%
// Level 100: 600%  (指数関数的ではなく線形)

// これにより、後期でも極端なインフレが起きない
```

---

## 経験値システム

```typescript
type Experience = {
  current: bigint;
  total: bigint;
  level: number;
}

// 経験値獲得
function gainExperience(amount: bigint) {
  player.exp.current += amount;
  player.exp.total += amount;

  // レベルアップチェック
  while (player.exp.current >= getExpForNextLevel(player.exp.level)) {
    player.exp.current -= getExpForNextLevel(player.exp.level);
    player.exp.level++;
    onLevelUp();
  }
}

// レベルアップ必要経験値
function getExpForNextLevel(level: number): bigint {
  return BigInt(Math.floor(100 * Math.pow(1.1, level)));
}

// 経験値獲得源
const expSources = {
  resourceProduced: 1n,         // リソース生成ごと
  recipeDiscovered: 100n,       // レシピ発見
  rarityBonus: (rarity) => BigInt(rarity),
  tierUnlock: (tier) => BigInt(1000 * tier)
};
```

---

## Tierシステム

### Tier進行条件

```typescript
type TierRequirement = {
  level: number;              // プレイヤーレベル
  recipesDiscovered: number;  // 現tierレシピ発見数
  totalProduction: bigint;    // 累計生産量
}

function canAdvanceTier(currentTier: number): boolean {
  const req = tierRequirements[currentTier];

  return (
    player.level >= req.level &&
    getDiscoveredRecipeCount(currentTier) >= req.recipesDiscovered &&
    player.totalProduction >= req.totalProduction
  );
}

// 例
const tierRequirements = {
  1: { level: 1,  recipesDiscovered: 2,  totalProduction: 100n },
  2: { level: 5,  recipesDiscovered: 20, totalProduction: 1000n },
  3: { level: 10, recipesDiscovered: 100, totalProduction: 10000n },
  // ...
};
```

**重要**: 条件を満たせばいつでもTierを上げられる

### Tier到達時の変化

```
1. 新しい文字リソースが1つ追加される（base58から順番に）
2. 新しいアイコンリソースが1つ追加される（ランダム選択）
3. グリッドサイズが拡大する
4. 新しい建物タイプが解放される可能性
5. 新しいレシピが大量に追加される（組み合わせ爆発）
6. スキルツリーの新しいブランチが開く
```

---

## SVGアイコン管理

### アイコンプール

```typescript
// ゲーム開始時にアイコンライブラリからシャッフル
type IconPool = {
  available: IconData[];      // まだ未使用のアイコン
  unlocked: IconData[];       // 解放済みのアイコン
}

type IconData = {
  name: string;              // "Star"
  component: SVGComponent;   // React component
  library: string;           // "lucide" | "heroicons"
}

// 初期化
function initializeIconPool(): IconPool {
  const allIcons = [
    ...getLucideIcons(),
    ...getHeroicons(),
    // 他のアイコンライブラリ
  ];

  // シャッフル
  const shuffled = shuffle(allIcons);

  return {
    available: shuffled,
    unlocked: []
  };
}

// Tier上昇時
function onTierUp(tier: number) {
  const newIcon = iconPool.available.shift()!;
  iconPool.unlocked.push(newIcon);

  // 新しいアイコンリソースを追加
  addIconResource(newIcon, tier);
}
```

### 合成アイコンの生成

文字とアイコンの組み合わせを視覚的に表現

```typescript
function generateRecipeDisplay(input: Resource[], output: Resource): SVGComponent {
  if (output.type === 'character') {
    // 出力が文字の場合: 文字を表示
    return <span className="text-2xl font-mono">{output.display}</span>;
  }

  if (output.type === 'icon') {
    // 出力がアイコンの場合
    if (input.length === 1) {
      // シンプル変換: そのままアイコン表示
      return output.display as SVGComponent;
    } else {
      // 合成: 複数のリソースを組み合わせて表示
      return (
        <div className="flex items-center gap-1">
          {input.map((res, i) => (
            <div key={i} className="opacity-50 scale-75">
              {res.type === 'character'
                ? <span className="font-mono">{res.display}</span>
                : res.display
              }
            </div>
          ))}
        </div>
      );
    }
  }
}
```

---

## データ構造

### プレイヤーデータ

```typescript
type PlayerData = {
  // 基本情報
  exp: {
    current: bigint;
    total: bigint;
    level: number;
  };
  tier: number;

  // リソース（文字とアイコンを分離）
  characters: Map<string, bigint>;  // { "A": 1234n, "B": 567n, ... }
  icons: Map<string, bigint>;       // { "star": 89n, "circle": 45n, ... }

  // グリッド
  grid: {
    size: { width: number; height: number };
    cells: Cell[][];
    buildings: Building[];
  };

  // スキル
  skills: Map<string, SkillNode>;

  // コレクション
  recipes: Map<string, Collection>;

  // 統計
  stats: {
    totalProduction: bigint;
    playTime: number;
    recipesDiscovered: number;
  };
}
```

### セーブデータ

```typescript
type SaveData = {
  version: string;
  timestamp: number;

  player: {
    exp: { current: string; total: string; level: number };
    tier: number;
    characters: Record<string, string>;  // bigintを文字列化
    icons: Record<string, string>;
  };

  grid: {
    size: { width: number; height: number };
    buildings: BuildingSaveData[];
  };

  skills: Record<string, { level: number }>;

  // コレクションは発見済みIDのみ保存
  discoveredRecipes: string[];
  recipeStats: Record<string, string>;  // timesUsed

  // アイコンプール
  iconPool: {
    unlockedIcons: string[];  // アイコン名のリスト
  };
}

// IndexedDBに保存
async function saveGame(data: SaveData) {
  const db = await openDB('the-unknown', 1);
  await db.put('saves', data, 'current');
}
```

---

## UI設計

### メイン画面レイアウト

```
┌────────────────────────────────────────────┐
│ Header                                      │
│ Tier 3 | Level 12 | Exp: 1,234/2,000       │
├────────────────────────────────────────────┤
│ Sidebar          │ Main Area              │
│                  │                         │
│ [Characters]     │  ┌──────────────────┐  │
│ A: 1,234         │  │                  │  │
│ B: 456           │  │   Grid View      │  │
│ C: 89            │  │   (Canvas/SVG)   │  │
│                  │  │                  │  │
│ [Icons]          │  └──────────────────┘  │
│ ⭐: 23           │                         │
│ ⭕: 45           │  [Controls]             │
│ ▢: 12            │  [Delete] [Rotate]      │
│                  │  [Clear]                │
│ [Buildings]      │                         │
│ Generator [10]   │                         │
│ Conveyor [5]     │                         │
│ Transformer [20] │                         │
│ Merger [50]      │                         │
│                  │                         │
│ [Actions]        │                         │
│ [Advance Tier]   │                         │
├────────────────────────────────────────────┤
│ Tabs: [Grid] [Skills] [Collection] [Stats] │
└────────────────────────────────────────────┘
```

### コレクション画面

```
┌────────────────────────────────────────────┐
│ Collection: 45 / 123,880 (0.04%)           │
├────────────────────────────────────────────┤
│ Filters: [All] [T1] [T2] [T3]              │
│          [Char] [Icon] [Mixed]             │
│          [Common] [Rare] [Epic] [Legendary]│
├────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │    A     │ │    ⭐    │ │  A + ⭐  │    │
│ │    →     │ │    →     │ │    →     │    │
│ │    B     │ │    ⭕    │ │  [icon]  │    │
│ │ Common   │ │ Uncommon │ │   Rare   │    │
│ │ Used: 234│ │ Used: 45 │ │ Used: 12 │    │
│ └──────────┘ └──────────┘ └──────────┘    │
│                                             │
│ 注: レシピは実際に試すことで発見される     │
└────────────────────────────────────────────┘
```

---

## 技術スタック

### フロントエンド
- **ビルドツール**: Vite
- **フレームワーク**: React
- **スタイリング**: TailwindCSS
- **状態管理**: Zustand or Jotai
- **アイコン**: Lucide React, Heroicons
- **アニメーション**: Framer Motion (optional)
- **テスト**: Vitest

### データ永続化
- **ローカル**: IndexedDB (via idb)
- **クラウド（将来）**: Cloudflare D1

### ゲームロジック
```typescript
// コアロジックはフレームワーク非依存
/src
  /core
    /engine        # ゲームループ、フロー計算
    /systems       # リソース、コレクション、スキル
    /entities      # Building, Resource, Recipe
    /utils         # 計算、生成アルゴリズム
  /components      # Reactコンポーネント
  /hooks           # カスタムフック
  /lib             # ユーティリティ、定数
  /stores          # 状態管理
  index.html       # エントリーポイント
  main.tsx         # Reactルート
```

---

## 実装優先順位

### Phase 1: MVP（最小実装）
1. Vite + React + TailwindCSSのセットアップ
2. グリッドシステム（5x5固定）
3. 基本建物（Generator, Conveyor, Merger, Output）
4. 2種類の文字リソース（"1", "2"）
5. 2種類のアイコンリソース（Star, Circle）
6. 簡単なレシピ発見（自動）
7. 基本的なリソースフロー

### Phase 2: コアループ
1. スキルツリー（基礎ブランチのみ）
2. Tier 2-3の実装
3. コレクション図鑑UI
4. セーブ/ロード（IndexedDB）

### Phase 3: 拡張
1. 追加建物（Merger, Splitter, Filter等）
2. Tier 4-10
3. スキルツリー（効率・特殊ブランチ）
4. レア度システム
5. ボーナス効果

### Phase 4: ポリッシュ
1. アニメーション
2. サウンド（オプション）
3. チュートリアル
4. 統計画面
5. 実績システム

### Phase 5: クラウド版
1. Cloudflare D1統合
2. アカウントシステム
3. クロスデバイス同期

---

## バランス調整の指針

### インフレ対策
1. **物理的制約**: グリッドサイズと建物数の上限
2. **指数コスト**: スキルとTier進行のコスト
3. **線形効果**: スキル効果は加算型（乗算を避ける）
4. **複雑性**: 後期は最適化が難しくなる
5. **相対的価値減少**: Tier上昇で既存リソースの価値低下

### プレイ時間の目安
```
Tier 1-2:  1-2時間
Tier 3-5:  10-20時間
Tier 6-10: 50-100時間
Tier 11+:  数百時間（エンドコンテンツ）
```

### レシピ発見率
```
Tier N:
  - 能動プレイ: 1時間あたり10-20レシピ
  - 完全コンプリート: Tier Nで数十時間
```

---

## 今後の検討事項

### 未決定要素
- [ ] 具体的な建物の処理速度
- [ ] base58文字の選択順序（A-Z優先？ランダム？）
- [ ] アイコンライブラリの選定と数
- [ ] Resonator（共鳴器）のメカニクス
- [ ] マルチプレイヤー要素の有無
- [ ] リーダーボード
- [ ] イベント/シーズン制

### 技術的課題
- [ ] 大規模グリッド（20x20+）のパフォーマンス最適化
- [ ] リソースフローのアニメーション実装
- [ ] bigintのシリアライゼーション
- [ ] IndexedDBのマイグレーション戦略
- [ ] アイコンの動的ロード

---

## まとめ

**The Unknown**は、配置パズル型リソースフローゲームとして、以下の特徴を持つ：

1. **抽象的世界観**: base58文字とSVGアイコンのみ
2. **2種類のリソース**: 文字リソースとアイコンリソースの独立した系統
3. **無限コンテンツ**: Tierごとのレシピ組み合わせ爆発
4. **リアルタイム**: フェーズ制限なし、いつでも変更可能
5. **発見の喜び**: 実際に試すことでレシピを発見
6. **戦略性**: グリッド配置の最適化
7. **インフレ制御**: 物理的制約と数学的バランス
8. **低コスト運用**: イラスト不要、ランタイムのみで完結

コアコンセプトは明確であり、実装可能な設計となっている。
