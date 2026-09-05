import assert from 'node:assert/strict'
import { before, describe, it, mock } from 'node:test'
import { Account } from '../../src/models/account'
import { AccountsStore } from '../../src/lib/stores/accounts-store'
import { InMemoryStore, AsyncInMemoryStore } from '../helpers/stores'

const connect = mock.fn<() => Promise<Account>>()
mock.module('../../src/lib/github-cli-auth', {
  namedExports: { getGitHubCliAccount: connect },
})
let SignInStore: typeof import('../../src/lib/stores/sign-in-store').SignInStore
before(async () => {
  ;({ SignInStore } = await import('../../src/lib/stores/sign-in-store'))
})
const account = new Account(
  'joan',
  'https://api.github.com',
  'fake-token',
  [],
  '',
  1,
  ''
)

function createStore() {
  return new SignInStore(
    new AccountsStore(new InMemoryStore(), new AsyncInMemoryStore())
  )
}

describe('Plus sign-in', () => {
  it('emits the verified CLI account', async () => {
    connect.mock.mockImplementation(async () => account)
    const store = createStore()
    const authenticated = mock.fn()
    store.onDidAuthenticate(authenticated)
    store.beginDotComSignIn()
    await store.authenticateWithGitHubCLI()
    assert.equal(store.getState()?.kind, 'Success')
    assert.equal(authenticated.mock.calls[0].arguments[0], account)
  })

  it('ignores a CLI response after the user cancels sign-in', async () => {
    let resolve: (account: Account) => void = () => {
      throw new Error('Not started')
    }
    connect.mock.mockImplementation(
      () =>
        new Promise<Account>(r => {
          resolve = r
        })
    )
    const store = createStore()
    const authenticated = mock.fn()
    store.onDidAuthenticate(authenticated)
    store.beginDotComSignIn()
    const pending = store.authenticateWithGitHubCLI()
    store.reset()
    resolve(account)
    await pending
    assert.equal(authenticated.mock.callCount(), 0)
    assert.equal(store.getState(), null)
  })

  it('keeps the existing account when CLI authentication fails', async () => {
    const accounts = new AccountsStore(
      new InMemoryStore(),
      new AsyncInMemoryStore()
    )
    await accounts.addAccount(account)
    const store = new SignInStore(accounts)
    await new Promise<void>(resolve => setImmediate(resolve))
    connect.mock.mockImplementation(async () => {
      throw new Error('CLI is not signed in')
    })
    store.beginDotComSignIn()
    await store.authenticateWithGitHubCLI()
    assert.equal(store.getState()?.kind, 'ExistingAccountWarning')
    assert.deepEqual(await accounts.getAll(), [account])
  })

  it('blocks the development OAuth client instead of opening a browser', async () => {
    Object.assign(globalThis, { __DEV_SECRETS__: true })
    try {
      const store = createStore()
      store.beginDotComSignIn()
      await store.authenticateWithBrowser()
      const state = store.getState()
      assert.ok(state && state.kind !== 'Success')
      assert.equal(state.loading, false)
      assert.match(state.error?.message ?? '', /development OAuth/)
    } finally {
      Object.assign(globalThis, { __DEV_SECRETS__: false })
    }
  })
})
