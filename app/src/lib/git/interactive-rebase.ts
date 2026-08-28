import { rm, writeFile } from 'fs/promises'
import { getCommits, revRange } from '.'
import {
  InteractiveRebaseAction,
  IInteractiveRebaseTodoEntry,
  MultiCommitOperationKind,
} from '../../models/multi-commit-operation'
import { IMultiCommitOperationProgress } from '../../models/progress'
import { Repository } from '../../models/repository'
import { getTempFilePath } from '../file-system'
import { rebaseInteractive, RebaseResult } from './rebase'

/**
 * True when a squash/fixup at `index` has a preceding commit that is not dropped.
 * The first replayed commit has nothing to combine into.
 */
export function canSquashOrFixupAtIndex(
  actions: ReadonlyArray<InteractiveRebaseAction>,
  index: number
): boolean {
  if (index <= 0) {
    return false
  }

  for (let i = 0; i < index; i++) {
    if (actions[i] !== InteractiveRebaseAction.Drop) {
      return true
    }
  }

  return false
}

/**
 * UI-side checks so we never send git a todo that it would reject.
 */
export function getInteractiveRebasePlanError(
  actions: ReadonlyArray<InteractiveRebaseAction>,
  rewordSummaries: ReadonlyArray<string>
): string | null {
  if (actions.length === 0) {
    return 'Select at least one commit to rebase.'
  }

  if (actions.every(action => action === InteractiveRebaseAction.Drop)) {
    return 'Dropping every commit would leave an empty rebase.'
  }

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    if (
      (action === InteractiveRebaseAction.Squash ||
        action === InteractiveRebaseAction.Fixup) &&
      !canSquashOrFixupAtIndex(actions, i)
    ) {
      return 'Squash and fixup need a commit above them to combine into.'
    }

    if (action === InteractiveRebaseAction.Reword) {
      const summary = rewordSummaries[i]?.trim() ?? ''
      if (summary.length === 0) {
        return 'Reworded commits need a message.'
      }
    }
  }

  return null
}

/**
 * Run an interactive rebase from a user-built todo list.
 *
 * Reword is written as `pick` plus `exec git commit --amend -F <file>` instead
 * of git's `reword`. `reword` opens GIT_EDITOR, and a single editor (the `:`
 * no-op used everywhere else, or a cat of one file) cannot supply a different
 * message per commit — and would lose those messages after a conflict
 * continue. `exec` lives in the todo git copies into `.git/rebase-merge`, so
 * it still runs after the existing conflict flow continues the rebase.
 *
 * Message files are kept on disk when the rebase stops for conflicts so a
 * later `--continue` can still find them. They are removed when the rebase
 * finishes cleanly.
 */
export async function interactiveRebase(
  repository: Repository,
  lastRetainedCommitRef: string | null,
  entries: ReadonlyArray<IInteractiveRebaseTodoEntry>,
  progressCallback?: (progress: IMultiCommitOperationProgress) => void
): Promise<RebaseResult> {
  let todoPath: string | undefined
  const messagePaths: string[] = []
  let result: RebaseResult = RebaseResult.Error

  try {
    if (entries.length === 0) {
      throw new Error('[interactive-rebase] No commits provided.')
    }

    const commits = await getCommits(
      repository,
      lastRetainedCommitRef === null
        ? undefined
        : revRange(lastRetainedCommitRef, 'HEAD')
    )

    if (commits.length === 0) {
      throw new Error(
        '[interactive-rebase] Could not find commits in log for last retained commit ref.'
      )
    }

    const entryBySha = new Map(entries.map(entry => [entry.sha, entry]))
    const todoLines: string[] = []
    let seenOntoCommit = false

    // Newest-first log → oldest-first todo, same replay order as squash/reorder.
    for (let i = commits.length - 1; i >= 0; i--) {
      const commit = commits[i]
      const entry = entryBySha.get(commit.sha)
      const action = entry?.action ?? InteractiveRebaseAction.Pick

      if (action === InteractiveRebaseAction.Drop) {
        continue
      }

      if (
        (action === InteractiveRebaseAction.Squash ||
          action === InteractiveRebaseAction.Fixup) &&
        !seenOntoCommit
      ) {
        throw new Error(
          '[interactive-rebase] Squash and fixup cannot be the first replayed commit.'
        )
      }

      if (action === InteractiveRebaseAction.Reword) {
        const messagePath = await getTempFilePath('interactiveRebaseReword')
        const message =
          entry?.message !== undefined && entry.message.trim() !== ''
            ? entry.message
            : `${commit.summary}\n`
        await writeFile(messagePath, message)
        messagePaths.push(messagePath)
        const amendPath = messagePath.replace(/\\/g, '/')
        todoLines.push(`pick ${commit.sha} ${commit.summary}`)
        todoLines.push(`exec git commit --amend -F "${amendPath}"`)
      } else {
        todoLines.push(`${action} ${commit.sha} ${commit.summary}`)
      }

      seenOntoCommit = true
    }

    if (!seenOntoCommit) {
      throw new Error(
        '[interactive-rebase] Every commit was dropped; refusing to run an empty rebase.'
      )
    }

    todoPath = await getTempFilePath('interactiveRebaseTodo')
    await writeFile(todoPath, todoLines.map(line => `${line}\n`).join(''))

    result = await rebaseInteractive(
      repository,
      todoPath,
      lastRetainedCommitRef,
      {
        action: MultiCommitOperationKind.InteractiveRebase,
        progressCallback,
        commits,
      }
    )
  } catch (e) {
    log.error(e)
    result = RebaseResult.Error
  } finally {
    if (todoPath !== undefined) {
      await rm(todoPath, { recursive: true, force: true })
    }

    const rebaseFinished =
      result === RebaseResult.CompletedWithoutError ||
      result === RebaseResult.AlreadyUpToDate

    if (rebaseFinished) {
      await removeMessageFiles(messagePaths)
    }
  }

  return result
}

async function removeMessageFiles(paths: ReadonlyArray<string>): Promise<void> {
  for (const path of paths) {
    await rm(path, { recursive: true, force: true })
  }
}
