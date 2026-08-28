import { git } from './core'
import { Repository } from '../../models/repository'
import { coerceToString } from './coerce-to-string'

/** One annotated line from `git blame --line-porcelain`. */
export interface IBlameLine {
  readonly sha: string
  readonly originalLineNumber: number
  readonly lineNumber: number
  readonly authorName: string
  readonly authorEmail: string
  readonly authorDate: Date
  readonly content: string
}

export type IBlame =
  | { readonly kind: 'success'; readonly lines: ReadonlyArray<IBlameLine> }
  | { readonly kind: 'binary' }
  | { readonly kind: 'unavailable' }

interface ICachedCommit {
  readonly authorName: string
  readonly authorEmail: string
  readonly authorTime: number
}

interface IBlameHeader {
  readonly sha: string
  readonly originalLineNumber: number
  readonly lineNumber: number
}

const HeaderRe = /^([0-9a-f]{40,64}) (\d+) (\d+)(?: (\d+))?$/

function stripMailBrackets(value: string): string {
  if (value.startsWith('<') && value.endsWith('>') && value.length >= 2) {
    return value.slice(1, -1)
  }
  return value
}

function parseHeaderLine(line: string): IBlameHeader | null {
  const match = HeaderRe.exec(line)
  if (match === null) {
    return null
  }

  return {
    sha: match[1],
    originalLineNumber: parseInt(match[2], 10),
    lineNumber: parseInt(match[3], 10),
  }
}

/**
 * Parse `git blame --porcelain` / `--line-porcelain` output.
 *
 * Porcelain only emits author headers the first time a commit appears.
 * Later lines of the same SHA are just `sha orig final` plus the content.
 * Line-porcelain repeats the headers; caching is still required so a
 * porcelain-style payload does not produce author-less rows.
 */
export function parseBlamePorcelain(stdout: string): ReadonlyArray<IBlameLine> {
  const rawLines = stdout.split('\n')
  const cache = new Map<string, ICachedCommit>()
  const result = new Array<IBlameLine>()

  let i = 0
  while (i < rawLines.length) {
    const raw = rawLines[i]
    if (raw.length === 0) {
      i++
      continue
    }

    const header = parseHeaderLine(raw)
    if (header === null) {
      i++
      continue
    }
    i++

    let authorName: string | undefined
    let authorEmail: string | undefined
    let authorTime: number | undefined

    while (i < rawLines.length && !rawLines[i].startsWith('\t')) {
      const field = rawLines[i]
      i++

      if (field.startsWith('author ')) {
        authorName = field.substring(7)
      } else if (field.startsWith('author-mail ')) {
        authorEmail = stripMailBrackets(field.substring(12))
      } else if (field.startsWith('author-time ')) {
        authorTime = parseInt(field.substring(12), 10)
      }
    }

    const cached = cache.get(header.sha)
    if (
      authorName !== undefined ||
      authorEmail !== undefined ||
      authorTime !== undefined
    ) {
      cache.set(header.sha, {
        authorName: authorName ?? cached?.authorName ?? '',
        authorEmail: authorEmail ?? cached?.authorEmail ?? '',
        authorTime: authorTime ?? cached?.authorTime ?? 0,
      })
    } else if (cached === undefined) {
      cache.set(header.sha, {
        authorName: '',
        authorEmail: '',
        authorTime: 0,
      })
    }

    const commit = cache.get(header.sha)
    if (commit === undefined) {
      continue
    }

    const content =
      i < rawLines.length && rawLines[i].startsWith('\t')
        ? rawLines[i].substring(1)
        : ''
    if (i < rawLines.length && rawLines[i].startsWith('\t')) {
      i++
    }

    result.push({
      sha: header.sha,
      originalLineNumber: header.originalLineNumber,
      lineNumber: header.lineNumber,
      authorName: commit.authorName,
      authorEmail: commit.authorEmail,
      authorDate: new Date(commit.authorTime * 1000),
      content,
    })
  }

  return result
}

/**
 * Annotate `path` at `commitish` (HEAD / working tree when omitted).
 *
 * Binary files and paths with no history return a tagged result instead of
 * throwing, so the UI can show a message instead of an error dialog.
 */
export async function getBlame(
  repository: Repository,
  path: string,
  commitish?: string
): Promise<IBlame> {
  const args = ['blame', '--line-porcelain']

  if (commitish !== undefined && commitish.length > 0) {
    args.push(commitish)
  }

  args.push('--', path)

  const result = await git(args, repository.path, 'getBlame', {
    successExitCodes: new Set([0, 128]),
    encoding: 'buffer',
  })

  if (result.exitCode === 128) {
    const stderr = coerceToString(result.stderr).toLowerCase()
    if (stderr.includes('binary')) {
      return { kind: 'binary' }
    }
    return { kind: 'unavailable' }
  }

  if (result.stdout.indexOf(0) !== -1) {
    return { kind: 'binary' }
  }

  const lines = parseBlamePorcelain(coerceToString(result.stdout))
  if (lines.length === 0) {
    return { kind: 'unavailable' }
  }

  return { kind: 'success', lines }
}
