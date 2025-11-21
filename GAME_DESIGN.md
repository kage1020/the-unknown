# The Unknown - ゲーム設計ドキュメント

## 概要

### ゲームコンセプト
- **タイトル**: The Unknown
- **世界観**: どの世界の言語でもない、抽象的な概念空間
- **ビジュアル**: ASCII文字とSVGアイコンのみで構成
- **目的**: 運用コストを極限まで削減し、無限に続くゲーム体験を提供

### コアコンセプト
プレイヤーは「観測者」として、未知の**概念空間**を探索する。すべては抽象的な記号（□、○、△、線、点など）とギリシャ文字、ASCII文字で表現される。

---

## コアメカニクス

### ゲームタイプ
**配置パズル型リソースフロー**

- グリッド上に建物（Generator, Transformer, Merger等）を配置
- リソース（シンボル）がグリッド上をフローする
- 配置と接続を最適化して効率を上げる
- 2次元的なリソースフローにより無限の組み合わせが発生

### 基本ゲームループ

```
1. 配置フェーズ
   - リソースで建物を購入
   - グリッドに配置
   - コンベアで接続

2. 最適化フェーズ
   - フローの効率を観察
   - ボトルネックを特定
   - 配置を組み替え

3. 拡張フェーズ
   - 新建物タイプ解放（スキルツリー）
   - グリッドサイズ拡大（Tier上昇時）
   - 新シンボルタイプ追加

4. 発見フェーズ
   - レシピ（コレクション）を発見
   - 図鑑に記録
   - ボーナス効果獲得
```

---

## リソースシステム

### シンボル（Symbol）
ゲーム内の基本リソース

```typescript
type Symbol = {
  id: string;        // "sym_dot"
  icon: string;      // "・"
  tier: number;      // 解放tier
  svg?: SVGData;     // SVG表現（オプション）
}
```

### Tierシステム
Tierが上がるごとに使えるシンボルの種類が1つ増える

```
Tier 1: [・, |]           (2種類)
Tier 2: [・, |, △]        (3種類)
Tier 3: [・, |, △, □]     (4種類)
...
Tier N: N+1種類
```

**組み合わせ爆発**:
- 2つ組: nC2 = n(n-1)/2
- 3つ組: nC3 = n(n-1)(n-2)/6
- 各組み合わせに順列（permutation）が存在

---

## 建物システム

### 建物タイプ

#### Tier 1（基本）
```
[Generator ・]
  機能: ・を生成（X/秒）
  出力: 1方向

[Conveyor →]
  機能: シンボルを転送
  方向: 上下左右

[Transformer ・→|]
  機能: ・を|に変換
  入力: 1種類
  出力: 1種類

[Output]
  機能: ストレージに蓄積
  入力: 任意
```

#### Tier 2以降
```
[Merger]
  機能: 複数シンボルを合成
  入力: 2-4方向
  出力: 1方向
  例: ・ + | → ・|

[Splitter]
  機能: 合成シンボルを分解
  入力: 1方向
  出力: 2-4方向
  例: ・| → ・ + |

[Filter]
  機能: 特定シンボルのみ通過
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
  recipe?: Recipe;  // Transformer, Merger用
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
  id: string;              // "recipe_T2_0_1_2"
  tier: number;            // 解放tier
  type: 'simple' | 'compound' | 'complex';

  // レシピ情報
  input: string[];         // 入力シンボル（順序付き）
  output: string;          // 出力シンボル
  building: BuildingType;  // 使用建物

  // メタ情報
  discovered: boolean;
  discoveredAt?: Date;
  timesUsed: bigint;       // 使用回数

  // ビジュアル
  icon: SVGComponent;      // 自動生成されたアイコン

  // ゲーム効果
  bonus?: Effect;          // 発見ボーナス
  rarity: number;          // レア度（1-1000）
}
```

### レシピの種類

#### 1. Simple Recipe（単純変換）
```
入力: 1種類
出力: 1種類
建物: Transformer

例:
  ・ → |
  △ → □
```

#### 2. Compound Recipe（合成）
```
入力: 2種類以上（順序あり）
出力: 1種類
建物: Merger

例:
  ・ + | → ・|
  | + ・ → |・  (異なる結果)
  ・ + | + △ → ・|△
  △ + | + ・ → △|・  (順序で結果が変わる)
```

#### 3. Complex Recipe（連鎖）
```
入力: 複数ステップ
出力: 最終成果物
建物: 複数の建物の組み合わせ

例:
  ・ → | → △ → 特殊シンボル◈
```

### コレクション数の計算

```typescript
// Tierごとのレシピ総数

function calculateTotalRecipes(tier: number): number {
  const n = tier + 1;  // シンボル数

  // Simple: n → n (各シンボルを他のシンボルに変換)
  const simple = n * (n - 1);

  // Compound (2つ): 順列 nP2 = n!/(n-2)!
  const compound2 = n * (n - 1);

  // Compound (3つ): 順列 nP3 = n!/(n-3)!
  const compound3 = n * (n - 1) * (n - 2);

  // Compound (4つ): 順列 nP4
  const compound4 = n * (n - 1) * (n - 2) * (n - 3);

  return simple + compound2 + compound3 + compound4;
}

// 例
Tier 1 (2 symbols):
  Simple: 2×1 = 2
  Compound2: 2×1 = 2
  Total: 4レシピ

Tier 2 (3 symbols):
  Simple: 3×2 = 6
  Compound2: 3×2 = 6
  Compound3: 3×2×1 = 6
  Total: 18レシピ

Tier 3 (4 symbols):
  Simple: 4×3 = 12
  Compound2: 4×3 = 12
  Compound3: 4×3×2 = 24
  Compound4: 4×3×2×1 = 24
  Total: 72レシピ

Tier 10 (11 symbols):
  Simple: 11×10 = 110
  Compound2: 11×10 = 110
  Compound3: 11×10×9 = 990
  Compound4: 11×10×9×8 = 7,920
  Total: 9,130レシピ
```

### 発見方法

#### A. 自動発見（Crafted）
建物が実際にシンボルを処理したとき自動的に発見

```typescript
function onBuildingProcess(
  building: Building,
  input: Symbol[],
  output: Symbol
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

#### B. 探索発見（Explored）
プレイヤーが「探索」ボタンを押してランダム発見

```typescript
function onExploreButton(tier: number) {
  const cost = calculateExploreCost(tier);
  if (!canAfford(cost)) return;

  spend(cost);

  // 未発見レシピから重み付き抽選
  const undiscovered = recipeDB
    .getByTier(tier)
    .filter(r => !r.discovered);

  if (undiscovered.length === 0) {
    showMessage("このTierのレシピは全て発見済み");
    return;
  }

  // レア度に応じた確率
  const recipe = weightedRandom(undiscovered, r => 1 / r.rarity);
  recipe.discovered = true;

  showDiscoveryAnimation(recipe);
  grantBonus(recipe.bonus);
}
```

**計算コスト**: O(n) - ボタンクリック時のみ

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
  target?: string;  // 特定シンボルやビルディング
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
   └─ 次元解放
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
  symbolProduced: 1n,           // シンボル生成ごと
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
  2: { level: 5,  recipesDiscovered: 10, totalProduction: 1000n },
  3: { level: 10, recipesDiscovered: 30, totalProduction: 10000n },
  // ...
};
```

### Tier到達時の変化

```
1. 新しいシンボルが1つ追加される
2. グリッドサイズが拡大する
3. 新しい建物タイプが解放される可能性
4. 新しいレシピが大量に追加される（組み合わせ爆発）
5. スキルツリーの新しいブランチが開く
```

---

## SVGアイコン自動生成

### 基本シンボルのSVG定義

```typescript
const baseSymbols: Record<string, SVGData> = {
  '・': {
    path: '<circle cx="50" cy="50" r="10" />',
    color: '#ffffff'
  },
  '|': {
    path: '<line x1="50" y1="20" x2="50" y2="80" stroke-width="4" />',
    color: '#ffffff'
  },
  '△': {
    path: '<polygon points="50,20 80,70 20,70" />',
    color: '#ffffff'
  },
  '□': {
    path: '<rect x="30" y="30" width="40" height="40" />',
    color: '#ffffff'
  },
  // ...
};
```

### 合成シンボルの生成

```typescript
function generateCompositeIcon(symbols: string[]): SVGComponent {
  const n = symbols.length;

  if (n === 2) {
    // 2つ: 左右に配置
    return (
      <svg viewBox="0 0 100 100">
        <g transform="translate(30, 50) scale(0.8)">
          {getSymbolSVG(symbols[0])}
        </g>
        <g transform="translate(70, 50) scale(0.8)">
          {getSymbolSVG(symbols[1])}
        </g>
      </svg>
    );
  }

  if (n === 3) {
    // 3つ: 三角形配置
    return (
      <svg viewBox="0 0 100 100">
        <g transform="translate(50, 25) scale(0.6)">
          {getSymbolSVG(symbols[0])}
        </g>
        <g transform="translate(30, 70) scale(0.6)">
          {getSymbolSVG(symbols[1])}
        </g>
        <g transform="translate(70, 70) scale(0.6)">
          {getSymbolSVG(symbols[2])}
        </g>
      </svg>
    );
  }

  if (n === 4) {
    // 4つ: 正方形配置
    const positions = [
      { x: 30, y: 30 },
      { x: 70, y: 30 },
      { x: 30, y: 70 },
      { x: 70, y: 70 }
    ];

    return (
      <svg viewBox="0 0 100 100">
        {symbols.map((sym, i) => (
          <g key={i} transform={`translate(${positions[i].x}, ${positions[i].y}) scale(0.5)`}>
            {getSymbolSVG(sym)}
          </g>
        ))}
      </svg>
    );
  }

  // 5つ以上: 円形配置
  const angleStep = (2 * Math.PI) / n;
  return (
    <svg viewBox="0 0 100 100">
      {symbols.map((sym, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = 50 + 30 * Math.cos(angle);
        const y = 50 + 30 * Math.sin(angle);
        return (
          <g key={i} transform={`translate(${x}, ${y}) scale(0.4)`}>
            {getSymbolSVG(sym)}
          </g>
        );
      })}
    </svg>
  );
}
```

### 色の自動生成

```typescript
function getColorForTier(tier: number): string {
  // Tierごとに色相を変える
  const hue = (tier * 30) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

function getColorForRarity(rarity: number): string {
  if (rarity < 100) return '#aaaaaa';   // common: gray
  if (rarity < 300) return '#4ade80';   // uncommon: green
  if (rarity < 700) return '#60a5fa';   // rare: blue
  if (rarity < 1500) return '#c084fc';  // epic: purple
  return '#fbbf24';                     // legendary: gold
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

  // リソース
  symbols: Map<string, bigint>;  // シンボルごとの所持数

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
    // ...
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
    symbols: Record<string, string>;  // bigintを文字列化
  };

  grid: {
    size: { width: number; height: number };
    buildings: BuildingData[];
  };

  skills: Record<string, { level: number }>;

  // コレクションは発見済みIDのみ保存
  discoveredRecipes: string[];
  recipeStats: Record<string, string>;  // timesUsed
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
│ [Resources]      │  ┌──────────────────┐  │
│ ・: 1,234        │  │                  │  │
│ |: 456           │  │   Grid View      │  │
│ △: 89            │  │   (Canvas/SVG)   │  │
│ ・|: 23           │  │                  │  │
│                  │  └──────────────────┘  │
│ [Buildings]      │                         │
│ Generator [10]   │  [Controls]             │
│ Conveyor [5]     │  [Delete] [Rotate]      │
│ Transformer [20] │  [Clear]                │
│ Merger [50]      │                         │
│                  │                         │
│ [Actions]        │                         │
│ [Explore: 100・]  │                         │
│ [Advance Tier]   │                         │
├────────────────────────────────────────────┤
│ Tabs: [Grid] [Skills] [Collection] [Stats] │
└────────────────────────────────────────────┘
```

### コレクション画面

```
┌────────────────────────────────────────────┐
│ Collection: 45 / 9,130 (0.49%)             │
├────────────────────────────────────────────┤
│ Filters: [All] [T1] [T2] [T3] [Undiscovered]│
│          [Common] [Rare] [Epic] [Legendary] │
├────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │  [icon]  │ │  [icon]  │ │    ??    │    │
│ │  ・→|    │ │ ・+|→・|  │ │  locked  │    │
│ │ Uncommon │ │   Rare   │ │  Common  │    │
│ │ Used: 234│ │ Used: 45 │ │          │    │
│ └──────────┘ └──────────┘ └──────────┘    │
│                                             │
│ [Explore] (Cost: 100・)                     │
└────────────────────────────────────────────┘
```

---

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14+ (App Router)
- **スタイリング**: TailwindCSS
- **状態管理**: Zustand or Jotai
- **SVG**: React SVG components
- **アニメーション**: Framer Motion (optional)

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
    /entities      # Building, Symbol, Recipe
    /utils         # 計算、生成アルゴリズム
  /components      # Reactコンポーネント
  /hooks           # カスタムフック
  /app             # Next.js App Router
```

---

## 実装優先順位

### Phase 1: MVP（最小実装）
1. グリッドシステム（5x5固定）
2. 基本建物（Generator, Conveyor, Transformer, Output）
3. 2種類のシンボル（・、|）
4. 簡単なレシピ発見（自動）
5. 基本的なリソースフロー

### Phase 2: コアループ
1. スキルツリー（基礎ブランチのみ）
2. Tier 2-3の実装
3. 探索ボタン
4. コレクション図鑑UI
5. セーブ/ロード（IndexedDB）

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
  - 探索ボタン: 1回あたり1レシピ
  - 完全コンプリート: Tier Nで数十時間
```

---

## 今後の検討事項

### 未決定要素
- [ ] 具体的な建物の処理速度
- [ ] 探索ボタンのコスト計算式
- [ ] Complex Recipeの実装詳細
- [ ] Resonator（共鳴器）のメカニクス
- [ ] マルチプレイヤー要素の有無
- [ ] リーダーボード
- [ ] イベント/シーズン制

### 技術的課題
- [ ] 大規模グリッド（20x20+）のパフォーマンス最適化
- [ ] リソースフローのアニメーション実装
- [ ] bigintのシリアライゼーション
- [ ] IndexedDBのマイグレーション戦略

---

## まとめ

**The Unknown**は、配置パズル型リソースフローゲームとして、以下の特徴を持つ：

1. **抽象的世界観**: ASCII文字とSVGのみ
2. **無限コンテンツ**: Tierごとのレシピ組み合わせ爆発
3. **戦略性**: グリッド配置の最適化
4. **発見の喜び**: レシピ（コレクション）の発見
5. **インフレ制御**: 物理的制約と数学的バランス
6. **低コスト運用**: イラスト不要、ランタイムのみで完結

コアコンセプトは明確であり、実装可能な設計となっている。
