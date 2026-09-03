import * as React from 'react'

import { Dispatcher } from '../dispatcher'
import { nameOf, Repository } from '../../models/repository'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { TextBox } from '../lib/text-box'

interface IChangeRepositoryGroupProps {
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
  readonly repository: Repository
}

interface IChangeRepositoryGroupState {
  readonly newGroup: string
}

/**
 * Asks for the name of the group a repository should be moved into. Typing the
 * name of an existing group moves the repository into that group.
 */
export class ChangeRepositoryGroup extends React.Component<
  IChangeRepositoryGroupProps,
  IChangeRepositoryGroupState
> {
  public constructor(props: IChangeRepositoryGroupProps) {
    super(props)

    this.state = { newGroup: props.repository.group ?? '' }
  }

  public render() {
    const { repository } = this.props

    return (
      <Dialog
        id="change-repository-group"
        title={__DARWIN__ ? 'Move to Group' : 'Move to group'}
        ariaDescribedBy="change-repository-group-description"
        onDismissed={this.props.onDismissed}
        onSubmit={this.changeGroup}
      >
        <DialogContent>
          <p id="change-repository-group-description">
            Choose the group for the repository "{nameOf(repository)}".
          </p>
          <p>
            <TextBox
              ariaLabel="Group"
              value={this.state.newGroup}
              onValueChanged={this.onGroupChanged}
            />
          </p>
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText={__DARWIN__ ? 'Move to Group' : 'Move to group'}
            okButtonDisabled={this.state.newGroup.trim().length === 0}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private onGroupChanged = (newGroup: string) => {
    this.setState({ newGroup })
  }

  private changeGroup = () => {
    this.props.dispatcher.changeRepositoryGroup(
      this.props.repository,
      this.state.newGroup.trim()
    )
    this.props.onDismissed()
  }
}
