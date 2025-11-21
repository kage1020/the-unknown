# The Unknown - 技術仕様書

## アーキテクチャ概要

### ディレクトリ構造

```
the-unknown/
├── src/
│   ├── core/                 # ゲームコアロジック（フレームワーク非依存）
│   │   ├── engine/
│   │   │   ├── GameEngine.ts       # メインゲームループ
│   │   │   ├── FlowEngine.ts       # リソースフロー計算
│   │   │   └── TickManager.ts      # 時間管理
│   │   ├── systems/
│   │   │   ├── ResourceSystem.ts   # リソース管理
│   │   │   ├── CollectionSystem.ts # コレクション/レシピ管理
│   │   │   ├── SkillSystem.ts      # スキルツリー
│   │   │   ├── TierSystem.ts       # Tier管理
│   │   │   └── GridSystem.ts       # グリッド管理
│   │   ├── entities/
│   │   │   ├── Building.ts         # 建物エンティティ
│   │   │   ├── Symbol.ts           # シンボルエンティティ
│   │   │   ├── Recipe.ts           # レシピエンティティ
│   │   │   └── Cell.ts             # グリッドセル
│   │   └── utils/
│   │       ├── combinatorics.ts    # 組み合わせ計算
│   │       ├── hash.ts             # ハッシュ生成
│   │       ├── bigint.ts           # bigint操作
│   │       └── random.ts           # 乱数・抽選
│   ├── components/           # React コンポーネント
│   │   ├── Grid/
│   │   │   ├── GridCanvas.tsx
│   │   │   ├── BuildingSprite.tsx
│   │   │   └── FlowAnimation.tsx
│   │   ├── UI/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── BuildingMenu.tsx
│   │   │   └── ResourceDisplay.tsx
│   │   ├── Collection/
│   │   │   ├── CollectionGrid.tsx
│   │   │   ├── RecipeCard.tsx
│   │   │   └── ExploreButton.tsx
│   │   ├── Skills/
│   │   │   ├── SkillTree.tsx
│   │   │   └── SkillNode.tsx
│   │   └── Icons/
│   │       ├── SymbolIcon.tsx
│   │       └── CompositeIcon.tsx
│   ├── hooks/               # カスタムフック
│   │   ├── useGameEngine.ts
│   │   ├── useGrid.ts
│   │   ├── useCollection.ts
│   │   └── useSaveLoad.ts
│   ├── stores/              # 状態管理
│   │   ├── gameStore.ts
│   │   ├── uiStore.ts
│   │   └── types.ts
│   ├── lib/                 # ユーティリティ
│   │   ├── db.ts           # IndexedDB wrapper
│   │   ├── svg.ts          # SVG生成
│   │   └── constants.ts    # 定数
│   └── app/                # Next.js App Router
│       ├── page.tsx
│       ├── layout.tsx
│       └── globals.css
├── public/
│   └── icons/              # 静的SVGアイコン
├── docs/
│   ├── GAME_DESIGN.md
│   └── TECHNICAL_SPEC.md   # このファイル
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## コアシステム実装

### 1. GameEngine

メインゲームループと状態管理

```typescript
// src/core/engine/GameEngine.ts

export class GameEngine {
  private tickManager: TickManager;
  private flowEngine: FlowEngine;
  private systems: {
    resource: ResourceSystem;
    collection: CollectionSystem;
    skill: SkillSystem;
    tier: TierSystem;
    grid: GridSystem;
  };

  private isRunning: boolean = false;
  private lastTick: number = 0;

  constructor() {
    this.tickManager = new TickManager(10); // 10 ticks/second
    this.flowEngine = new FlowEngine();

    this.systems = {
      resource: new ResourceSystem(),
      collection: new CollectionSystem(),
      skill: new SkillSystem(),
      tier: new TierSystem(),
      grid: new GridSystem()
    };
  }

  start() {
    this.isRunning = true;
    this.lastTick = Date.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
  }

  private loop() {
    if (!this.isRunning) return;

    const now = Date.now();
    const delta = now - this.lastTick;

    if (this.tickManager.shouldTick(delta)) {
      this.tick(delta / 1000); // deltaを秒に変換
      this.lastTick = now;
    }

    requestAnimationFrame(() => this.loop());
  }

  private tick(deltaTime: number) {
    // 1. グリッドの建物を処理
    this.systems.grid.tick(deltaTime);

    // 2. リソースフローを計算
    const flows = this.flowEngine.calculateFlows(this.systems.grid.getGrid());

    // 3. フローを実行
    for (const flow of flows) {
      this.executeFlow(flow);
    }

    // 4. システムを更新
    this.systems.resource.tick(deltaTime);
    this.systems.collection.tick(deltaTime);
  }

  private executeFlow(flow: Flow) {
    const { building, input, output } = flow;

    // リソース消費
    for (const symbol of input) {
      this.systems.resource.consume(symbol, 1n);
    }

    // リソース生成
    this.systems.resource.produce(output, 1n);

    // コレクション発見チェック
    this.systems.collection.onCraft(input, output, building);

    // 経験値獲得
    this.systems.tier.gainExp(1n);
  }

  // 外部API
  getState(): GameState {
    return {
      resources: this.systems.resource.getAll(),
      grid: this.systems.grid.getGrid(),
      tier: this.systems.tier.getCurrentTier(),
      exp: this.systems.tier.getExp(),
      collections: this.systems.collection.getDiscovered(),
      skills: this.systems.skill.getAll()
    };
  }

  placeBuilding(building: Building, x: number, y: number): boolean {
    return this.systems.grid.placeBuilding(building, x, y);
  }

  removeBuilding(x: number, y: number): boolean {
    return this.systems.grid.removeBuilding(x, y);
  }

  unlockSkill(skillId: string): boolean {
    return this.systems.skill.unlock(skillId);
  }

  explore(): Recipe | null {
    return this.systems.collection.explore();
  }
}
```

---

### 2. FlowEngine

リソースフローの計算（最も重要な部分）

```typescript
// src/core/engine/FlowEngine.ts

type Flow = {
  building: Building;
  input: Symbol[];
  output: Symbol;
  position: { x: number; y: number };
};

export class FlowEngine {
  calculateFlows(grid: Grid): Flow[] {
    const flows: Flow[] = [];

    // 全建物を走査
    for (const building of grid.buildings) {
      const flow = this.processBuilding(building, grid);
      if (flow) flows.push(flow);
    }

    return flows;
  }

  private processBuilding(building: Building, grid: Grid): Flow | null {
    switch (building.type) {
      case 'generator':
        return this.processGenerator(building);

      case 'transformer':
        return this.processTransformer(building, grid);

      case 'merger':
        return this.processMerger(building, grid);

      default:
        return null;
    }
  }

  private processGenerator(building: Building): Flow {
    // 生成器は常に出力
    return {
      building,
      input: [],
      output: building.recipe!.output,
      position: building.position
    };
  }

  private processTransformer(building: Building, grid: Grid): Flow | null {
    // 入力方向からシンボルを取得
    const inputCell = this.getAdjacentCell(
      grid,
      building.position,
      this.getOppositeDirection(building.direction)
    );

    if (!inputCell || inputCell.symbols.length === 0) {
      return null; // 入力なし
    }

    const inputSymbol = inputCell.symbols[0]; // 先頭のシンボル

    // レシピに一致するか確認
    if (building.recipe!.input[0] !== inputSymbol.id) {
      return null; // レシピ不一致
    }

    // 入力を消費して出力
    inputCell.symbols.shift();

    return {
      building,
      input: [inputSymbol],
      output: building.recipe!.output,
      position: building.position
    };
  }

  private processMerger(building: Building, grid: Grid): Flow | null {
    // 複数方向から入力
    const inputs: Symbol[] = [];
    const requiredInputs = building.recipe!.input;

    // 入力セルを確認
    for (let i = 0; i < requiredInputs.length; i++) {
      const inputCell = this.getAdjacentCell(
        grid,
        building.position,
        this.getInputDirection(building, i)
      );

      if (!inputCell || inputCell.symbols.length === 0) {
        return null; // 入力が揃っていない
      }

      const symbol = inputCell.symbols[0];
      if (symbol.id !== requiredInputs[i]) {
        return null; // レシピ不一致
      }

      inputs.push(symbol);
    }

    // 全ての入力を消費
    for (let i = 0; i < requiredInputs.length; i++) {
      const inputCell = this.getAdjacentCell(
        grid,
        building.position,
        this.getInputDirection(building, i)
      );
      inputCell!.symbols.shift();
    }

    return {
      building,
      input: inputs,
      output: building.recipe!.output,
      position: building.position
    };
  }

  private getAdjacentCell(
    grid: Grid,
    position: { x: number; y: number },
    direction: Direction
  ): Cell | null {
    const { x, y } = position;
    let targetX = x;
    let targetY = y;

    switch (direction) {
      case 'up':    targetY--; break;
      case 'down':  targetY++; break;
      case 'left':  targetX--; break;
      case 'right': targetX++; break;
    }

    if (targetX < 0 || targetX >= grid.width || targetY < 0 || targetY >= grid.height) {
      return null; // グリッド外
    }

    return grid.cells[targetY][targetX];
  }

  private getOppositeDirection(direction: Direction): Direction {
    const opposites: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left'
    };
    return opposites[direction];
  }

  private getInputDirection(building: Building, index: number): Direction {
    // Mergerの入力方向を決定（building.directionを基準に）
    const directions: Direction[] = ['up', 'left', 'right', 'down'];
    const baseIndex = directions.indexOf(building.direction);
    return directions[(baseIndex + index + 1) % 4];
  }
}
```

---

### 3. CollectionSystem

レシピ生成と発見管理

```typescript
// src/core/systems/CollectionSystem.ts

export class CollectionSystem {
  private recipes: Map<string, Recipe> = new Map();
  private recipesByTier: Map<number, Recipe[]> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize() {
    // 起動時に全tierのレシピを事前生成（tier 1-20）
    for (let tier = 1; tier <= 20; tier++) {
      const symbols = this.getSymbolsForTier(tier);
      const recipes = this.generateRecipes(tier, symbols);

      this.recipesByTier.set(tier, recipes);

      for (const recipe of recipes) {
        this.recipes.set(recipe.id, recipe);
      }
    }
  }

  private getSymbolsForTier(tier: number): string[] {
    const baseSymbols = ['・', '|', '△', '□', '○', '◇', '☆', '◎', '●', '◆'];
    return baseSymbols.slice(0, Math.min(tier + 1, baseSymbols.length));
  }

  private generateRecipes(tier: number, symbols: string[]): Recipe[] {
    const recipes: Recipe[] = [];

    // 1. Simple recipes (A → B)
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        if (i === j) continue;

        recipes.push({
          id: this.generateRecipeId([symbols[i]], symbols[j], 'transformer'),
          tier,
          type: 'simple',
          input: [symbols[i]],
          output: symbols[j],
          building: 'transformer',
          discovered: false,
          timesUsed: 0n,
          rarity: this.calculateRarity(1, tier)
        });
      }
    }

    // 2. Compound recipes - 2つ (A + B → AB)
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        if (i === j) continue;

        const output = this.combineSymbols([symbols[i], symbols[j]]);
        recipes.push({
          id: this.generateRecipeId([symbols[i], symbols[j]], output, 'merger'),
          tier,
          type: 'compound',
          input: [symbols[i], symbols[j]],
          output,
          building: 'merger',
          discovered: false,
          timesUsed: 0n,
          rarity: this.calculateRarity(2, tier)
        });
      }
    }

    // 3. Compound recipes - 3つ (A + B + C → ABC)
    if (symbols.length >= 3) {
      for (let i = 0; i < symbols.length; i++) {
        for (let j = 0; j < symbols.length; j++) {
          for (let k = 0; k < symbols.length; k++) {
            if (i === j || j === k || i === k) continue;

            const output = this.combineSymbols([symbols[i], symbols[j], symbols[k]]);
            recipes.push({
              id: this.generateRecipeId([symbols[i], symbols[j], symbols[k]], output, 'merger'),
              tier,
              type: 'compound',
              input: [symbols[i], symbols[j], symbols[k]],
              output,
              building: 'merger',
              discovered: false,
              timesUsed: 0n,
              rarity: this.calculateRarity(3, tier)
            });
          }
        }
      }
    }

    // 4. Compound recipes - 4つ
    if (symbols.length >= 4) {
      for (let i = 0; i < symbols.length; i++) {
        for (let j = 0; j < symbols.length; j++) {
          for (let k = 0; k < symbols.length; k++) {
            for (let l = 0; l < symbols.length; l++) {
              if (i === j || i === k || i === l || j === k || j === l || k === l) continue;

              const output = this.combineSymbols([symbols[i], symbols[j], symbols[k], symbols[l]]);
              recipes.push({
                id: this.generateRecipeId([symbols[i], symbols[j], symbols[k], symbols[l]], output, 'merger'),
                tier,
                type: 'compound',
                input: [symbols[i], symbols[j], symbols[k], symbols[l]],
                output,
                building: 'merger',
                discovered: false,
                timesUsed: 0n,
                rarity: this.calculateRarity(4, tier)
              });
            }
          }
        }
      }
    }

    return recipes;
  }

  private generateRecipeId(input: string[], output: string, building: string): string {
    const inputStr = input.join(',');
    return `recipe_${building}_${hashString(inputStr)}_${hashString(output)}`;
  }

  private combineSymbols(symbols: string[]): string {
    // シンボルを結合（簡易版）
    return symbols.join('');
  }

  private calculateRarity(inputCount: number, tier: number): number {
    let rarity = 100;
    rarity *= Math.pow(2, inputCount - 1);
    rarity *= (1 + tier * 0.1);
    return Math.floor(rarity);
  }

  // 実際に生成されたときに呼ばれる
  onCraft(input: Symbol[], output: Symbol, building: Building) {
    const recipeId = this.generateRecipeId(
      input.map(s => s.icon),
      output.icon,
      building.type
    );

    const recipe = this.recipes.get(recipeId);
    if (!recipe) return; // 未定義のレシピ

    if (!recipe.discovered) {
      recipe.discovered = true;
      this.onDiscover(recipe);
    }

    recipe.timesUsed++;
  }

  private onDiscover(recipe: Recipe) {
    // 発見通知
    console.log(`Recipe discovered: ${recipe.input.join(' + ')} → ${recipe.output}`);

    // ボーナス付与
    if (recipe.bonus) {
      this.applyBonus(recipe.bonus);
    }

    // イベント発火
    this.emit('recipeDiscovered', recipe);
  }

  // 探索ボタン
  explore(tier: number): Recipe | null {
    const recipes = this.recipesByTier.get(tier);
    if (!recipes) return null;

    const undiscovered = recipes.filter(r => !r.discovered);
    if (undiscovered.length === 0) return null;

    // レア度に応じた重み付き抽選
    const selected = weightedRandom(undiscovered, r => 1 / r.rarity);
    selected.discovered = true;
    this.onDiscover(selected);

    return selected;
  }

  getDiscovered(): Recipe[] {
    return Array.from(this.recipes.values()).filter(r => r.discovered);
  }

  getByTier(tier: number): Recipe[] {
    return this.recipesByTier.get(tier) || [];
  }

  getRecipe(id: string): Recipe | undefined {
    return this.recipes.get(id);
  }

  tick(deltaTime: number) {
    // 定期処理（必要に応じて）
  }

  private emit(event: string, data: any) {
    // イベントエミッター（省略）
  }

  private applyBonus(bonus: Effect) {
    // ボーナス適用（省略）
  }
}
```

---

### 4. 組み合わせ計算ユーティリティ

```typescript
// src/core/utils/combinatorics.ts

/**
 * 順列を生成（順序を考慮）
 * nPr = n! / (n-r)!
 */
export function permutations<T>(array: T[], r: number): T[][] {
  if (r === 0) return [[]];
  if (r > array.length) return [];

  const result: T[][] = [];

  for (let i = 0; i < array.length; i++) {
    const current = array[i];
    const remaining = array.filter((_, index) => index !== i);
    const perms = permutations(remaining, r - 1);

    for (const perm of perms) {
      result.push([current, ...perm]);
    }
  }

  return result;
}

/**
 * 組み合わせを生成（順序を考慮しない）
 * nCr = n! / (r! * (n-r)!)
 */
export function combinations<T>(array: T[], r: number): T[][] {
  if (r === 0) return [[]];
  if (r > array.length) return [];

  const result: T[][] = [];

  for (let i = 0; i <= array.length - r; i++) {
    const current = array[i];
    const remaining = array.slice(i + 1);
    const combs = combinations(remaining, r - 1);

    for (const comb of combs) {
      result.push([current, ...comb]);
    }
  }

  return result;
}

/**
 * 階乗計算
 */
export function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

/**
 * nPr計算
 */
export function nPr(n: number, r: number): number {
  if (r > n) return 0;
  return factorial(n) / factorial(n - r);
}

/**
 * nCr計算
 */
export function nCr(n: number, r: number): number {
  if (r > n) return 0;
  return factorial(n) / (factorial(r) * factorial(n - r));
}
```

---

### 5. ハッシュ生成

```typescript
// src/core/utils/hash.ts

/**
 * 文字列からシンプルなハッシュを生成
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash).toString(36);
}

/**
 * 配列からハッシュを生成
 */
export function hashArray(arr: any[]): string {
  return hashString(JSON.stringify(arr));
}

/**
 * オブジェクトからハッシュを生成
 */
export function hashObject(obj: Record<string, any>): string {
  const sorted = Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as Record<string, any>);
  return hashString(JSON.stringify(sorted));
}
```

---

### 6. 重み付きランダム抽選

```typescript
// src/core/utils/random.ts

/**
 * 重み付きランダム抽選
 */
export function weightedRandom<T>(
  items: T[],
  weightFn: (item: T) => number
): T {
  const weights = items.map(weightFn);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1]; // fallback
}

/**
 * シンプルなランダム選択
 */
export function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * 範囲内のランダム整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

---

## データ永続化

### IndexedDB Wrapper

```typescript
// src/lib/db.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TheUnknownDB extends DBSchema {
  saves: {
    key: string;
    value: SaveData;
  };
  settings: {
    key: string;
    value: any;
  };
}

let dbInstance: IDBPDatabase<TheUnknownDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TheUnknownDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TheUnknownDB>('the-unknown', 1, {
    upgrade(db) {
      // saves store
      if (!db.objectStoreNames.contains('saves')) {
        db.createObjectStore('saves');
      }

      // settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    },
  });

  return dbInstance;
}

export async function saveGame(data: SaveData): Promise<void> {
  const db = await getDB();
  await db.put('saves', data, 'current');
}

export async function loadGame(): Promise<SaveData | null> {
  const db = await getDB();
  return (await db.get('saves', 'current')) || null;
}

export async function deleteSave(): Promise<void> {
  const db = await getDB();
  await db.delete('saves', 'current');
}

export async function getSetting(key: string): Promise<any> {
  const db = await getDB();
  return await db.get('settings', key);
}

export async function setSetting(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('settings', value, key);
}
```

---

### セーブデータ構造

```typescript
// src/stores/types.ts

export type SaveData = {
  version: string;
  timestamp: number;

  player: {
    exp: {
      current: string;  // bigint → string
      total: string;
      level: number;
    };
    tier: number;
    playTime: number;  // 秒
  };

  resources: Record<string, string>;  // { '・': '1234', ... }

  grid: {
    width: number;
    height: number;
    buildings: BuildingSaveData[];
  };

  skills: Record<string, number>;  // { 'skill_001': 5, ... }

  discoveredRecipes: string[];  // recipe IDs
  recipeStats: Record<string, string>;  // { 'recipe_001': '123', ... } (timesUsed)
};

type BuildingSaveData = {
  type: BuildingType;
  position: { x: number; y: number };
  direction: Direction;
  level: number;
  recipe?: {
    input: string[];
    output: string;
  };
};
```

---

### シリアライゼーション

```typescript
// src/core/utils/bigint.ts

/**
 * bigintを文字列に変換
 */
export function bigintToString(value: bigint): string {
  return value.toString();
}

/**
 * 文字列をbigintに変換
 */
export function stringToBigint(value: string): bigint {
  return BigInt(value);
}

/**
 * Map<string, bigint> を Record<string, string> に変換
 */
export function serializeBigintMap(map: Map<string, bigint>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of map) {
    result[key] = bigintToString(value);
  }
  return result;
}

/**
 * Record<string, string> を Map<string, bigint> に変換
 */
export function deserializeBigintMap(obj: Record<string, string>): Map<string, bigint> {
  const map = new Map<string, bigint>();
  for (const [key, value] of Object.entries(obj)) {
    map.set(key, stringToBigint(value));
  }
  return map;
}
```

---

## SVG生成

### コンポジットアイコン生成

```typescript
// src/lib/svg.ts

export type SVGIconConfig = {
  symbols: string[];
  size?: number;
  color?: string;
};

export function generateCompositeIcon(config: SVGIconConfig): string {
  const { symbols, size = 100, color } = config;
  const n = symbols.length;

  if (n === 1) {
    return generateSingleIcon(symbols[0], size, color);
  }

  if (n === 2) {
    return generateDoubleIcon(symbols, size, color);
  }

  if (n === 3) {
    return generateTripleIcon(symbols, size, color);
  }

  if (n === 4) {
    return generateQuadIcon(symbols, size, color);
  }

  return generateCircularIcon(symbols, size, color);
}

function generateSingleIcon(symbol: string, size: number, color?: string): string {
  const svg = getBaseSVG(symbol);
  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${size/2}, ${size/2})">
        ${applyColor(svg, color)}
      </g>
    </svg>
  `;
}

function generateDoubleIcon(symbols: string[], size: number, color?: string): string {
  const [s1, s2] = symbols;
  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${size * 0.3}, ${size/2}) scale(0.8)">
        ${applyColor(getBaseSVG(s1), color)}
      </g>
      <g transform="translate(${size * 0.7}, ${size/2}) scale(0.8)">
        ${applyColor(getBaseSVG(s2), color)}
      </g>
    </svg>
  `;
}

function generateTripleIcon(symbols: string[], size: number, color?: string): string {
  const [s1, s2, s3] = symbols;
  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${size/2}, ${size * 0.25}) scale(0.6)">
        ${applyColor(getBaseSVG(s1), color)}
      </g>
      <g transform="translate(${size * 0.3}, ${size * 0.7}) scale(0.6)">
        ${applyColor(getBaseSVG(s2), color)}
      </g>
      <g transform="translate(${size * 0.7}, ${size * 0.7}) scale(0.6)">
        ${applyColor(getBaseSVG(s3), color)}
      </g>
    </svg>
  `;
}

function generateQuadIcon(symbols: string[], size: number, color?: string): string {
  const positions = [
    { x: 0.3, y: 0.3 },
    { x: 0.7, y: 0.3 },
    { x: 0.3, y: 0.7 },
    { x: 0.7, y: 0.7 }
  ];

  const groups = symbols.map((s, i) => `
    <g transform="translate(${size * positions[i].x}, ${size * positions[i].y}) scale(0.5)">
      ${applyColor(getBaseSVG(s), color)}
    </g>
  `).join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${groups}
    </svg>
  `;
}

function generateCircularIcon(symbols: string[], size: number, color?: string): string {
  const n = symbols.length;
  const angleStep = (2 * Math.PI) / n;
  const radius = size * 0.3;

  const groups = symbols.map((s, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = size/2 + radius * Math.cos(angle);
    const y = size/2 + radius * Math.sin(angle);

    return `
      <g transform="translate(${x}, ${y}) scale(0.4)">
        ${applyColor(getBaseSVG(s), color)}
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${groups}
    </svg>
  `;
}

function getBaseSVG(symbol: string): string {
  const svgMap: Record<string, string> = {
    '・': '<circle cx="0" cy="0" r="10" fill="currentColor" />',
    '|': '<line x1="0" y1="-20" x2="0" y2="20" stroke="currentColor" stroke-width="4" />',
    '△': '<polygon points="0,-15 15,15 -15,15" fill="currentColor" />',
    '□': '<rect x="-12" y="-12" width="24" height="24" fill="currentColor" />',
    '○': '<circle cx="0" cy="0" r="12" fill="none" stroke="currentColor" stroke-width="3" />',
    '◇': '<polygon points="0,-15 15,0 0,15 -15,0" fill="currentColor" />',
    // ... 他のシンボル
  };

  return svgMap[symbol] || svgMap['・'];
}

function applyColor(svg: string, color?: string): string {
  if (!color) return svg;
  return svg.replace(/currentColor/g, color);
}

export function getColorForTier(tier: number): string {
  const hue = (tier * 30) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export function getColorForRarity(rarity: number): string {
  if (rarity < 100) return '#aaaaaa';
  if (rarity < 300) return '#4ade80';
  if (rarity < 700) return '#60a5fa';
  if (rarity < 1500) return '#c084fc';
  return '#fbbf24';
}
```

---

## パフォーマンス最適化

### 1. フロー計算の最適化

```typescript
// セルごとにシンボルキューを持つ
type Cell = {
  x: number;
  y: number;
  building: Building | null;
  symbolQueue: Symbol[];  // 最大長を制限（例: 10個）
};

// 毎フレームではなく、tickごとに計算（10 FPS）
class TickManager {
  private tickRate: number;  // ticks per second
  private accumulator: number = 0;

  constructor(tickRate: number = 10) {
    this.tickRate = tickRate;
  }

  shouldTick(deltaMs: number): boolean {
    this.accumulator += deltaMs;
    const tickInterval = 1000 / this.tickRate;

    if (this.accumulator >= tickInterval) {
      this.accumulator -= tickInterval;
      return true;
    }

    return false;
  }
}
```

### 2. レンダリング最適化

```typescript
// Canvas描画を使用（SVGより高速）
// または、React.memoで不要な再描画を防ぐ

import { memo } from 'react';

export const BuildingSprite = memo(({ building }: { building: Building }) => {
  return (
    <div className="building" style={{
      gridColumn: building.position.x + 1,
      gridRow: building.position.y + 1,
    }}>
      {/* 建物アイコン */}
    </div>
  );
}, (prev, next) => {
  // 位置とtypeが変わらなければ再描画しない
  return (
    prev.building.position.x === next.building.position.x &&
    prev.building.position.y === next.building.position.y &&
    prev.building.type === next.building.type
  );
});
```

### 3. bigint計算の最適化

```typescript
// 小さい数値の場合はnumberを使用
export function optimizedAdd(a: bigint | number, b: bigint | number): bigint | number {
  if (typeof a === 'number' && typeof b === 'number') {
    const sum = a + b;
    if (Number.isSafeInteger(sum)) {
      return sum;
    }
  }
  return BigInt(a) + BigInt(b);
}

// よく使う値をキャッシュ
const BIGINT_CACHE = new Map<number, bigint>();

export function getBigInt(n: number): bigint {
  if (!BIGINT_CACHE.has(n)) {
    BIGINT_CACHE.set(n, BigInt(n));
  }
  return BIGINT_CACHE.get(n)!;
}
```

---

## 定数定義

```typescript
// src/lib/constants.ts

export const GAME_CONFIG = {
  // ゲームループ
  TICK_RATE: 10,  // ticks per second

  // グリッド
  INITIAL_GRID_SIZE: { width: 5, height: 5 },
  MAX_GRID_SIZE: { width: 50, height: 50 },

  // 建物
  INITIAL_BUILDING_LIMIT: 10,
  MAX_SYMBOLS_PER_CELL: 10,

  // Tier
  MAX_TIER: 100,
  INITIAL_TIER: 1,

  // コレクション
  MAX_RECIPE_INPUT: 4,
  EXPLORE_BASE_COST: 100n,

  // レア度閾値
  RARITY_THRESHOLDS: {
    COMMON: 100,
    UNCOMMON: 300,
    RARE: 700,
    EPIC: 1500,
  },
} as const;

export const BASE_SYMBOLS = [
  '・', '|', '△', '□', '○', '◇', '☆', '◎', '●', '◆'
] as const;

export const BUILDING_TYPES = [
  'generator',
  'conveyor',
  'transformer',
  'merger',
  'splitter',
  'filter',
  'buffer',
  'catalyst',
  'output'
] as const;

export const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
```

---

## まとめ

この技術仕様書では以下を定義しました：

1. **アーキテクチャ**: ディレクトリ構造、システム分離
2. **コアエンジン**: GameEngine, FlowEngine の実装
3. **コレクションシステム**: レシピの自動生成と発見
4. **ユーティリティ**: 組み合わせ計算、ハッシュ、ランダム
5. **データ永続化**: IndexedDB, セーブデータ
6. **SVG生成**: 合成アイコンの自動生成
7. **パフォーマンス**: 最適化手法
8. **定数**: ゲーム設定値

次のステップは実装フェーズです。
