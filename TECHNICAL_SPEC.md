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
│   │   │   ├── GridSystem.ts       # グリッド管理
│   │   │   └── IconPoolSystem.ts   # アイコンプール管理
│   │   ├── entities/
│   │   │   ├── Building.ts         # 建物エンティティ
│   │   │   ├── Resource.ts         # リソースエンティティ
│   │   │   ├── Recipe.ts           # レシピエンティティ
│   │   │   └── Cell.ts             # グリッドセル
│   │   └── utils/
│   │       ├── combinatorics.ts    # 組み合わせ計算
│   │       ├── hash.ts             # ハッシュ生成
│   │       ├── bigint.ts           # bigint操作
│   │       ├── random.ts           # 乱数・抽選
│   │       └── base58.ts           # base58ユーティリティ
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
│   │   │   └── RecipeCard.tsx
│   │   ├── Skills/
│   │   │   ├── SkillTree.tsx
│   │   │   └── SkillNode.tsx
│   │   └── Icons/
│   │       ├── ResourceIcon.tsx
│   │       └── CompositeDisplay.tsx
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
│   │   ├── icons.ts        # アイコンライブラリ管理
│   │   └── constants.ts    # 定数
│   ├── main.tsx            # エントリーポイント
│   ├── App.tsx             # ルートコンポーネント
│   └── index.css           # グローバルスタイル
├── public/
├── docs/
│   ├── GAME_DESIGN.md
│   └── TECHNICAL_SPEC.md   # このファイル
├── index.html              # HTML エントリーポイント
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── vitest.config.ts
```

---

## コアシステム実装

### 1. GameEngine

メインゲームループと状態管理（リアルタイム実行）

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
    iconPool: IconPoolSystem;
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
      grid: new GridSystem(),
      iconPool: new IconPoolSystem()
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
    for (const resource of input) {
      this.systems.resource.consume(resource, 1n);
    }

    // リソース生成
    this.systems.resource.produce(output, 1n);

    // コレクション発見チェック
    this.systems.collection.onCraft(input, output, building);

    // 経験値獲得
    this.systems.tier.gainExp(1n);
  }

  // 外部API（いつでも呼び出し可能）
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

  advanceTier(): boolean {
    if (!this.systems.tier.canAdvance()) return false;

    const newTier = this.systems.tier.advance();

    // 新しい文字リソースを追加
    this.systems.resource.unlockCharacter(newTier);

    // 新しいアイコンリソースを追加
    const newIcon = this.systems.iconPool.unlockNext();
    this.systems.resource.unlockIcon(newIcon);

    return true;
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
  input: Resource[];
  output: Resource;
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

      case 'merger':
        return this.processMerger(building, grid);

      default:
        return null;
    }
  }

  private processGenerator(building: Building): Flow {
    // 生成器は常に出力（入力なし）
    return {
      building,
      input: [],
      output: building.recipe!.output,
      position: building.position
    };
  }

  private processMerger(building: Building, grid: Grid): Flow | null {
    // 複数方向から入力
    const inputs: Resource[] = [];
    const requiredInputs = building.recipe!.input;

    // 入力セルを確認
    for (let i = 0; i < requiredInputs.length; i++) {
      const inputCell = this.getAdjacentCell(
        grid,
        building.position,
        this.getInputDirection(building, i)
      );

      if (!inputCell || inputCell.resources.length === 0) {
        return null; // 入力が揃っていない
      }

      const resource = inputCell.resources[0];
      if (resource.id !== requiredInputs[i].id) {
        return null; // レシピ不一致
      }

      inputs.push(resource);
    }

    // 全ての入力を消費
    for (let i = 0; i < requiredInputs.length; i++) {
      const inputCell = this.getAdjacentCell(
        grid,
        building.position,
        this.getInputDirection(building, i)
      );
      inputCell!.resources.shift();
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

### 3. ResourceSystem

2種類のリソース（文字とアイコン）を管理

```typescript
// src/core/systems/ResourceSystem.ts

export class ResourceSystem {
  private characters: Map<string, CharacterResource> = new Map();
  private icons: Map<string, IconResource> = new Map();

  constructor() {
    // 初期リソース (Tier 1)
    this.unlockCharacter(1);
  }

  unlockCharacter(tier: number) {
    const char = BASE58_CHARS[tier - 1];
    if (!char) return;

    const resource: CharacterResource = {
      id: `char_${char}`,
      type: 'character',
      value: char,
      tier,
      amount: 0n
    };

    this.characters.set(resource.id, resource);
  }

  unlockIcon(iconData: IconData) {
    const resource: IconResource = {
      id: `icon_${iconData.name}`,
      type: 'icon',
      iconName: iconData.name,
      svg: iconData.component,
      tier: this.getMaxTier() + 1,
      amount: 0n
    };

    this.icons.set(resource.id, resource);
  }

  produce(resource: Resource, amount: bigint) {
    if (resource.type === 'character') {
      const char = this.characters.get(resource.id);
      if (char) char.amount += amount;
    } else {
      const icon = this.icons.get(resource.id);
      if (icon) icon.amount += amount;
    }
  }

  consume(resource: Resource, amount: bigint): boolean {
    if (resource.type === 'character') {
      const char = this.characters.get(resource.id);
      if (!char || char.amount < amount) return false;
      char.amount -= amount;
      return true;
    } else {
      const icon = this.icons.get(resource.id);
      if (!icon || icon.amount < amount) return false;
      icon.amount -= amount;
      return true;
    }
  }

  getAll(): Resource[] {
    return [
      ...Array.from(this.characters.values()),
      ...Array.from(this.icons.values())
    ];
  }

  getCharacters(): CharacterResource[] {
    return Array.from(this.characters.values());
  }

  getIcons(): IconResource[] {
    return Array.from(this.icons.values());
  }

  private getMaxTier(): number {
    return Math.max(
      ...Array.from(this.characters.values()).map(c => c.tier),
      ...Array.from(this.icons.values()).map(i => i.tier)
    );
  }

  tick(deltaTime: number) {
    // 定期処理（必要に応じて）
  }
}
```

---

### 4. CollectionSystem

レシピ生成と発見管理

```typescript
// src/core/systems/CollectionSystem.ts

export class CollectionSystem {
  private recipes: Map<string, Recipe> = new Map();
  private recipesByTier: Map<number, Recipe[]> = new Map();

  constructor() {
    // 起動時に全tierのレシピを事前生成（tier 1-20）
    // ※実際には動的生成も可能
  }

  private generateRecipes(tier: number, resources: Resource[]): Recipe[] {
    const recipes: Recipe[] = [];

    // 1. Generation recipes (各リソースのジェネレーター)
    for (const resource of resources) {
      recipes.push({
        id: this.generateRecipeId([], resource, 'generator'),
        tier,
        type: 'generation',
        input: [],
        output: resource,
        building: 'generator',
        discovered: false,
        timesUsed: 0n,
        rarity: this.calculateRarity(0, tier, [], resource)
      });
    }

    // 2. Compound recipes - 2つ (A + B → C)
    for (let i = 0; i < resources.length; i++) {
      for (let j = 0; j < resources.length; j++) {
        if (i === j) continue;

        const output = this.combineResources([resources[i], resources[j]]);
        recipes.push({
          id: this.generateRecipeId([resources[i], resources[j]], output, 'merger'),
          tier,
          type: 'compound',
          input: [resources[i], resources[j]],
          output,
          building: 'merger',
          discovered: false,
          timesUsed: 0n,
          rarity: this.calculateRarity(2, tier, [resources[i], resources[j]], output)
        });
      }
    }

    // 3. Compound recipes - 3つ
    if (resources.length >= 3) {
      for (let i = 0; i < resources.length; i++) {
        for (let j = 0; j < resources.length; j++) {
          for (let k = 0; k < resources.length; k++) {
            if (i === j || j === k || i === k) continue;

            const output = this.combineResources([resources[i], resources[j], resources[k]]);
            recipes.push({
              id: this.generateRecipeId([resources[i], resources[j], resources[k]], output, 'merger'),
              tier,
              type: 'compound',
              input: [resources[i], resources[j], resources[k]],
              output,
              building: 'merger',
              discovered: false,
              timesUsed: 0n,
              rarity: this.calculateRarity(3, tier, [resources[i], resources[j], resources[k]], output)
            });
          }
        }
      }
    }

    // 4. Compound recipes - 4つ
    if (resources.length >= 4) {
      for (let i = 0; i < resources.length; i++) {
        for (let j = 0; j < resources.length; j++) {
          for (let k = 0; k < resources.length; k++) {
            for (let l = 0; l < resources.length; l++) {
              if (i === j || i === k || i === l || j === k || j === l || k === l) continue;

              const output = this.combineResources([resources[i], resources[j], resources[k], resources[l]]);
              recipes.push({
                id: this.generateRecipeId([resources[i], resources[j], resources[k], resources[l]], output, 'merger'),
                tier,
                type: 'compound',
                input: [resources[i], resources[j], resources[k], resources[l]],
                output,
                building: 'merger',
                discovered: false,
                timesUsed: 0n,
                rarity: this.calculateRarity(4, tier, [resources[i], resources[j], resources[k], resources[l]], output)
              });
            }
          }
        }
      }
    }

    return recipes;
  }

  private generateRecipeId(input: Resource[], output: Resource, building: string): string {
    const inputStr = input.map(r => r.id).join(',');
    return `recipe_${building}_${hashString(inputStr)}_${hashString(output.id)}`;
  }

  private combineResources(resources: Resource[]): Resource {
    // リソースを合成して新しいリソースを生成
    // 実装は簡略化（実際にはもっと複雑なロジック）
    if (resources.every(r => r.type === 'character')) {
      // 全て文字の場合: 文字列を結合
      const combined = resources.map(r => (r as CharacterResource).value).join('');
      return {
        id: `char_${combined}`,
        type: 'character',
        value: combined,
        display: combined
      } as CharacterResource;
    } else if (resources.every(r => r.type === 'icon')) {
      // 全てアイコンの場合: 複合アイコン
      const names = resources.map(r => (r as IconResource).iconName).join('_');
      return {
        id: `icon_${names}`,
        type: 'icon',
        iconName: names,
        display: null // 複合SVGコンポーネント
      } as IconResource;
    } else {
      // 混在: 特殊な合成
      return {
        id: `mixed_${hashArray(resources.map(r => r.id))}`,
        type: 'icon',
        display: null
      } as IconResource;
    }
  }

  private calculateRarity(inputCount: number, tier: number, input: Resource[], output: Resource): number {
    let rarity = 100;
    rarity *= Math.pow(2, inputCount - 1);
    rarity *= (1 + tier * 0.1);

    // 文字とアイコンの混在はレア
    const hasChar = input.some(r => r.type === 'character');
    const hasIcon = input.some(r => r.type === 'icon');
    if (hasChar && hasIcon) rarity *= 2.0;

    return Math.floor(rarity);
  }

  // 実際に生成されたときに呼ばれる
  onCraft(input: Resource[], output: Resource, building: Building) {
    const recipeId = this.generateRecipeId(input, output, building.type);

    let recipe = this.recipes.get(recipeId);

    if (!recipe) {
      // 初めて生成 → 新規レシピとして登録
      recipe = {
        id: recipeId,
        tier: this.getCurrentTier(),
        type: input.length === 0 ? 'generation' : 'compound',
        input,
        output,
        building: building.type,
        discovered: true,
        discoveredAt: new Date(),
        timesUsed: 1n,
        rarity: this.calculateRarity(input.length, this.getCurrentTier(), input, output)
      };
      this.recipes.set(recipeId, recipe);
      this.onDiscover(recipe);
    } else if (!recipe.discovered) {
      recipe.discovered = true;
      recipe.discoveredAt = new Date();
      this.onDiscover(recipe);
    }

    recipe.timesUsed++;
  }

  private onDiscover(recipe: Recipe) {
    // 発見通知
    console.log(`Recipe discovered: ${recipe.input.map(r => r.id).join(' + ')} → ${recipe.output.id}`);

    // ボーナス付与
    if (recipe.bonus) {
      this.applyBonus(recipe.bonus);
    }

    // イベント発火
    this.emit('recipeDiscovered', recipe);
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

  private getCurrentTier(): number {
    // TierSystemから取得（省略）
    return 1;
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

### 5. IconPoolSystem

アイコンライブラリからランダムにアイコンを管理

```typescript
// src/core/systems/IconPoolSystem.ts

export class IconPoolSystem {
  private available: IconData[] = [];
  private unlocked: IconData[] = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    // アイコンライブラリから全てのアイコンを取得
    const allIcons = getAllIcons(); // Lucide, Heroicons等

    // シャッフル
    this.available = shuffle(allIcons);

    // Tier 1用にアイコンを1つ解放
    const firstIcon = this.available.shift()!;
    this.unlocked.push(firstIcon);
  }

  unlockNext(): IconData {
    if (this.available.length === 0) {
      throw new Error('No more icons available');
    }

    const icon = this.available.shift()!;
    this.unlocked.push(icon);
    return icon;
  }

  getUnlocked(): IconData[] {
    return [...this.unlocked];
  }

  getAvailableCount(): number {
    return this.available.length;
  }
}

// src/lib/icons.ts

import * as LucideIcons from 'lucide-react';
import * as HeroIcons from '@heroicons/react/24/outline';

export type IconData = {
  name: string;
  component: React.ComponentType;
  library: 'lucide' | 'heroicons';
};

export function getAllIcons(): IconData[] {
  const icons: IconData[] = [];

  // Lucide icons
  for (const [name, component] of Object.entries(LucideIcons)) {
    if (typeof component === 'function') {
      icons.push({
        name,
        component: component as React.ComponentType,
        library: 'lucide'
      });
    }
  }

  // Heroicons
  for (const [name, component] of Object.entries(HeroIcons)) {
    if (typeof component === 'function') {
      icons.push({
        name,
        component: component as React.ComponentType,
        library: 'heroicons'
      });
    }
  }

  return icons;
}
```

---

### 6. base58ユーティリティ

```typescript
// src/core/utils/base58.ts

export const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'.split('');

export function getCharacterForTier(tier: number): string {
  if (tier < 1 || tier > BASE58_CHARS.length) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  return BASE58_CHARS[tier - 1];
}

export function isValidBase58Char(char: string): boolean {
  return BASE58_CHARS.includes(char);
}
```

---

### 7. 組み合わせ計算ユーティリティ

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

### 8. ハッシュ生成

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

### 9. 重み付きランダム抽選

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

/**
 * 配列をシャッフル
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

  // リソース（文字とアイコンを分離）
  characters: Record<string, string>;  // { "A": "1234", ... }
  icons: Record<string, string>;       // { "star": "89", ... }

  grid: {
    width: number;
    height: number;
    buildings: BuildingSaveData[];
  };

  skills: Record<string, number>;  // { 'skill_001': 5, ... }

  discoveredRecipes: string[];  // recipe IDs
  recipeStats: Record<string, string>;  // { 'recipe_001': '123', ... } (timesUsed)

  // アイコンプール
  iconPool: {
    unlockedIcons: string[];  // アイコン名のリスト
  };
};

type BuildingSaveData = {
  type: BuildingType;
  position: { x: number; y: number };
  direction: Direction;
  level: number;
  recipe?: {
    input: ResourceRef[];
    output: ResourceRef;
  };
};

type ResourceRef = {
  id: string;
  type: 'character' | 'icon';
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

## パフォーマンス最適化

### 1. フロー計算の最適化

```typescript
// セルごとにリソースキューを持つ
type Cell = {
  x: number;
  y: number;
  building: Building | null;
  resourceQueue: Resource[];  // 最大長を制限（例: 10個）
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
  MAX_RESOURCES_PER_CELL: 10,

  // Tier
  MAX_TIER: 58,  // base58文字数に制限
  INITIAL_TIER: 1,

  // コレクション
  MAX_RECIPE_INPUT: 4,

  // レア度閾値
  RARITY_THRESHOLDS: {
    COMMON: 100,
    UNCOMMON: 300,
    RARE: 700,
    EPIC: 1500,
  },
} as const;

export const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'.split('');

export const BUILDING_TYPES = [
  'generator',
  'conveyor',
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

## 型定義

```typescript
// src/stores/types.ts

export type ResourceType = 'character' | 'icon';

export type CharacterResource = {
  id: string;
  type: 'character';
  value: string;  // base58文字
  tier: number;
  amount: bigint;
};

export type IconResource = {
  id: string;
  type: 'icon';
  iconName: string;
  svg: React.ComponentType;
  tier: number;
  amount: bigint;
};

export type Resource = CharacterResource | IconResource;

export type Building = {
  id: string;
  type: BuildingType;
  position: { x: number; y: number };
  direction: Direction;
  level: number;
  recipe?: Recipe;
};

export type Recipe = {
  id: string;
  tier: number;
  type: 'generation' | 'compound';
  input: Resource[];  // generationの場合は空配列
  output: Resource;
  building: BuildingType;
  discovered: boolean;
  discoveredAt?: Date;
  timesUsed: bigint;
  rarity: number;
  bonus?: Effect;
};

export type Effect = {
  type: 'production' | 'efficiency' | 'unlock' | 'grid';
  value: number;
  target?: string;
};

export type Cell = {
  x: number;
  y: number;
  building: Building | null;
  resourceQueue: Resource[];
};

export type Grid = {
  width: number;
  height: number;
  cells: Cell[][];
  buildings: Building[];
};

export type BuildingType = typeof BUILDING_TYPES[number];
export type Direction = typeof DIRECTIONS[number];
```

---

## まとめ

この技術仕様書では以下を定義しました：

1. **アーキテクチャ**: ディレクトリ構造、システム分離
2. **コアエンジン**: GameEngine, FlowEngine の実装（リアルタイム実行）
3. **リソースシステム**: 2種類のリソース（文字とアイコン）の管理
4. **コレクションシステム**: レシピの自動発見（探索ボタンなし）
5. **アイコンプールシステム**: アイコンライブラリからランダム選択
6. **ユーティリティ**: base58、組み合わせ計算、ハッシュ、ランダム
7. **データ永続化**: IndexedDB、セーブデータ
8. **パフォーマンス**: 最適化手法
9. **定数と型**: ゲーム設定値、TypeScript型定義

次のステップは実装フェーズです。
