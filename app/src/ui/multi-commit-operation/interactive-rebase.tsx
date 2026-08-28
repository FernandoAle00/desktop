import * as React from 'react'
import {
  IInteractiveRebaseTodoEntry,
  MultiCommitOperationKind,
  MultiCommitOperationStepKind,
} from '../../models/multi-commit-operation'
import { BaseRebase } from './base-rebase'
import { InteractiveRebaseDialog } from './dialog/interactive-rebase-dialog'

export abstract class InteractiveRebase extends BaseRebase {
  protected conflictDialogOperationPrefix = 'rebasing commits on'
  protected rebaseKind = MultiCommitOperationKind.InteractiveRebase

  protected onBeginOperation = () => {
    const { repository, dispatcher, state } = this.props
    const { operationDetail } = state

    if (operationDetail.kind !== MultiCommitOperationKind.InteractiveRebase) {
      this.endFlowInvalidState()
      return
    }

    const { commits, lastRetainedCommitRef, entries } = operationDetail

    return dispatcher.startInteractiveRebase(
      repository,
      commits,
      lastRetainedCommitRef,
      entries,
      true
    )
  }

  protected renderChooseInteractiveRebasePlan = (): JSX.Element | null => {
    const { state } = this.props
    const { operationDetail, step } = state

    if (
      step.kind !== MultiCommitOperationStepKind.ChooseInteractiveRebasePlan ||
      operationDetail.kind !== MultiCommitOperationKind.InteractiveRebase
    ) {
      this.endFlowInvalidState()
      return null
    }

    return (
      <InteractiveRebaseDialog
        commits={operationDetail.commits}
        onDismissed={this.onFlowEnded}
        onStart={this.onPlanConfirmed}
      />
    )
  }

  private onPlanConfirmed = (
    entries: ReadonlyArray<IInteractiveRebaseTodoEntry>
  ) => {
    const { repository, dispatcher, state } = this.props
    const { operationDetail } = state

    if (operationDetail.kind !== MultiCommitOperationKind.InteractiveRebase) {
      this.endFlowInvalidState()
      return
    }

    const { commits, lastRetainedCommitRef } = operationDetail

    return dispatcher.startInteractiveRebase(
      repository,
      commits,
      lastRetainedCommitRef,
      entries
    )
  }
}
