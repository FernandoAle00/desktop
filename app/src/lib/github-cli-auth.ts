import { execFile } from './exec-file'
import { fetchUser, getHTMLURL } from './api'

/** Connect the CLI account only after an explicit sign-in request. */
export async function getGitHubCliAccount(endpoint: string) {
  const hostname = new URL(getHTMLURL(endpoint)).hostname
  const env: NodeJS.ProcessEnv = { ...process.env, GH_PROMPT_DISABLED: '1' }
  // Connect the stored CLI account, not an inherited automation credential.
  for (const key of [
    'GH_TOKEN',
    'GITHUB_TOKEN',
    'GH_ENTERPRISE_TOKEN',
    'GITHUB_ENTERPRISE_TOKEN',
  ]) {
    delete env[key]
  }

  let token: string
  try {
    const { stdout } = await execFile(
      'gh',
      ['auth', 'token', '--hostname', hostname],
      {
        env,
        encoding: 'utf8',
        timeout: 15000,
        maxBuffer: 16384,
      }
    )
    token = stdout.trim()
  } catch {
    // Child-process errors can contain stdout, including the credential.
    throw new Error(
      `Could not connect GitHub CLI. Install gh and run "gh auth login --hostname ${hostname}" in your terminal, then try again.`
    )
  }

  if (token.length === 0) {
    throw new Error(
      `GitHub CLI has no stored token for ${hostname}. Run "gh auth login --hostname ${hostname}" and try again.`
    )
  }

  try {
    return await fetchUser(endpoint, token)
  } catch {
    throw new Error(
      `Could not verify the GitHub CLI account for ${hostname}. Check your connection and run "gh auth status --hostname ${hostname}".`
    )
  }
}
