import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const MODEL = process.env.OGMA_COMMIT_MODEL || 'qwen3:14b';
const MAX_DIFF_CHARS = 12_000;
const MAX_MESSAGE_CHARS = 500; // limit of POST /api/git/commit
// Generous: on CPU-only inference (GPU not detected) qwen3:14b needs ~2 min.
const TIMEOUT_MS = 180_000;

const SYSTEM_PROMPT =
  'Write a git commit message for the changes below. Follow the language and style of the recent commit subjects. ' +
  'First line ≤ 72 characters, imperative, no trailing period. Optionally a blank line and up to 3 short body lines. ' +
  'Output only the message, no quotes, no code fences.';

/** Thrown when Ollama cannot be reached or does not answer in time. */
export class OllamaUnavailableError extends Error {}

async function git(cmd: string, cwd: string): Promise<string> {
  const { stdout } = await execAsync(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

async function collectContext(repoPath: string): Promise<string> {
  const status = await git('git status --porcelain', repoPath);
  const untracked = await git('git ls-files --others --exclude-standard', repoPath);
  const hasHead = await git('git rev-parse --verify HEAD', repoPath).then(
    () => true,
    () => false
  );

  const parts = [`## git status --porcelain\n${status}`];
  if (untracked) parts.push(`## Untracked files\n${untracked}`);
  if (hasHead) {
    const recent = await git('git log -5 --pretty=format:%s', repoPath);
    const stat = await git('git diff HEAD --stat', repoPath);
    let diff = await git('git diff HEAD', repoPath);
    if (diff.length > MAX_DIFF_CHARS) diff = diff.slice(0, MAX_DIFF_CHARS) + '\n[gekürzt]';
    parts.unshift(`## Recent commit subjects\n${recent}`);
    parts.push(`## git diff HEAD --stat\n${stat}`, `## git diff HEAD\n${diff}`);
  }
  return parts.join('\n\n');
}

function cleanMessage(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/^\s*```[a-z]*\n?|\n?```\s*$/g, '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
    .slice(0, MAX_MESSAGE_CHARS)
    .trim();
}

export async function suggestCommitMessage(repoPath: string): Promise<string> {
  const context = await collectContext(repoPath);

  let response: Response;
  try {
    response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        think: false,
        options: { temperature: 0.2, num_predict: 120 },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: context },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new OllamaUnavailableError(String(error));
  }
  if (!response.ok) {
    throw new Error(`Ollama responded ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const message = cleanMessage(data.message?.content ?? '');
  if (!message) throw new Error('Ollama returned an empty message');
  return message;
}
