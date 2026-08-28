import * as React from 'react'
import classNames from 'classnames'
import { Repository } from '../../models/repository'
import { getBlame, IBlame, IBlameLine } from '../../lib/git'
import { formatRelative } from '../../lib/format-relative'
import { IMenuItem } from '../../lib/menu-item'
import { Dialog, DialogContent, DefaultDialogFooter } from '../dialog'
import { List } from '../lib/list'
import { Loading } from '../lib/loading'

const RowHeight = 20
const ZeroSha = /^0+$/

interface IBlameViewProps {
  readonly repository: Repository
  readonly path: string
  readonly commitish?: string
  readonly onDismissed: () => void
}

type BlameViewState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready'
      readonly lines: ReadonlyArray<IBlameLine>
      readonly blockIndex: ReadonlyArray<number>
      readonly selectedRow: number
    }
  | { readonly kind: 'binary' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'error'; readonly message: string }

/** Context menu label for opening blame. Same on Darwin and Windows. */
export function getBlameMenuItem(action: () => void): IMenuItem {
  return {
    label: __DARWIN__ ? 'Blame' : 'Blame',
    action,
  }
}

function shortSha(sha: string): string {
  if (ZeroSha.test(sha)) {
    return '0000000'
  }
  return sha.substring(0, 7)
}

function relativeAuthorDate(date: Date): string {
  if (isNaN(date.valueOf()) || date.getTime() === 0) {
    return ''
  }
  return formatRelative(date.getTime() - Date.now())
}

function computeBlockIndex(
  lines: ReadonlyArray<IBlameLine>
): ReadonlyArray<number> {
  const index = new Array<number>(lines.length)
  let block = 0
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && lines[i].sha !== lines[i - 1].sha) {
      block++
    }
    index[i] = block
  }
  return index
}

/** Dialog that shows git blame for a single file, virtualized by line. */
export class BlameView extends React.Component<
  IBlameViewProps,
  BlameViewState
> {
  private closed = false

  public constructor(props: IBlameViewProps) {
    super(props)
    this.state = { kind: 'loading' }
  }

  public componentDidMount() {
    this.loadBlame()
  }

  public componentWillUnmount() {
    this.closed = true
  }

  private async loadBlame() {
    let result: IBlame
    try {
      result = await getBlame(
        this.props.repository,
        this.props.path,
        this.props.commitish
      )
    } catch (e) {
      if (this.closed) {
        return
      }
      const message = e instanceof Error ? e.message : 'Unable to load blame.'
      this.setState({ kind: 'error', message })
      return
    }

    if (this.closed) {
      return
    }

    if (result.kind === 'success') {
      this.setState({
        kind: 'ready',
        lines: result.lines,
        blockIndex: computeBlockIndex(result.lines),
        selectedRow: -1,
      })
      return
    }

    this.setState({ kind: result.kind })
  }

  public render() {
    const loading = this.state.kind === 'loading'

    return (
      <Dialog
        id="blame"
        title={`Blame: ${this.props.path}`}
        onDismissed={this.props.onDismissed}
        onSubmit={this.props.onDismissed}
        loading={loading}
      >
        <DialogContent className="blame-content">
          {this.renderBody()}
        </DialogContent>
        <DefaultDialogFooter />
      </Dialog>
    )
  }

  private renderBody(): JSX.Element {
    const { kind } = this.state

    if (kind === 'loading') {
      return (
        <div className="blame-message">
          <Loading />
          <p>Loading blame…</p>
        </div>
      )
    }

    if (kind === 'binary') {
      return (
        <div className="blame-message">
          <p>This file is binary and cannot be blamed.</p>
        </div>
      )
    }

    if (kind === 'unavailable') {
      return (
        <div className="blame-message">
          <p>
            Blame is not available for this file. It may be new, empty, or have
            no history.
          </p>
        </div>
      )
    }

    if (kind === 'error') {
      return (
        <div className="blame-message">
          <p>{this.state.message}</p>
        </div>
      )
    }

    return (
      <div className="blame-list">
        <List
          rowCount={this.state.lines.length}
          rowHeight={RowHeight}
          rowRenderer={this.renderRow}
          selectedRows={
            this.state.selectedRow >= 0 ? [this.state.selectedRow] : []
          }
          onSelectedRowChanged={this.onSelectedRowChanged}
          invalidationProps={this.state.lines}
          getRowAriaLabel={this.getRowAriaLabel}
        />
      </div>
    )
  }

  private onSelectedRowChanged = (row: number) => {
    if (this.state.kind !== 'ready') {
      return
    }
    this.setState({ ...this.state, selectedRow: row })
  }

  private getRowAriaLabel = (row: number): string => {
    if (this.state.kind !== 'ready') {
      return ''
    }
    const line = this.state.lines[row]
    return `${shortSha(line.sha)} ${line.authorName} ${line.content}`
  }

  private renderRow = (row: number): JSX.Element | null => {
    if (this.state.kind !== 'ready') {
      return null
    }

    const { lines, blockIndex } = this.state
    const line = lines[row]
    const isGroupStart = row === 0 || lines[row - 1].sha !== line.sha
    const odd = blockIndex[row] % 2 === 1

    return (
      <div
        className={classNames('blame-row', {
          odd,
          'group-start': isGroupStart,
        })}
      >
        <div className="blame-gutter">
          {isGroupStart ? (
            <>
              <span className="sha" title={line.sha}>
                {shortSha(line.sha)}
              </span>
              <span className="author" title={line.authorEmail}>
                {line.authorName}
              </span>
              <span className="date">
                {relativeAuthorDate(line.authorDate)}
              </span>
            </>
          ) : null}
        </div>
        <div className="blame-code">{line.content}</div>
      </div>
    )
  }
}
