import * as React from 'react'
import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { TextBox } from '../lib/text-box'
import { Checkbox, CheckboxValue } from '../lib/checkbox'
import { Row } from '../lib/row'

interface ICreateStashDialogProps {
  readonly dispatcher: Dispatcher
  readonly repository: Repository
  readonly onDismissed: () => void
}

interface ICreateStashDialogState {
  readonly message: string
  readonly includeUntracked: boolean
  readonly isCreating: boolean
}

/**
 * Dialog to create a stash with a user-provided message.
 *
 * This does not use the Desktop magic marker, so the stash is treated as a
 * regular entry and will not participate in the one-per-branch overwrite flow.
 */
export class CreateStashDialog extends React.Component<
  ICreateStashDialogProps,
  ICreateStashDialogState
> {
  public constructor(props: ICreateStashDialogProps) {
    super(props)

    this.state = {
      message: '',
      includeUntracked: true,
      isCreating: false,
    }
  }

  public render() {
    const title = __DARWIN__ ? 'Create Stash' : 'Create stash'

    return (
      <Dialog
        id="create-stash"
        title={title}
        onSubmit={this.onSubmit}
        onDismissed={this.props.onDismissed}
        loading={this.state.isCreating}
        disabled={this.state.isCreating}
      >
        <DialogContent>
          <Row>
            <TextBox
              label="Message"
              placeholder="Description of these changes"
              value={this.state.message}
              onValueChanged={this.onMessageChanged}
              autoFocus={true}
            />
          </Row>
          <Row>
            <Checkbox
              label="Include untracked files"
              value={
                this.state.includeUntracked
                  ? CheckboxValue.On
                  : CheckboxValue.Off
              }
              onChange={this.onIncludeUntrackedChanged}
            />
          </Row>
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText={__DARWIN__ ? 'Create Stash' : 'Create stash'}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private onMessageChanged = (message: string) => {
    this.setState({ message })
  }

  private onIncludeUntrackedChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    this.setState({ includeUntracked: event.currentTarget.checked })
  }

  private onSubmit = async () => {
    const { dispatcher, repository, onDismissed } = this.props

    this.setState({ isCreating: true })

    try {
      await dispatcher.createStash(
        repository,
        this.state.message,
        this.state.includeUntracked
      )
    } finally {
      this.setState({ isCreating: false })
    }

    onDismissed()
  }
}
