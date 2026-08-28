import * as React from 'react'
import { IStashEntry } from '../../models/stash-entry'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import { PopupType } from '../../models/popup'
import { ErrorWithMetadata } from '../../lib/error-with-metadata'
import { RetryActionType } from '../../models/retry-actions'
import { Button } from '../lib/button'

interface IStashDiffHeaderProps {
  readonly stashEntry: IStashEntry
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly askForConfirmationOnDiscardStash: boolean
}

interface IStashDiffHeaderState {
  readonly isApplying: boolean
  readonly isRestoring: boolean
  readonly isDiscarding: boolean
}

/**
 * Component to provide the actions that can be performed
 * on a stash while viewing a stash diff
 */
export class StashDiffHeader extends React.Component<
  IStashDiffHeaderProps,
  IStashDiffHeaderState
> {
  public constructor(props: IStashDiffHeaderProps) {
    super(props)

    this.state = {
      isApplying: false,
      isRestoring: false,
      isDiscarding: false,
    }
  }

  public render() {
    const { isApplying, isRestoring, isDiscarding } = this.state
    const busy = isApplying || isRestoring || isDiscarding

    return (
      <div className="header">
        <h3>Stashed changes</h3>
        <div className="row">
          <div className="button-group">
            <Button type="submit" disabled={busy} onClick={this.onApplyClick}>
              Apply
            </Button>
            <Button disabled={busy} onClick={this.onRestoreClick}>
              Pop
            </Button>
            <Button disabled={busy} onClick={this.onDiscardClick}>
              Drop
            </Button>
          </div>
          <div className="explanatory-text" id="stash-actions-description">
            <span className="text">
              <strong>Apply</strong> keeps the stash. <strong>Pop</strong>{' '}
              applies it and deletes it.
            </span>
          </div>
        </div>
      </div>
    )
  }

  private onDiscardClick = async () => {
    const {
      dispatcher,
      repository,
      stashEntry,
      askForConfirmationOnDiscardStash,
    } = this.props

    if (!askForConfirmationOnDiscardStash) {
      this.setState({
        isDiscarding: true,
      })

      try {
        await dispatcher.dropStash(repository, stashEntry)
      } finally {
        this.setState({
          isDiscarding: false,
        })
      }
    } else {
      dispatcher.showPopup({
        type: PopupType.ConfirmDiscardStash,
        stash: stashEntry,
        repository,
      })
    }
  }

  private onRestoreClick = async () => {
    const { dispatcher, repository, stashEntry } = this.props

    try {
      this.setState({ isRestoring: true })
      await dispatcher.popStash(repository, stashEntry)
    } catch (err) {
      const errorWithMetadata = new ErrorWithMetadata(err, {
        repository: repository,
        retryAction: {
          type: RetryActionType.PopStash,
          stashEntry,
          repository,
        },
      })
      dispatcher.postError(errorWithMetadata)
    } finally {
      this.setState({ isRestoring: false })
    }
  }

  private onApplyClick = async () => {
    const { dispatcher, repository, stashEntry } = this.props

    try {
      this.setState({ isApplying: true })
      await dispatcher.applyStash(repository, stashEntry)
    } catch (err) {
      dispatcher.postError(
        new ErrorWithMetadata(err, { repository: repository })
      )
    } finally {
      this.setState({ isApplying: false })
    }
  }
}
