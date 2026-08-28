import * as React from 'react'
import { Dialog, DialogContent, DefaultDialogFooter } from '../dialog'
import { PathText } from '../lib/path-text'
import { Loading } from '../lib/loading'
import { Avatar } from '../lib/avatar'
import { CommitAttribution } from '../lib/commit-attribution'
import { RelativeTime } from '../relative-time'
import { RichText } from '../lib/rich-text'
import { Repository } from '../../models/repository'
import { Commit } from '../../models/commit'
import { Account } from '../../models/account'
import { getAvatarUsersForCommit } from '../../models/avatar'
import { getCommitsForFile } from '../../lib/git'
import { Emoji } from '../../lib/emoji'

interface IFileHistoryDialogProps {
  readonly repository: Repository
  readonly path: string
  readonly accounts: ReadonlyArray<Account>
  readonly emoji: Map<string, Emoji>
  readonly onDismissed: () => void
}

interface IFileHistoryDialogState {
  readonly isLoading: boolean
  readonly commits: ReadonlyArray<Commit>
}

/** Dialog listing the commits that touched a single file, following renames. */
export class FileHistoryDialog extends React.Component<
  IFileHistoryDialogProps,
  IFileHistoryDialogState
> {
  private loadId = 0

  public constructor(props: IFileHistoryDialogProps) {
    super(props)

    this.state = {
      isLoading: true,
      commits: [],
    }
  }

  public componentDidMount() {
    this.loadHistory()
  }

  public componentWillUnmount() {
    this.loadId++
  }

  private async loadHistory() {
    const loadId = ++this.loadId

    try {
      const commits = await getCommitsForFile(
        this.props.repository,
        this.props.path
      )

      if (loadId !== this.loadId) {
        return
      }

      this.setState({ commits, isLoading: false })
    } catch {
      if (loadId !== this.loadId) {
        return
      }

      this.setState({ commits: [], isLoading: false })
    }
  }

  public render() {
    return (
      <Dialog
        id="file-history"
        title={__DARWIN__ ? 'File History' : 'File history'}
        loading={this.state.isLoading}
        onSubmit={this.props.onDismissed}
        onDismissed={this.props.onDismissed}
      >
        <DialogContent>
          <div className="file-history-path">
            <PathText path={this.props.path} />
          </div>
          {this.renderContents()}
        </DialogContent>
        <DefaultDialogFooter />
      </Dialog>
    )
  }

  private renderContents() {
    if (this.state.isLoading) {
      return (
        <div className="file-history-status">
          <Loading />
        </div>
      )
    }

    if (this.state.commits.length === 0) {
      return (
        <div className="file-history-status">
          No commits found for this file.
        </div>
      )
    }

    return (
      <ul className="file-history-list">
        {this.state.commits.map(commit => this.renderCommit(commit))}
      </ul>
    )
  }

  private renderCommit(commit: Commit) {
    const avatarUsers = getAvatarUsersForCommit(
      this.props.repository.gitHubRepository,
      commit
    )
    const summary =
      commit.summary.length === 0 ? 'Empty commit message' : commit.summary

    return (
      <li key={commit.sha} className="file-history-commit">
        <Avatar
          user={avatarUsers[0]}
          accounts={this.props.accounts}
          size={16}
        />
        <div className="info">
          <RichText
            className={
              commit.summary.length === 0 ? 'summary empty-summary' : 'summary'
            }
            emoji={this.props.emoji}
            text={summary}
            renderUrlsAsLinks={false}
          />
          <div className="byline">
            <CommitAttribution avatarUsers={avatarUsers} />
            {` • `}
            <RelativeTime date={commit.author.date} />
            {` • `}
            <span className="sha">{commit.shortSha}</span>
          </div>
        </div>
      </li>
    )
  }
}
