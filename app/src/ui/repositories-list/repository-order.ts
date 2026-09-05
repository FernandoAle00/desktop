import { Repository } from '../../models/repository'
import {
  getGroupForRepository,
  getGroupKey,
  RepositoryListGroup,
} from './group-repositories'

/** Automatic groups describe ownership; only custom groups accept unrelated repos. */
export function getDropGroup(
  repository: Repository,
  group: RepositoryListGroup
) {
  if (group.kind === 'recent') {
    return undefined
  }
  if (group.kind === 'custom') {
    return group.name
  }
  return getGroupKey(getGroupForRepository(repository, false)) ===
    getGroupKey(group)
    ? null
    : undefined
}

/** Insert relative to the full list, so filtering never discards hidden repos. */
export function moveRepository(
  order: ReadonlyArray<number>,
  repositoryID: number,
  targetID: number,
  position: 'before' | 'after'
): ReadonlyArray<number> {
  if (repositoryID === targetID || !order.includes(targetID)) {
    return order
  }
  const result = order.filter(id => id !== repositoryID)
  const index = result.indexOf(targetID) + (position === 'after' ? 1 : 0)
  result.splice(index, 0, repositoryID)
  return result
}
