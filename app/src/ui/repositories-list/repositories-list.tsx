import * as React from 'react'

import { commitGrammar, RepositoryListItem } from './repository-list-item'
import {
  groupRepositories,
  IRepositoryListItem,
  Repositoryish,
  RepositoryListGroup,
  getGroupKey,
  getRepositoryGroupNames,
} from './group-repositories'
import { IFilterListGroup } from '../lib/filter-list'
import { IMatches } from '../../lib/fuzzy-find'
import { ILocalRepositoryState, Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Button } from '../lib/button'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { showContextualMenu } from '../../lib/menu-item'
import { IMenuItem } from '../../lib/menu-item'
import { PopupType } from '../../models/popup'
import { encodePathAsUrl } from '../../lib/path'
import { TooltippedContent } from '../lib/tooltipped-content'
import memoizeOne from 'memoize-one'
import { KeyboardShortcut } from '../keyboard-shortcut/keyboard-shortcut'
import { generateRepositoryListContextMenu } from '../repositories-list/repository-list-item-context-menu'
import { enableWorktreeSupport } from '../../lib/feature-flag'
import { SectionFilterList } from '../lib/section-filter-list'
import { assertNever } from '../../lib/fatal-error'
import { IAheadBehind } from '../../models/branch'
import { getNumberArray, setNumberArray } from '../../lib/local-storage'
import { getDropGroup, moveRepository } from './repository-order'
import { RepositoryDropTarget } from './repository-drop-target'

const repositoryOrderKey = 'repository-list-order-v1'
const repositoryDragType = 'application/x-desktop-repository'

const BlankSlateImage = encodePathAsUrl(__dirname, 'static/empty-no-repo.svg')

interface IRepositoriesListProps {
  readonly selectedRepository: Repositoryish | null
  readonly repositories: ReadonlyArray<Repositoryish>
  readonly recentRepositories: ReadonlyArray<number>

  /** A cache of the latest repository state values, keyed by the repository id */
  readonly localRepositoryStateLookup: ReadonlyMap<
    number,
    ILocalRepositoryState
  >

  /** Called when a repository has been selected. */
  readonly onSelectionChanged: (repository: Repositoryish) => void

  /** Whether the user has enabled the setting to confirm removing a repository from the app */
  readonly askForConfirmationOnRemoveRepository: boolean

  /** Called when the repository should be removed. */
  readonly onRemoveRepository: (repository: Repositoryish) => void

  /** Called when the repository should be shown in Finder/Explorer/File Manager. */
  readonly onShowRepository: (repository: Repositoryish) => void

  /** Called when the repository should be opened on GitHub in the default web browser. */
  readonly onViewOnGitHub: (repository: Repositoryish) => void

  /** Called when the repository should be shown in the shell. */
  readonly onOpenInShell: (repository: Repositoryish) => void

  /** Called when the repository should be opened in an external editor */
  readonly onOpenInExternalEditor: (repository: Repositoryish) => void

  /** The current external editor selected by the user */
  readonly externalEditorLabel?: string

  /** The label for the user's preferred shell. */
  readonly shellLabel?: string

  /** The callback to fire when the filter text has changed */
  readonly onFilterTextChanged: (text: string) => void

  /** The text entered by the user to filter their repository list */
  readonly filterText: string

  readonly dispatcher: Dispatcher
}

interface IRepositoriesListState {
  readonly newRepositoryMenuExpanded: boolean
  readonly selectedItem: IRepositoryListItem | null
  readonly repositoryOrder: ReadonlyArray<number>
}

const RowHeight = 29

/**
 * Iterate over all groups until a list item is found that matches
 * the id of the provided repository.
 */
function findMatchingListItem(
  groups: ReadonlyArray<
    IFilterListGroup<IRepositoryListItem, RepositoryListGroup>
  >,
  selectedRepository: Repositoryish | null
) {
  if (selectedRepository !== null) {
    for (const group of groups) {
      for (const item of group.items) {
        if (item.repository.id === selectedRepository.id) {
          return item
        }
      }
    }
  }

  return null
}

/** The list of user-added repositories. */
export class RepositoriesList extends React.Component<
  IRepositoriesListProps,
  IRepositoriesListState
> {
  /**
   * A memoized function for grouping repositories for display
   * in the FilterList. The group will not be recomputed as long
   * as the provided list of repositories is equal to the last
   * time the method was called (reference equality).
   */
  private getRepositoryGroups = memoizeOne(
    (
      repositories: ReadonlyArray<Repositoryish> | null,
      localRepositoryStateLookup: ReadonlyMap<number, ILocalRepositoryState>,
      recentRepositories: ReadonlyArray<number>,
      repositoryOrder: ReadonlyArray<number>
    ) =>
      repositories === null
        ? []
        : groupRepositories(
            repositories,
            localRepositoryStateLookup,
            recentRepositories,
            repositoryOrder
          )
  )

  /**
   * A memoized function for finding the selected list item based
   * on an IAPIRepository instance. The selected item will not be
   * recomputed as long as the provided list of repositories and
   * the selected data object is equal to the last time the method
   * was called (reference equality).
   *
   * See findMatchingListItem for more details.
   */
  private getSelectedListItem = memoizeOne(findMatchingListItem)

  private draggedRepository: Repository | null = null
  private dropElement: HTMLElement | null = null
  private movingRepository = false

  public constructor(props: IRepositoriesListProps) {
    super(props)

    this.state = {
      newRepositoryMenuExpanded: false,
      selectedItem: null,
      repositoryOrder: getNumberArray(repositoryOrderKey),
    }
  }

  private onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    repository: Repositoryish
  ) => {
    if (!(repository instanceof Repository) || this.movingRepository) {
      event.preventDefault()
      return
    }
    this.draggedRepository = repository
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(repositoryDragType, repository.id.toString())
    event.stopPropagation()
  }

  private clearDropTarget = () => {
    this.dropElement?.removeAttribute('data-drop-position')
    this.dropElement = null
  }

  private onDragEnd = () => {
    this.draggedRepository = null
    this.clearDropTarget()
  }

  private onDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    group: RepositoryListGroup,
    target?: Repositoryish
  ) => {
    const repository = this.draggedRepository
    if (
      repository === null ||
      !event.dataTransfer.types.includes(repositoryDragType)
    ) {
      return
    }
    event.stopPropagation()
    if (
      this.movingRepository ||
      getDropGroup(repository, group) === undefined ||
      target?.id === repository.id
    ) {
      this.clearDropTarget()
      event.dataTransfer.dropEffect = 'none'
      return
    }
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    this.clearDropTarget()
    this.dropElement = event.currentTarget
    const bounds = event.currentTarget.getBoundingClientRect()
    this.dropElement.dataset.dropPosition =
      target === undefined
        ? 'group'
        : event.clientY < bounds.top + bounds.height / 2
        ? 'before'
        : 'after'
  }

  private getOrderedGroups = () =>
    this.getRepositoryGroups(
      this.props.repositories,
      this.props.localRepositoryStateLookup,
      this.props.recentRepositories,
      this.state.repositoryOrder
    )

  private moveToGroup = async (
    repository: Repository,
    group: RepositoryListGroup,
    target: Repositoryish | undefined,
    position: 'before' | 'after'
  ) => {
    const newGroup = getDropGroup(repository, group)
    if (newGroup === undefined || this.movingRepository) {
      return
    }
    const groups = this.getOrderedGroups().filter(
      g => g.identifier.kind !== 'recent'
    )
    const order = groups.flatMap(g => g.items.map(i => i.repository.id))
    const destination = groups.find(
      g => getGroupKey(g.identifier) === getGroupKey(group)
    )
    const targetID = target?.id ?? destination?.items.at(-1)?.repository.id
    const nextOrder =
      targetID === undefined
        ? order
        : moveRepository(order, repository.id, targetID, position)
    this.movingRepository = true
    try {
      if (repository.group !== newGroup) {
        await this.props.dispatcher.changeRepositoryGroup(repository, newGroup)
      }
      setNumberArray(repositoryOrderKey, nextOrder)
      this.setState({ repositoryOrder: nextOrder })
    } catch (error) {
      this.props.dispatcher.postError(
        error instanceof Error ? error : new Error(String(error))
      )
    } finally {
      this.movingRepository = false
    }
  }

  private onDrop = (
    event: React.DragEvent<HTMLDivElement>,
    group: RepositoryListGroup,
    target?: Repositoryish
  ) => {
    const repository = this.draggedRepository
    const position = event.currentTarget.dataset.dropPosition
    if (repository === null || position === undefined) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    this.onDragEnd()
    this.moveToGroup(
      repository,
      group,
      target,
      position === 'before' ? 'before' : 'after'
    )
  }

  private renderItem = (item: IRepositoryListItem, matches: IMatches) => {
    const repository = item.repository
    return (
      <RepositoryDropTarget
        key={repository.id}
        repository={repository}
        group={item.group}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        onDragOver={this.onDragOver}
        onDragLeave={this.clearDropTarget}
        onDrop={this.onDrop}
      >
        <RepositoryListItem
          repository={repository}
          needsDisambiguation={item.needsDisambiguation}
          matches={matches}
          aheadBehind={item.aheadBehind}
          changedFilesCount={item.changedFilesCount}
        />
      </RepositoryDropTarget>
    )
  }

  private getAheadBehindTooltip = (aheadBehind: IAheadBehind | null) => {
    if (aheadBehind === null) {
      return null
    }

    const { ahead, behind } = aheadBehind

    if (behind === 0 && ahead === 0) {
      return null
    }

    return (
      'The currently checked out branch is' +
      (behind ? ` ${commitGrammar(behind)} behind ` : '') +
      (behind && ahead ? 'and' : '') +
      (ahead ? ` ${commitGrammar(ahead)} ahead of ` : '') +
      'its tracked branch.'
    )
  }

  private renderRowFocusTooltip = (
    item: IRepositoryListItem
  ): JSX.Element | string | null => {
    const { repository, aheadBehind, changedFilesCount } = item
    const gitHubRepo =
      repository instanceof Repository ? repository.gitHubRepository : null
    const alias = repository instanceof Repository ? repository.alias : null
    const realName = gitHubRepo ? gitHubRepo.fullName : repository.name
    const aheadBehindTooltip = this.getAheadBehindTooltip(aheadBehind)
    const hasChanges = changedFilesCount > 0
    const uncommittedChangesTooltip = hasChanges
      ? `There are uncommitted changes in this repository.`
      : null

    const ahead = aheadBehind?.ahead ?? 0
    const behind = aheadBehind?.behind ?? 0

    return (
      <div className="repository-list-item-tooltip list-item-tooltip">
        <div>
          <div className="label">Full Name: </div>
          {realName}
          {alias && <> ({alias})</>}
        </div>
        <div>
          <div className="label">Path: </div>
          {repository.path}
        </div>
        {aheadBehindTooltip && (
          <div>
            <div className="label">
              <div className="ahead-behind">
                {ahead > 0 && <Octicon symbol={octicons.arrowUp} />}
                {behind > 0 && <Octicon symbol={octicons.arrowDown} />}
              </div>
            </div>
            {aheadBehindTooltip}
          </div>
        )}
        {uncommittedChangesTooltip && (
          <div>
            <div className="label">
              <span className="change-indicator-wrapper">
                <Octicon symbol={octicons.dotFill} />
              </span>
            </div>
            {uncommittedChangesTooltip}
          </div>
        )}
      </div>
    )
  }

  private getGroupLabel(group: RepositoryListGroup) {
    const { kind } = group
    if (kind === 'enterprise') {
      return group.host
    } else if (kind === 'other') {
      return 'Other'
    } else if (kind === 'custom') {
      return group.name
    } else if (kind === 'dotcom') {
      return group.owner.login
    } else if (kind === 'recent') {
      return 'Recent'
    } else {
      assertNever(kind, `Unknown repository group kind ${kind}`)
    }
  }

  private renderGroupHeader = (group: RepositoryListGroup) => {
    const label = this.getGroupLabel(group)

    return (
      <RepositoryDropTarget
        group={group}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        onDragOver={this.onDragOver}
        onDragLeave={this.clearDropTarget}
        onDrop={this.onDrop}
      >
        <TooltippedContent
          key={getGroupKey(group)}
          className="filter-list-group-header"
          tooltip={label}
          onlyWhenOverflowed={true}
          tagName="div"
        >
          {label}
        </TooltippedContent>
      </RepositoryDropTarget>
    )
  }

  private onItemClick = (item: IRepositoryListItem) => {
    const hasIndicator =
      item.changedFilesCount > 0 ||
      (item.aheadBehind !== null
        ? item.aheadBehind.ahead > 0 || item.aheadBehind.behind > 0
        : false)
    this.props.dispatcher.recordRepoClicked(hasIndicator)
    this.props.onSelectionChanged(item.repository)
  }

  private onItemContextMenu = (
    item: IRepositoryListItem,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault()

    const items = generateRepositoryListContextMenu({
      onRemoveRepository: this.props.onRemoveRepository,
      onShowRepository: this.props.onShowRepository,
      onOpenInShell: this.props.onOpenInShell,
      onOpenInExternalEditor: this.props.onOpenInExternalEditor,
      askForConfirmationOnRemoveRepository:
        this.props.askForConfirmationOnRemoveRepository,
      externalEditorLabel: this.props.externalEditorLabel,
      onChangeRepositoryAlias: this.onChangeRepositoryAlias,
      onRemoveRepositoryAlias: this.onRemoveRepositoryAlias,
      repositoryGroups: getRepositoryGroupNames(this.props.repositories),
      onChangeRepositoryGroup: this.onChangeRepositoryGroup,
      onCreateRepositoryGroup: this.onCreateRepositoryGroup,
      onViewOnGitHub: this.props.onViewOnGitHub,
      onCreateWorktree: enableWorktreeSupport()
        ? this.onCreateWorktree
        : undefined,
      onShowWorktrees: enableWorktreeSupport()
        ? this.onShowWorktrees
        : undefined,
      repository: item.repository,
      shellLabel: this.props.shellLabel,
    })

    const repository = item.repository
    const group = this.getOrderedGroups().find(
      g =>
        g.identifier.kind !== 'recent' &&
        g.items.some(i => i.repository.id === repository.id)
    )
    if (repository instanceof Repository && group !== undefined) {
      const index = group.items.findIndex(
        i => i.repository.id === repository.id
      )
      const moves: IMenuItem[] = [
        {
          label: 'Move Up',
          enabled: index > 0,
          action: () =>
            this.moveToGroup(
              repository,
              group.identifier,
              group.items[index - 1]?.repository,
              'before'
            ),
        },
        {
          label: 'Move Down',
          enabled: index < group.items.length - 1,
          action: () =>
            this.moveToGroup(
              repository,
              group.identifier,
              group.items[index + 1]?.repository,
              'after'
            ),
        },
        { type: 'separator' },
      ]
      showContextualMenu([...moves, ...items])
    } else {
      showContextualMenu(items)
    }
  }

  private getItemAriaLabel = (item: IRepositoryListItem) => item.repository.name
  private getGroupAriaLabelGetter =
    (
      groups: ReadonlyArray<
        IFilterListGroup<IRepositoryListItem, RepositoryListGroup>
      >
    ) =>
    (group: number) =>
      this.getGroupLabel(groups[group].identifier)

  public render() {
    const groups = this.getOrderedGroups()

    // So there's two types of selection at play here. There's the repository
    // selection for the whole app and then there's the keyboard selection in
    // the list itself. If the user has selected a repository using keyboard
    // navigation we want to honor that selection. If the user hasn't selected a
    // repository yet we'll select the repository currently selected in the app.
    const selectedItem =
      this.state.selectedItem ??
      this.getSelectedListItem(groups, this.props.selectedRepository)

    return (
      <div className="repository-list">
        <SectionFilterList<IRepositoryListItem, RepositoryListGroup>
          rowHeight={RowHeight}
          selectedItem={selectedItem}
          filterText={this.props.filterText}
          onFilterTextChanged={this.props.onFilterTextChanged}
          renderItem={this.renderItem}
          renderRowFocusTooltip={this.renderRowFocusTooltip}
          renderGroupHeader={this.renderGroupHeader}
          onItemClick={this.onItemClick}
          renderPostFilter={this.renderPostFilter}
          renderNoItems={this.renderNoItems}
          groups={groups}
          invalidationProps={{
            repositories: this.props.repositories,
            filterText: this.props.filterText,
            repositoryOrder: this.state.repositoryOrder,
          }}
          onItemContextMenu={this.onItemContextMenu}
          getGroupAriaLabel={this.getGroupAriaLabelGetter(groups)}
          getItemAriaLabel={this.getItemAriaLabel}
          onSelectionChanged={this.onSelectionChanged}
        />
      </div>
    )
  }

  private onSelectionChanged = (selectedItem: IRepositoryListItem | null) => {
    this.setState({ selectedItem })
  }

  private renderPostFilter = () => {
    return (
      <Button
        className="new-repository-button"
        onClick={this.onNewRepositoryButtonClick}
        ariaExpanded={this.state.newRepositoryMenuExpanded}
        onKeyDown={this.onNewRepositoryButtonKeyDown}
      >
        Add
        <Octicon symbol={octicons.triangleDown} />
      </Button>
    )
  }

  private onNewRepositoryButtonKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key === 'ArrowDown') {
      this.onNewRepositoryButtonClick()
    }
  }

  private renderNoItems = () => {
    return (
      <div className="no-items no-results-found">
        <img src={BlankSlateImage} className="blankslate-image" alt="" />
        <div className="title">Sorry, I can't find that repository</div>

        <div className="protip">
          ProTip! Press{' '}
          <div className="kbd-shortcut">
            <KeyboardShortcut darwinKeys={['⌘', 'O']} keys={['Ctrl', 'O']} />
          </div>{' '}
          to quickly add a local repository, and{' '}
          <div className="kbd-shortcut">
            <KeyboardShortcut
              darwinKeys={['⇧', '⌘', 'O']}
              keys={['Ctrl', 'Shift', 'O']}
            />
          </div>{' '}
          to clone from anywhere within the app
        </div>
      </div>
    )
  }

  private onNewRepositoryButtonClick = () => {
    const items: IMenuItem[] = [
      {
        label: __DARWIN__ ? 'Clone Repository…' : 'Clone repository…',
        action: this.onCloneRepository,
      },
      {
        label: __DARWIN__ ? 'Create New Repository…' : 'Create new repository…',
        action: this.onCreateNewRepository,
      },
      {
        label: __DARWIN__
          ? 'Add Existing Repository…'
          : 'Add existing repository…',
        action: this.onAddExistingRepository,
      },
    ]

    this.setState({ newRepositoryMenuExpanded: true })
    showContextualMenu(items).then(() => {
      this.setState({ newRepositoryMenuExpanded: false })
    })
  }

  private onCloneRepository = () => {
    this.props.dispatcher.showPopup({
      type: PopupType.CloneRepository,
      initialURL: null,
    })
  }

  private onAddExistingRepository = () => {
    this.props.dispatcher.showPopup({ type: PopupType.AddRepository })
  }

  private onCreateNewRepository = () => {
    this.props.dispatcher.showPopup({ type: PopupType.CreateRepository })
  }

  private onChangeRepositoryAlias = (repository: Repository) => {
    this.props.dispatcher.showPopup({
      type: PopupType.ChangeRepositoryAlias,
      repository,
    })
  }

  private onRemoveRepositoryAlias = (repository: Repository) => {
    this.props.dispatcher.changeRepositoryAlias(repository, null)
  }

  private onChangeRepositoryGroup = (
    repository: Repository,
    group: string | null
  ) => {
    this.props.dispatcher.changeRepositoryGroup(repository, group)
  }

  private onCreateRepositoryGroup = (repository: Repository) => {
    this.props.dispatcher.showPopup({
      type: PopupType.ChangeRepositoryGroup,
      repository,
    })
  }

  private onCreateWorktree = (repository: Repository) => {
    this.props.dispatcher.showPopup({
      type: PopupType.AddWorktree,
      repository,
    })
  }

  private onShowWorktrees = (repository: Repository) => {
    this.props.dispatcher.selectRepository(repository)
    this.props.dispatcher.showWorktreesFoldout()
  }
}
