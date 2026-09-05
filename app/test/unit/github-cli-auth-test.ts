import { describe, it, mock, beforeEach, before } from 'node:test'
import assert from 'node:assert/strict'
import { Account } from '../../src/models/account'

const run =
  mock.fn<
    (
      file: string,
      args: ReadonlyArray<string>,
      options: { env: NodeJS.ProcessEnv }
    ) => Promise<{ stdout: string }>
  >()
const fetchAccount =
  mock.fn<(endpoint: string, token: string) => Promise<Account>>()
mock.module('../../src/lib/exec-file', { namedExports: { execFile: run } })
mock.module('../../src/lib/api', {
  namedExports: {
    getHTMLURL: () => 'https://github.com',
    fetchUser: fetchAccount,
    getDotComAPIEndpoint: () => 'https://api.github.com',
  },
})
let getGitHubCliAccount: typeof import('../../src/lib/github-cli-auth').getGitHubCliAccount
before(async () => {
  ;({ getGitHubCliAccount } = await import('../../src/lib/github-cli-auth'))
})

describe('connecting GitHub CLI', () => {
  beforeEach(() => {
    run.mock.resetCalls()
    fetchAccount.mock.resetCalls()
  })

  it('validates the stored CLI token before returning an account', async () => {
    const account = new Account(
      'joan',
      'https://api.github.com',
      'fake-token',
      [],
      '',
      1,
      ''
    )
    run.mock.mockImplementation(async () => ({ stdout: 'fake-token\n' }))
    fetchAccount.mock.mockImplementation(async () => account)
    assert.equal(await getGitHubCliAccount(account.endpoint), account)
    assert.deepEqual(run.mock.calls[0].arguments.slice(0, 2), [
      'gh',
      ['auth', 'token', '--hostname', 'github.com'],
    ])
    const options = run.mock.calls[0].arguments[2]
    for (const key of [
      'GH_TOKEN',
      'GITHUB_TOKEN',
      'GH_ENTERPRISE_TOKEN',
      'GITHUB_ENTERPRISE_TOKEN',
    ]) {
      assert.equal(options.env[key], undefined)
    }
    assert.deepEqual(fetchAccount.mock.calls[0].arguments, [
      account.endpoint,
      'fake-token',
    ])
  })

  it('does not expose child-process output on failure', async () => {
    run.mock.mockImplementation(async () => {
      throw new Error('stdout: fake-secret')
    })
    await assert.rejects(
      getGitHubCliAccount('https://api.github.com'),
      error => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /gh auth login/)
        assert.doesNotMatch(error.message, /fake-secret/)
        return true
      }
    )
    assert.equal(fetchAccount.mock.callCount(), 0)
  })

  it('rejects an empty token without an API request', async () => {
    run.mock.mockImplementation(async () => ({ stdout: '\n' }))
    await assert.rejects(
      getGitHubCliAccount('https://api.github.com'),
      /no stored token/
    )
    assert.equal(fetchAccount.mock.callCount(), 0)
  })

  it('does not return an account when API validation fails', async () => {
    run.mock.mockImplementation(async () => ({ stdout: 'fake-token' }))
    fetchAccount.mock.mockImplementation(async () => {
      throw new Error('fake-secret')
    })
    await assert.rejects(
      getGitHubCliAccount('https://api.github.com'),
      /Could not verify/
    )
  })
})
