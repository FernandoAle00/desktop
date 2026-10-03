import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterCommittedFiles } from '../../src/lib/filter-committed-files'
import { AppFileStatusKind, CommittedFileChange } from '../../src/models/status'

const files = [
  'README.md',
  'src/Controllers/AccountController.java',
  'test/controllers/AccountControllerTest.java',
  'src/service/ControllersRegistry.java',
  'src/service/AccountService.java',
  'test/Account[1].java',
].map(
  path =>
    new CommittedFileChange(
      path,
      { kind: AppFileStatusKind.Modified },
      'a',
      'b'
    )
)

describe('filterCommittedFiles', () => {
  it('matches partial names and directories without regard to case', () => {
    assert.deepEqual(filterCommittedFiles(files, 'CoNtRoLlErS'), [
      files[1],
      files[2],
      files[3],
    ])
    assert.deepEqual(filterCommittedFiles(files, 'accountcontroller.java'), [
      files[1],
    ])
    assert.deepEqual(filterCommittedFiles(files, 'TEST/CONTROLLERS/'), [
      files[2],
    ])
  })

  it('ignores surrounding whitespace and restores all files for empty input', () => {
    assert.deepEqual(filterCommittedFiles(files, '  readme  '), [files[0]])
    assert.deepEqual(filterCommittedFiles(files, ''), files)
    assert.deepEqual(filterCommittedFiles(files, '   '), files)
  })

  it('treats punctuation as literal file name characters', () => {
    assert.deepEqual(filterCommittedFiles(files, 'account[1]'), [files[5]])
  })

  it('returns no results for an unmatched query or an empty commit', () => {
    assert.deepEqual(filterCommittedFiles(files, 'not-present'), [])
    assert.deepEqual(filterCommittedFiles([], 'controllers'), [])
  })
})
