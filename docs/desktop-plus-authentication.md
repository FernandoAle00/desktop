# Signing in to GitHub Desktop Plus

You only need GitHub Desktop Plus. The original GitHub Desktop is not required.

1. Install [GitHub CLI](https://cli.github.com/) and sign in with
   `gh auth login --hostname github.com`.
2. In Plus, open Settings → Accounts → Sign Into GitHub.com.
3. Select **Connect GitHub CLI**. Plus validates the active CLI account with
   GitHub and stores its token in its own secure credential entry.

If an older account is still shown, sign out in Plus and connect again.
No tokens are imported from the original Desktop's Keychain entries.

Plus uses `GitHub Desktop Plus - <API endpoint>` for credentials in both local
and production builds. Updating the build channel therefore does not switch
accounts. Signing out removes only the local Plus credential. To revoke the
credential on GitHub, manage its originating authorization in GitHub settings.

The CLI token is read through [`gh auth token`](https://cli.github.com/manual/gh_auth_token)
only when you select Connect. Environment token overrides are excluded. Tokens
and child-process output are never included in connection error messages.

Builds without a configured production OAuth application use CLI connection
instead of the upstream development OAuth client. A configured OAuth application
can continue to use the existing browser flow. CLI connection does not expand
the account's permissions or bypass organization policies.
