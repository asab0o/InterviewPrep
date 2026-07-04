# シードスクリプト（付録A / 7カテゴリー59問 + カテゴリーマスタ）

`src/db/seed.ts` として実装。`pnpm run db:seed`（tsx実行）で投入。冪等化のため
`onConflictDoNothing`（Category.slug / Problem.number のUNIQUE）で二重投入を防ぐ。

- Category.slug は 5.4 のGitHubフォルダ名に一致させる（`array-hashmap` 等）。
- Category.sortOrder は 5.2 の列挙順（Arrays and Hashing→…→Trees）。
- Problem 件数：9 + 5 + 6 + 6 + 7 + 11 + 15 = **59問**（付録Aと一致）。

```ts
// src/db/seed.ts
import { db } from './client';                 // drizzle(better-sqlite3) インスタンス
import { categories, problems } from './schema';

// ---- Category マスタ（初期7件。slug は 5.4 のフォルダ名に一致） ----
const CATEGORY_SEED = [
  { name: 'Arrays and Hashing', slug: 'array-hashmap',  sortOrder: 1 },
  { name: 'Two Pointers',       slug: 'two-pointers',   sortOrder: 2 },
  { name: 'Sliding Window',     slug: 'sliding-window', sortOrder: 3 },
  { name: 'Stack',              slug: 'stack',          sortOrder: 4 },
  { name: 'Binary Search',      slug: 'binary-search',  sortOrder: 5 },
  { name: 'Linked List',        slug: 'linked-list',    sortOrder: 6 },
  { name: 'Trees',              slug: 'trees',          sortOrder: 7 },
] as const;

// ---- Problem マスタ（付録A / 59問）。categorySlug でCategoryに紐付け ----
type ProblemSeed = { categorySlug: string; number: number; title: string; slug: string };

const PROBLEM_SEED: ProblemSeed[] = [
  // Arrays and Hashing（9問）
  { categorySlug: 'array-hashmap', number: 217, title: 'Contains Duplicate',              slug: 'contains-duplicate' },
  { categorySlug: 'array-hashmap', number: 242, title: 'Valid Anagram',                   slug: 'valid-anagram' },
  { categorySlug: 'array-hashmap', number: 1,   title: 'Two Sum',                         slug: 'two-sum' },
  { categorySlug: 'array-hashmap', number: 49,  title: 'Group Anagrams',                  slug: 'group-anagrams' },
  { categorySlug: 'array-hashmap', number: 347, title: 'Top K Frequent Elements',         slug: 'top-k-frequent-elements' },
  { categorySlug: 'array-hashmap', number: 271, title: 'Encode and Decode Strings',       slug: 'encode-and-decode-strings' },
  { categorySlug: 'array-hashmap', number: 238, title: 'Product of Array Except Self',    slug: 'product-of-array-except-self' },
  { categorySlug: 'array-hashmap', number: 36,  title: 'Valid Sudoku',                    slug: 'valid-sudoku' },
  { categorySlug: 'array-hashmap', number: 128, title: 'Longest Consecutive Sequence',    slug: 'longest-consecutive-sequence' },

  // Two Pointers（5問）
  { categorySlug: 'two-pointers', number: 125, title: 'Valid Palindrome',                        slug: 'valid-palindrome' },
  { categorySlug: 'two-pointers', number: 167, title: 'Two Sum II - Input Array Is Sorted',      slug: 'two-sum-ii-input-array-is-sorted' },
  { categorySlug: 'two-pointers', number: 15,  title: '3Sum',                                    slug: '3sum' },
  { categorySlug: 'two-pointers', number: 11,  title: 'Container With Most Water',               slug: 'container-with-most-water' },
  { categorySlug: 'two-pointers', number: 42,  title: 'Trapping Rain Water',                     slug: 'trapping-rain-water' },

  // Sliding Window（6問）
  { categorySlug: 'sliding-window', number: 121, title: 'Best Time to Buy and Sell Stock',                  slug: 'best-time-to-buy-and-sell-stock' },
  { categorySlug: 'sliding-window', number: 3,   title: 'Longest Substring Without Repeating Characters',   slug: 'longest-substring-without-repeating-characters' },
  { categorySlug: 'sliding-window', number: 424, title: 'Longest Repeating Character Replacement',          slug: 'longest-repeating-character-replacement' },
  { categorySlug: 'sliding-window', number: 567, title: 'Permutation in String',                            slug: 'permutation-in-string' },
  { categorySlug: 'sliding-window', number: 76,  title: 'Minimum Window Substring',                         slug: 'minimum-window-substring' },
  { categorySlug: 'sliding-window', number: 239, title: 'Sliding Window Maximum',                           slug: 'sliding-window-maximum' },

  // Stack（6問）
  { categorySlug: 'stack', number: 20,  title: 'Valid Parentheses',                  slug: 'valid-parentheses' },
  { categorySlug: 'stack', number: 155, title: 'Min Stack',                          slug: 'min-stack' },
  { categorySlug: 'stack', number: 150, title: 'Evaluate Reverse Polish Notation',   slug: 'evaluate-reverse-polish-notation' },
  { categorySlug: 'stack', number: 739, title: 'Daily Temperatures',                 slug: 'daily-temperatures' },
  { categorySlug: 'stack', number: 853, title: 'Car Fleet',                          slug: 'car-fleet' },
  { categorySlug: 'stack', number: 84,  title: 'Largest Rectangle in Histogram',     slug: 'largest-rectangle-in-histogram' },

  // Binary Search（7問）
  { categorySlug: 'binary-search', number: 704, title: 'Binary Search',                            slug: 'binary-search' },
  { categorySlug: 'binary-search', number: 74,  title: 'Search a 2D Matrix',                       slug: 'search-a-2d-matrix' },
  { categorySlug: 'binary-search', number: 875, title: 'Koko Eating Bananas',                      slug: 'koko-eating-bananas' },
  { categorySlug: 'binary-search', number: 33,  title: 'Search in Rotated Sorted Array',           slug: 'search-in-rotated-sorted-array' },
  { categorySlug: 'binary-search', number: 153, title: 'Find Minimum in Rotated Sorted Array',     slug: 'find-minimum-in-rotated-sorted-array' },
  { categorySlug: 'binary-search', number: 981, title: 'Time Based Key-Value Store',               slug: 'time-based-key-value-store' },
  { categorySlug: 'binary-search', number: 4,   title: 'Median of Two Sorted Arrays',              slug: 'median-of-two-sorted-arrays' },

  // Linked List（11問）
  { categorySlug: 'linked-list', number: 206, title: 'Reverse Linked List',              slug: 'reverse-linked-list' },
  { categorySlug: 'linked-list', number: 21,  title: 'Merge Two Sorted Lists',           slug: 'merge-two-sorted-lists' },
  { categorySlug: 'linked-list', number: 143, title: 'Reorder List',                     slug: 'reorder-list' },
  { categorySlug: 'linked-list', number: 19,  title: 'Remove Nth Node From End of List', slug: 'remove-nth-node-from-end-of-list' },
  { categorySlug: 'linked-list', number: 138, title: 'Copy List with Random Pointer',    slug: 'copy-list-with-random-pointer' },
  { categorySlug: 'linked-list', number: 2,   title: 'Add Two Numbers',                  slug: 'add-two-numbers' },
  { categorySlug: 'linked-list', number: 141, title: 'Linked List Cycle',                slug: 'linked-list-cycle' },
  { categorySlug: 'linked-list', number: 287, title: 'Find the Duplicate Number',        slug: 'find-the-duplicate-number' },
  { categorySlug: 'linked-list', number: 146, title: 'LRU Cache',                        slug: 'lru-cache' },
  { categorySlug: 'linked-list', number: 23,  title: 'Merge k Sorted Lists',             slug: 'merge-k-sorted-lists' },
  { categorySlug: 'linked-list', number: 25,  title: 'Reverse Nodes in k-Group',         slug: 'reverse-nodes-in-k-group' },

  // Trees（15問）
  { categorySlug: 'trees', number: 226,  title: 'Invert Binary Tree',                                        slug: 'invert-binary-tree' },
  { categorySlug: 'trees', number: 104,  title: 'Maximum Depth of Binary Tree',                              slug: 'maximum-depth-of-binary-tree' },
  { categorySlug: 'trees', number: 543,  title: 'Diameter of Binary Tree',                                   slug: 'diameter-of-binary-tree' },
  { categorySlug: 'trees', number: 110,  title: 'Balanced Binary Tree',                                      slug: 'balanced-binary-tree' },
  { categorySlug: 'trees', number: 100,  title: 'Same Tree',                                                 slug: 'same-tree' },
  { categorySlug: 'trees', number: 572,  title: 'Subtree of Another Tree',                                   slug: 'subtree-of-another-tree' },
  { categorySlug: 'trees', number: 235,  title: 'Lowest Common Ancestor of a Binary Search Tree',            slug: 'lowest-common-ancestor-of-a-binary-search-tree' },
  { categorySlug: 'trees', number: 102,  title: 'Binary Tree Level Order Traversal',                         slug: 'binary-tree-level-order-traversal' },
  { categorySlug: 'trees', number: 199,  title: 'Binary Tree Right Side View',                               slug: 'binary-tree-right-side-view' },
  { categorySlug: 'trees', number: 1448, title: 'Count Good Nodes in Binary Tree',                           slug: 'count-good-nodes-in-binary-tree' },
  { categorySlug: 'trees', number: 98,   title: 'Validate Binary Search Tree',                               slug: 'validate-binary-search-tree' },
  { categorySlug: 'trees', number: 230,  title: 'Kth Smallest Element in a BST',                             slug: 'kth-smallest-element-in-a-bst' },
  { categorySlug: 'trees', number: 105,  title: 'Construct Binary Tree from Preorder and Inorder Traversal', slug: 'construct-binary-tree-from-preorder-and-inorder-traversal' },
  { categorySlug: 'trees', number: 124,  title: 'Binary Tree Maximum Path Sum',                              slug: 'binary-tree-maximum-path-sum' },
  { categorySlug: 'trees', number: 297,  title: 'Serialize and Deserialize Binary Tree',                     slug: 'serialize-and-deserialize-binary-tree' },
];

async function seed() {
  // 1) Category を投入（slug UNIQUE で冪等）
  await db.insert(categories).values([...CATEGORY_SEED]).onConflictDoNothing();

  // 2) slug -> categoryId のマップを作成
  const rows = await db.select().from(categories);
  const idBySlug = new Map(rows.map((c) => [c.slug, c.id]));

  // 3) Problem を投入（number UNIQUE で冪等）
  const problemValues = PROBLEM_SEED.map((p) => {
    const categoryId = idBySlug.get(p.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${p.categorySlug}`);
    return { categoryId, number: p.number, title: p.title, slug: p.slug };
  });

  await db.insert(problems).values(problemValues).onConflictDoNothing();

  console.log(`Seeded ${CATEGORY_SEED.length} categories, ${PROBLEM_SEED.length} problems.`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
```

## 件数チェック（付録Aとの一致）
| カテゴリー | slug | 件数 |
|---|---|---|
| Arrays and Hashing | array-hashmap | 9 |
| Two Pointers | two-pointers | 5 |
| Sliding Window | sliding-window | 6 |
| Stack | stack | 6 |
| Binary Search | binary-search | 7 |
| Linked List | linked-list | 11 |
| Trees | trees | 15 |
| **合計** | | **59** |

> 注（付録Aの但し書き）：分類・並び順はNeetCode公式ロードマップ準拠。実装前に neetcode.io の最新表示と突き合わせ推奨。
