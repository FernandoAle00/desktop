import * as React from 'react'
import classNames from 'classnames'
import { IStashListEntry } from '../../lib/git/stash'
import { StashedChangesLoadStates } from '../../models/stash-entry'
import { RelativeTime } from '../relative-time'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { plural } from '../lib/plural'

interface IStashListProps {
  readonly stashEntries: ReadonlyArray<IStashListEntry>
  readonly selectedStashSha: string | null
  readonly canCreateStash: boolean
  readonly onStashSelected: (stash: IStashListEntry) => void
  readonly onCreateStash: () => void
}

const StashIcon = {
  w: 16,
  h: 16,
  p: [
    'M10.5 1.286h-9a.214.214 0 0 0-.214.214v9a.214.214 0 0 0 .214.214h9a.214.214 0 0 0 ' +
      '.214-.214v-9a.214.214 0 0 0-.214-.214zM1.5 0h9A1.5 1.5 0 0 1 12 1.5v9a1.5 1.5 0 0 1-1.5 ' +
      '1.5h-9A1.5 1.5 0 0 1 0 10.5v-9A1.5 1.5 0 0 1 1.5 0zm5.712 7.212a1.714 1.714 0 1 ' +
      '1-2.424-2.424 1.714 1.714 0 0 1 2.424 2.424zM2.015 12.71c.102.729.728 1.29 1.485 ' +
      '1.29h9a1.5 1.5 0 0 0 1.5-1.5v-9a1.5 1.5 0 0 0-1.29-1.485v1.442a.216.216 0 0 1 ' +
      '.004.043v9a.214.214 0 0 1-.214.214h-9a.216.216 0 0 1-.043-.004H2.015zm2 2c.102.729.728 ' +
      '1.29 1.485 1.29h9a1.5 1.5 0 0 0 1.5-1.5v-9a1.5 1.5 0 0 0-1.29-1.485v1.442a.216.216 0 0 1 ' +
      '.004.043v9a.214.214 0 0 1-.214.214h-9a.216.216 0 0 1-.043-.004H4.015z',
  ],
}

/** Sidebar list of every stash in the repository. */
export class StashList extends React.Component<IStashListProps> {
  public render() {
    const { stashEntries, canCreateStash } = this.props

    if (stashEntries.length === 0 && !canCreateStash) {
      return null
    }

    return (
      <div className="stash-list">
        <div className="stash-list-header">
          <span className="stash-list-title">
            {stashEntries.length === 0
              ? 'Stashes'
              : `${stashEntries.length} ${
                  stashEntries.length === 1 ? 'stash' : 'stashes'
                }`}
          </span>
          <Button
            size="small"
            onClick={this.props.onCreateStash}
            disabled={!canCreateStash}
            tooltip={
              canCreateStash
                ? __DARWIN__
                  ? 'Stash Changes'
                  : 'Stash changes'
                : 'No local changes to stash'
            }
          >
            <Octicon symbol={octicons.plus} />
            Stash
          </Button>
        </div>
        {stashEntries.length > 0 ? (
          <div className="stash-list-items" role="list">
            {stashEntries.map(this.renderItem)}
          </div>
        ) : null}
      </div>
    )
  }

  private renderItem = (entry: IStashListEntry) => {
    const selected = this.props.selectedStashSha === entry.stashSha
    const fileCount =
      entry.files.kind === StashedChangesLoadStates.Loaded
        ? entry.files.files.length
        : null
    const date =
      entry.committerTime > 0 ? new Date(entry.committerTime * 1000) : null

    const meta: Array<string> = []
    if (entry.branchName.length > 0) {
      meta.push(entry.branchName)
    }
    if (fileCount !== null) {
      meta.push(`${fileCount} file${plural(fileCount)}`)
    }

    return (
      <button
        key={entry.stashSha}
        type="button"
        role="listitem"
        className={classNames('stash-list-item', { selected })}
        onClick={() => this.props.onStashSelected(entry)}
        aria-pressed={selected}
      >
        <Octicon className="stash-list-item-icon" symbol={StashIcon} />
        <div className="stash-list-item-body">
          <div className="stash-list-item-top">
            <span className="stash-list-item-message">{entry.message}</span>
            {entry.isDesktopEntry ? (
              <span className="stash-list-item-badge">Desktop</span>
            ) : null}
          </div>
          <div className="stash-list-item-meta">
            {meta.join(' · ')}
            {date !== null && meta.length > 0 ? ' · ' : null}
            {date !== null ? (
              <RelativeTime date={date} onlyRelative={true} />
            ) : null}
          </div>
        </div>
      </button>
    )
  }
}
