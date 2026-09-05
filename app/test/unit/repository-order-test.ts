import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Repository } from '../../src/models/repository'
import { groupRepositories } from '../../src/ui/repositories-list/group-repositories'
import {
  getDropGroup,
  moveRepository,
} from '../../src/ui/repositories-list/repository-order'

const repositories = [1, 2, 3, 4, 5, 6, 7, 8].map(
  id => new Repository(`repo${id}`, id, null, false)
)

describe('repository ordering', () => {
  it('moves up, down and across groups without losing filtered-out repositories', () => {
    assert.deepEqual(moveRepository([1, 2, 3, 4], 4, 1, 'before'), [4, 1, 2, 3])
    assert.deepEqual(moveRepository([1, 2, 3, 4], 1, 3, 'after'), [2, 3, 1, 4])
    assert.deepEqual(moveRepository([1, 2, 3], 4, 2, 'before'), [1, 4, 2, 3])
    assert.deepEqual(moveRepository([1, 2], 1, 1, 'after'), [1, 2])
    assert.deepEqual(moveRepository([1, 2], 1, 99, 'before'), [1, 2])
  })

  it('applies saved order, appends new repos alphabetically and keeps Recent independent', () => {
    const groups = groupRepositories(
      repositories,
      new Map(),
      [1, 3],
      [3, 99, 1, 2]
    )
    assert.deepEqual(
      groups[0].items.map(i => i.repository.id),
      [1, 3]
    )
    assert.deepEqual(
      groups[1].items.map(i => i.repository.id),
      [3, 1, 2, 4, 5, 6, 7, 8]
    )
  })

  it('accepts custom groups and natural ownership, but never Recent or another owner', () => {
    assert.equal(
      getDropGroup(repositories[0], { kind: 'custom', name: 'Work' }),
      'Work'
    )
    assert.equal(getDropGroup(repositories[0], { kind: 'other' }), null)
    assert.equal(getDropGroup(repositories[0], { kind: 'recent' }), undefined)
    assert.equal(
      getDropGroup(repositories[0], {
        kind: 'enterprise',
        host: 'example.com',
      }),
      undefined
    )
  })
})
