import { MultiCommitOperationConflictState } from '../lib/app-state'
import { Branch } from './branch'
import { Commit, CommitOneLine, ICommitContext } from './commit'
import { GitHubRepository } from './github-repository'
import { IDetachedHead, IUnbornRepository, IValidBranch } from './tip'

/**
 * Enum of types of multi commit operations
 *
 * Note: These are used to output the operation to the user
 * and as such should be capitalized.
 */
export const enum MultiCommitOperationKind {
  Rebase = 'Rebase',
  CherryPick = 'Cherry-pick',
  Squash = 'Squash',
  Merge = 'Merge',
  Reorder = 'Reorder',
  InteractiveRebase = 'Interactive Rebase',
}

/**
 * Actions that can be assigned to a commit in an interactive rebase todo list.
 * Values match the verbs git rebase -i understands. `edit` is intentionally
 * omitted: it pauses the rebase for a shell editor we never open.
 */
export const enum InteractiveRebaseAction {
  Pick = 'pick',
  Reword = 'reword',
  Squash = 'squash',
  Fixup = 'fixup',
  Drop = 'drop',
}

/** One line of an interactive rebase plan as chosen in the dialog. */
export interface IInteractiveRebaseTodoEntry {
  readonly sha: string
  readonly action: InteractiveRebaseAction
  /**
   * Full commit message used when `action` is `reword`. Ignored otherwise.
   */
  readonly message?: string
}

/** Type guard which narrows a string to a MultiCommitOperationKind */
export function isIdMultiCommitOperation(
  id: string
): id is
  | MultiCommitOperationKind.Rebase
  | MultiCommitOperationKind.CherryPick
  | MultiCommitOperationKind.Squash
  | MultiCommitOperationKind.Merge
  | MultiCommitOperationKind.Reorder
  | MultiCommitOperationKind.InteractiveRebase {
  return (
    id === MultiCommitOperationKind.Rebase ||
    id === MultiCommitOperationKind.CherryPick ||
    id === MultiCommitOperationKind.Squash ||
    id === MultiCommitOperationKind.Merge ||
    id === MultiCommitOperationKind.Reorder ||
    id === MultiCommitOperationKind.InteractiveRebase
  )
}

/**
 * Union type representing the possible states of an multi commit operation
 * such as rebase, interactive rebase, cherry-pick.
 */
export type MultiCommitOperationStep =
  | ChooseBranchStep
  | WarnForcePushStep
  | ShowProgressStep
  | ShowConflictsStep
  | HideConflictsStep
  | ConfirmAbortStep
  | CreateBranchStep
  | ChooseInteractiveRebasePlanStep
  | ShowCopilotConflictsLoadingStep
  | ShowCopilotConflictsStep

/**
 * Possible kinds of steps that may happen during a multi commit operation such
 * as rebase, interactive rebase, cherry-pick.
 */
export const enum MultiCommitOperationStepKind {
  /**
   * The step that the user picks which other branch is involved in the
   * operation asides from the currently checked out branch.
   *
   * Examples:
   *  Rebase - what branch to rebase commits from
   *  Cherry-pick - what branch to copy commits to.
   */
  ChooseBranch = 'ChooseBranch',

  /**
   * Step to show dialog warning user if operation will result in needing to
   * force push.
   */
  WarnForcePush = 'WarnForcePush',

  /**
   * Step to show a dialog that shows the operation is progressing.
   */
  ShowProgress = 'ShowProgress',

  /**
   * The operation has encountered conflicts that need resolved. This will be
   * shown as a list of files and the conflict state.
   *
   * Once the conflicts are resolved, the user can continue the operation.
   */
  ShowConflicts = 'ShowConflicts',

  /**
   * The user may wish to leave the conflict dialog and view the files in
   * the Changes tab to get a better context. In this situation, the application
   * will show a banner to indicate this context and help the user return to the
   * conflicted list.
   */
  HideConflicts = 'HideConflicts',

  /**
   * If the user attempts to abort the in-progress operation and the user has
   * resolved conflicts, the application should ask the user to confirm that
   * they wish to abort.
   */
  ConfirmAbort = 'ConfirmAbort',

  /**
   * If the user invokes creating a new branch during the operation, display
   * a new branch dialog to them.
   *
   * Example: Cherry-picking to a new branch.
   */
  CreateBranch = 'CreateBranch',

  /**
   * The user is choosing pick/reword/squash/fixup/drop for each commit
   * before an interactive rebase starts.
   */
  ChooseInteractiveRebasePlan = 'ChooseInteractiveRebasePlan',

  /**
   * Copilot is resolving conflicts. A loading interstitial is shown while
   * the LLM generates resolutions.
   */
  ShowCopilotConflictsLoading = 'ShowCopilotConflictsLoading',

  /**
   * Copilot has generated resolutions. The user can review applied resolutions,
   * open files in their editor, and continue the operation.
   */
  ShowCopilotConflicts = 'ShowCopilotConflicts',
}

export type ChooseBranchStep = {
  readonly kind: MultiCommitOperationStepKind.ChooseBranch
  readonly defaultBranch: Branch | null
  readonly currentBranch: Branch
  readonly allBranches: ReadonlyArray<Branch>
  readonly recentBranches: ReadonlyArray<Branch>
  readonly initialBranch?: Branch
}

export type WarnForcePushStep = {
  readonly kind: MultiCommitOperationStepKind.WarnForcePush
  readonly baseBranch: Branch
  readonly targetBranch: Branch
  readonly commits: ReadonlyArray<CommitOneLine>
}

export type ShowProgressStep = {
  readonly kind: MultiCommitOperationStepKind.ShowProgress
}

export type ShowConflictsStep = {
  readonly kind: MultiCommitOperationStepKind.ShowConflicts
  readonly conflictState: MultiCommitOperationConflictState
}

export type HideConflictsStep = {
  readonly kind: MultiCommitOperationStepKind.HideConflicts
  readonly conflictState: MultiCommitOperationConflictState
}

export type ConfirmAbortStep = {
  readonly kind: MultiCommitOperationStepKind.ConfirmAbort
  readonly conflictState: MultiCommitOperationConflictState
  /**
   * The step the user was on when they invoked the abort confirmation.
   * Used to route them back to the right place if they choose to
   * return rather than abort. Defaults to ShowConflicts if omitted
   * (the historical behavior).
   */
  readonly returnToStepKind?:
    | MultiCommitOperationStepKind.ShowConflicts
    | MultiCommitOperationStepKind.ShowCopilotConflicts
    | MultiCommitOperationStepKind.ShowCopilotConflictsLoading
}

export type CreateBranchStep = {
  readonly kind: MultiCommitOperationStepKind.CreateBranch
  allBranches: ReadonlyArray<Branch>
  defaultBranch: Branch | null
  upstreamDefaultBranch: Branch | null
  upstreamGhRepo: GitHubRepository | null
  tip: IUnbornRepository | IDetachedHead | IValidBranch
  targetBranchName: string
}

export type ChooseInteractiveRebasePlanStep = {
  readonly kind: MultiCommitOperationStepKind.ChooseInteractiveRebasePlan
}

export type ShowCopilotConflictsLoadingStep = {
  readonly kind: MultiCommitOperationStepKind.ShowCopilotConflictsLoading
  readonly conflictState: MultiCommitOperationConflictState
}

export type ShowCopilotConflictsStep = {
  readonly kind: MultiCommitOperationStepKind.ShowCopilotConflicts
  readonly conflictState: MultiCommitOperationConflictState
}

interface IBaseInteractiveRebaseDetails {
  /**
   * Array of commits used during the operation.
   */
  readonly commits: ReadonlyArray<Commit>

  /**
   * This is the commit sha of the HEAD of the in-flight operation used to compare
   * the state of the after an operation to a previous state.
   */
  readonly currentTip: string
}

interface IInteractiveRebaseDetails extends IBaseInteractiveRebaseDetails {
  /**
   * The reference to the last retained commit on the branch during an
   * interactive rebase or null if rebasing to the root.
   */
  readonly lastRetainedCommitRef: string | null
}

interface ISourceBranchDetails {
  /**
   * The branch that are the source of the commits for the operation.
   *
   * Cherry-pick = the branch the user started on.
   * Rebase, Merge = the branch the user picks in the choose branch dialog (thus will be null to start)
   */
  readonly sourceBranch: Branch | null
}

interface ISquashDetails extends IInteractiveRebaseDetails {
  readonly kind: MultiCommitOperationKind.Squash

  /**
   * A commit that the interactive rebase takes place around.
   *
   * Example: Squashing all the 'commits' array onto the 'targetCommit'.
   */
  readonly targetCommit: Commit

  /**
   * The commit context of the commit squashed.
   */
  readonly commitContext: ICommitContext
}

interface IReorderDetails extends IInteractiveRebaseDetails {
  readonly kind: MultiCommitOperationKind.Reorder

  /** The commit before which the commits to reorder will be placed. */
  readonly beforeCommit: Commit | null
}

interface IInteractiveRebaseOperationDetails extends IInteractiveRebaseDetails {
  readonly kind: MultiCommitOperationKind.InteractiveRebase

  /**
   * Todo-list entries in oldest-first order, matching `git rebase -i`.
   * Empty until the user confirms the plan in the dialog.
   */
  readonly entries: ReadonlyArray<IInteractiveRebaseTodoEntry>
}

interface ICherryPickDetails extends ISourceBranchDetails {
  readonly kind: MultiCommitOperationKind.CherryPick
  /**
   * Whether a branch was created during operation.
   *
   * Example: can create a new branch to copy commits to during cherry-pick
   */
  readonly branchCreated: boolean

  /**
   * Array of commits used during the operation.
   */
  readonly commits: ReadonlyArray<CommitOneLine>
}

interface IRebaseDetails extends ISourceBranchDetails {
  readonly kind: MultiCommitOperationKind.Rebase
  readonly commits: ReadonlyArray<CommitOneLine>
  /**
   * This is the commit sha of the HEAD of the in-flight operation used to compare
   * the state of the after an operation to a previous state.
   */
  readonly currentTip: string
}

interface IMergeDetails extends ISourceBranchDetails {
  readonly kind: MultiCommitOperationKind.Merge
  readonly isSquash: boolean
}

export type MultiCommitOperationDetail =
  | ISquashDetails
  | IReorderDetails
  | IInteractiveRebaseOperationDetails
  | ICherryPickDetails
  | IRebaseDetails
  | IMergeDetails

export function instanceOfIBaseRebaseDetails(
  object: any
): object is IBaseInteractiveRebaseDetails {
  const objectWithRequiredFields: IBaseInteractiveRebaseDetails = {
    commits: [],
    currentTip: '',
  }

  return Object.keys(objectWithRequiredFields).every(key => key in object)
}

export const conflictSteps = [
  MultiCommitOperationStepKind.ShowConflicts,
  MultiCommitOperationStepKind.ConfirmAbort,
  MultiCommitOperationStepKind.ShowCopilotConflictsLoading,
  MultiCommitOperationStepKind.ShowCopilotConflicts,
]
