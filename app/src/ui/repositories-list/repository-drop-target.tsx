import * as React from 'react'
import { Repository } from '../../models/repository'
import { Repositoryish, RepositoryListGroup } from './group-repositories'

interface IRepositoryDropTargetProps {
  readonly group: RepositoryListGroup
  readonly repository?: Repositoryish
  readonly onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    repository: Repositoryish
  ) => void
  readonly onDragEnd: () => void
  readonly onDragOver: (
    event: React.DragEvent<HTMLDivElement>,
    group: RepositoryListGroup,
    repository?: Repositoryish
  ) => void
  readonly onDragLeave: () => void
  readonly onDrop: (
    event: React.DragEvent<HTMLDivElement>,
    group: RepositoryListGroup,
    repository?: Repositoryish
  ) => void
}

/** Native dragging keeps the existing virtualized list and keyboard navigation. */
export class RepositoryDropTarget extends React.PureComponent<IRepositoryDropTargetProps> {
  private onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (this.props.repository !== undefined) {
      this.props.onDragStart(event, this.props.repository)
    }
  }

  private onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    this.props.onDragOver(event, this.props.group, this.props.repository)
  }

  private onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    this.props.onDrop(event, this.props.group, this.props.repository)
  }

  public render() {
    return (
      <div
        className={
          this.props.repository === undefined
            ? 'repository-drop-group'
            : 'repository-drag-item'
        }
        draggable={this.props.repository instanceof Repository}
        onDragStart={this.onDragStart}
        onDragEnd={this.props.onDragEnd}
        onDragOver={this.onDragOver}
        onDragLeave={this.props.onDragLeave}
        onDrop={this.onDrop}
      >
        {this.props.children}
      </div>
    )
  }
}
