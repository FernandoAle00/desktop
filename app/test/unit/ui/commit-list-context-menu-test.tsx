import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as React from 'react'
import { CommitList } from '../../../src/ui/history/commit-list'
import { Commit } from '../../../src/models/commit'
import { CommitIdentity } from '../../../src/models/commit-identity'
import { gitHubRepoFixture } from '../../helpers/github-repo-builder'

const identity = new CommitIdentity('Test', 'test@example.com', new Date(0), 0)
const commit = new Commit(
  'a'.repeat(40),
  'aaaaaaa',
  'Test commit',
  '',
  identity,
  identity,
  [],
  [],
  []
)
const repository = gitHubRepoFixture({ owner: 'octocat', name: 'hello-world' })

function menu(
  overrides: Partial<React.ComponentProps<typeof CommitList>> = {}
) {
  const list = new CommitList({
    gitHubRepository: repository,
    commitSHAs: [commit.sha],
    commitLookup: new Map([[commit.sha, commit]]),
    selectedSHAs: [commit.sha],
    emoji: new Map(),
    localCommitSHAs: [],
    isLocalRepository: false,
    accounts: [],
    preferAbsoluteDates: false,
    onViewCommitOnGitHub: () => {},
    ...overrides,
  })
  return list['getContextMenuForSingleCommit'](0, commit, [commit.sha])
}

describe('commit context menu GitHub action', () => {
  it('puts opening the pushed commit first and passes its full SHA', () => {
    const opened: string[] = []
    const item = menu({ onViewCommitOnGitHub: sha => opened.push(sha) })[0]
    assert.equal(item.label, 'Open Commit on GitHub')
    assert.equal(item.enabled, true)
    item.action?.()
    assert.deepEqual(opened, [commit.sha])
  })

  it('disables opening local commits, repositories without GitHub, and absent handlers', () => {
    assert.equal(menu({ localCommitSHAs: [commit.sha] })[0].enabled, false)
    assert.equal(menu({ gitHubRepository: null })[0].enabled, false)
    assert.equal(menu({ onViewCommitOnGitHub: undefined })[0].enabled, false)
  })

  it('identifies GitHub Enterprise in the action', () => {
    const item = menu({
      gitHubRepository: gitHubRepoFixture({
        owner: 'team',
        name: 'repo',
        endpoint: 'https://github.example.com/api/v3',
      }),
    })[0]
    assert.equal(item.label, 'Open Commit on GitHub Enterprise')
    assert.equal(item.enabled, true)
  })
})
