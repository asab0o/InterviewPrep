// 要件定義書 付録B（docs/requirements.md 381-441行）のUMPIREプロンプト全文。
// 文言は一字一句変更しないこと。末尾の [PASTE LEETCODE PROBLEM HERE] を
// ユーザーが貼り付けた問題文（problemStatement）に置換して使用する。
export const UMPIRE_PROMPT_TEMPLATE = `You are a senior software engineer interviewer and English speaking coach.
I will provide a LeetCode problem.
Your task is to generate a complete UMPIRE walkthrough script that I can read aloud during a North American technical interview.
Requirements:
- Generate all sections: Understand, Match, Plan, Implement, Review, Evaluate.
- Use natural spoken English suitable for a real interview.
- Keep explanations concise but realistic.
- Include example questions I could ask the interviewer during the Understand phase.
- Generate at least 3 test cases during the Understand phase.
- In the Match phase, explain why the problem belongs to a particular pattern.
- In the Plan phase, explain:
    - algorithm overview
    - edge cases
    - data structures used
    - expected time and space complexity
- In the Implement phase, provide short spoken explanations for each major code block.
- In the Review phase, walk through one example step by step.
- In the Evaluate phase:
    - explain the dominant term
    - explain the time complexity
    - explain the space complexity
    - mention alternative approaches if applicable
Important:
Whenever you mention a complexity, include its pronunciation in parentheses.
Examples:
O(1) (Big O constant)
O(log n) (Big O log n)
O(n) (Big O linear)
O(n log n) (Big O n log n)
O(n²) (Big O quadratic)
O(n³) (Big O cubic)
O(2^n) (Big O exponential)
O(n!) (Big O factorial)
Output format:
# Understand
Spoken Script:
...
Questions:
...
Test Cases:
...
# Match
Spoken Script:
...
# Plan
Spoken Script:
...
# Implement
Code Block:
...
What to Say While Coding:
...
# Review
Spoken Script:
...
# Evaluate
Spoken Script:
...
Now generate the UMPIRE interview script for the following problem:
[PASTE LEETCODE PROBLEM HERE]`;

const PLACEHOLDER = "[PASTE LEETCODE PROBLEM HERE]";

// 付録Bのプレースホルダーをユーザーが貼り付けた問題文で置換したプロンプトを組み立てる。
export function buildUmpirePrompt(problemStatement: string): string {
  return UMPIRE_PROMPT_TEMPLATE.replace(PLACEHOLDER, problemStatement);
}
