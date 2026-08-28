import * as React from 'react'
import { Dialog, DialogContent, DialogFooter } from '../../dialog'
import { OkCancelButtonGroup } from '../../dialog/ok-cancel-button-group'
import { Select } from '../../lib/select'
import { TextBox } from '../../lib/text-box'
import { TextArea } from '../../lib/text-area'
import { Ref } from '../../lib/ref'
import { Commit, shortenSHA } from '../../../models/commit'
import {
  InteractiveRebaseAction,
  IInteractiveRebaseTodoEntry,
} from '../../../models/multi-commit-operation'
import {
  canSquashOrFixupAtIndex,
  getInteractiveRebasePlanError,
} from '../../../lib/git/interactive-rebase'

interface IRowPlan {
  readonly action: InteractiveRebaseAction
  readonly summary: string
  readonly body: string
}

interface IInteractiveRebaseDialogProps {
  readonly commits: ReadonlyArray<Commit>
  readonly onDismissed: () => void
  readonly onStart: (
    entries: ReadonlyArray<IInteractiveRebaseTodoEntry>
  ) => void
}

interface IInteractiveRebaseDialogState {
  readonly rows: ReadonlyArray<IRowPlan>
}

function defaultRows(commits: ReadonlyArray<Commit>): ReadonlyArray<IRowPlan> {
  return commits.map(commit => ({
    action: InteractiveRebaseAction.Pick,
    summary: commit.summary,
    body: commit.body,
  }))
}

function isInteractiveRebaseAction(
  value: string
): value is InteractiveRebaseAction {
  return (
    value === InteractiveRebaseAction.Pick ||
    value === InteractiveRebaseAction.Reword ||
    value === InteractiveRebaseAction.Squash ||
    value === InteractiveRebaseAction.Fixup ||
    value === InteractiveRebaseAction.Drop
  )
}

function formatRewordMessage(summary: string, body: string): string {
  return `${summary}\n\n${body || ''}\n`.replace(/\s+$/, '\n')
}

export class InteractiveRebaseDialog extends React.Component<
  IInteractiveRebaseDialogProps,
  IInteractiveRebaseDialogState
> {
  public constructor(props: IInteractiveRebaseDialogProps) {
    super(props)
    this.state = { rows: defaultRows(props.commits) }
  }

  public render() {
    const { commits } = this.props
    const actions = this.state.rows.map(row => row.action)
    const summaries = this.state.rows.map(row => row.summary)
    const planError = getInteractiveRebasePlanError(actions, summaries)
    const count = commits.length
    const title = __DARWIN__ ? 'Interactive Rebase' : 'Interactive rebase'
    const startLabel = __DARWIN__ ? 'Start Rebase' : 'Start rebase'

    return (
      <Dialog
        id="interactive-rebase"
        title={title}
        onDismissed={this.props.onDismissed}
        onSubmit={this.onSubmit}
      >
        <DialogContent>
          <p className="interactive-rebase-hint">
            Commits apply from top to bottom, oldest first. The first commit
            cannot be squashed or fixed up.
          </p>
          <div className="interactive-rebase-list">
            {commits.map((commit, index) =>
              this.renderRow(commit, index, actions)
            )}
          </div>
          {planError !== null && (
            <p className="interactive-rebase-error" role="alert">
              {planError}
            </p>
          )}
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText={`${startLabel} (${count})`}
            okButtonDisabled={planError !== null}
            onCancelButtonClick={this.props.onDismissed}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private renderRow(
    commit: Commit,
    index: number,
    actions: ReadonlyArray<InteractiveRebaseAction>
  ): JSX.Element {
    const row = this.state.rows[index]
    const squashOrFixupEnabled = canSquashOrFixupAtIndex(actions, index)

    return (
      <div className="interactive-rebase-row" key={commit.sha}>
        <div className="commit-info">
          <div className="summary" title={commit.summary}>
            <Ref>{shortenSHA(commit.sha)}</Ref> {commit.summary}
          </div>
          {row.action === InteractiveRebaseAction.Reword && (
            <div className="interactive-rebase-reword">
              <TextBox
                label="Summary"
                value={row.summary}
                onValueChanged={value =>
                  this.onRewordSummaryChanged(index, value)
                }
              />
              <TextArea
                label="Description"
                rows={3}
                value={row.body}
                onValueChanged={value => this.onRewordBodyChanged(index, value)}
              />
            </div>
          )}
        </div>
        <Select
          className="action-select"
          value={row.action}
          onChange={event => this.onActionChanged(index, event)}
        >
          <option value={InteractiveRebaseAction.Pick}>Pick</option>
          <option value={InteractiveRebaseAction.Reword}>Reword</option>
          <option
            value={InteractiveRebaseAction.Squash}
            disabled={!squashOrFixupEnabled}
          >
            Squash
          </option>
          <option
            value={InteractiveRebaseAction.Fixup}
            disabled={!squashOrFixupEnabled}
          >
            Fixup
          </option>
          <option value={InteractiveRebaseAction.Drop}>Drop</option>
        </Select>
      </div>
    )
  }

  private onActionChanged = (
    index: number,
    event: React.FormEvent<HTMLSelectElement>
  ) => {
    const value = event.currentTarget.value
    if (!isInteractiveRebaseAction(value)) {
      return
    }

    const rows = this.state.rows.map((row, i) =>
      i === index ? { ...row, action: value } : row
    )
    this.setState({ rows: this.coerceSquashFixupAfterDrops(rows) })
  }

  /**
   * If an earlier commit is dropped, a later squash/fixup may lose its onto
   * commit. Reset those back to pick so the plan stays valid.
   */
  private coerceSquashFixupAfterDrops(
    rows: ReadonlyArray<IRowPlan>
  ): ReadonlyArray<IRowPlan> {
    const actions = rows.map(row => row.action)
    return rows.map((row, index) => {
      if (
        (row.action === InteractiveRebaseAction.Squash ||
          row.action === InteractiveRebaseAction.Fixup) &&
        !canSquashOrFixupAtIndex(actions, index)
      ) {
        return { ...row, action: InteractiveRebaseAction.Pick }
      }
      return row
    })
  }

  private onRewordSummaryChanged = (index: number, summary: string) => {
    const rows = this.state.rows.map((row, i) =>
      i === index ? { ...row, summary } : row
    )
    this.setState({ rows })
  }

  private onRewordBodyChanged = (index: number, body: string) => {
    const rows = this.state.rows.map((row, i) =>
      i === index ? { ...row, body } : row
    )
    this.setState({ rows })
  }

  private onSubmit = () => {
    const actions = this.state.rows.map(row => row.action)
    const summaries = this.state.rows.map(row => row.summary)
    if (getInteractiveRebasePlanError(actions, summaries) !== null) {
      return
    }

    const entries: ReadonlyArray<IInteractiveRebaseTodoEntry> =
      this.props.commits.map((commit, index) => {
        const row = this.state.rows[index]
        const message =
          row.action === InteractiveRebaseAction.Reword
            ? formatRewordMessage(row.summary, row.body)
            : undefined
        return { sha: commit.sha, action: row.action, message }
      })

    this.props.onStart(entries)
  }
}
