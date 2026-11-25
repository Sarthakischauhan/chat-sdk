# Publishing Chat SDK from GitHub Releases

A published, **non-prerelease** GitHub Release with a tag such as `chat-0.0.3` runs [Publish Chat SDK to npm](../.github/workflows/publish-npm.yml). Draft releases and tags outside `chat-X.Y.Z` do not publish.

This is an npm publishing workflow, unlike Symphony's initial `publish.yml`, which only builds PyPI distributions.

## One-time setup on npm

For **each** npm package managed by this repository, open its package settings at npmjs.com, find **Trusted Publisher**, select **GitHub Actions**, and enter:

- GitHub owner: `Sarthakischauhan`
- Repository: `chat-sdk`
- Workflow filename: `publish-npm.yml`
- Environment: leave blank (this workflow does not use a GitHub environment).

Packages: `@sarchauhan/protocol`, `@sarchauhan/adapter`, `@sarchauhan/adapter-ai-sdk`, `@sarchauhan/chat-tui`, and `@sarchauhan/chat`. Trusted publishing must be configured for every package you intend to publish. It does **not** require an `NPM_TOKEN` secret. If a package does not exist yet, npm may require an initial manual publication before its trusted publisher can be configured.

## Prepare a release PR

1. Merge SDK changes, including any activity-modal fixes, into `main`.
2. Bump `@sarchauhan/chat` in `packages/chat/package.json` to the new version (for example, `0.0.3`).
3. Bump any other changed packages' versions. When `@sarchauhan/protocol` changes, bump its version and update **all** local packages that depend on it, including adapter, AI SDK adapter, chat, and TUI, to use the new exact version. Bump changed dependents' versions too. Update `@sarchauhan/chat`'s exact adapter dependency when needed.
4. Run `npm install --package-lock-only` so the lockfile matches the manifests.
5. Verify `npm ci && npm run build && npm run typecheck && npm test`, then merge that version-bump PR.

Important: workspace manifests use **exact** internal dependency versions. The release script rejects a tag/version mismatch or inconsistent workspace dependencies. npm package versions are immutable; a changed package cannot be republished at its old version.

## Publish

1. In GitHub, open **Releases → Draft a new release** in `Sarthakischauhan/chat-sdk`.
2. Create tag `chat-0.0.3` **from the tested commit on main**. The tag must match `packages/chat/package.json`.
3. Include release notes and publish (do not mark as prerelease).
4. Monitor **Actions → Publish Chat SDK to npm**.

The workflow checks the release commit is on `main`, runs build/typecheck/unit/Storybook/package checks, and publishes in dependency order:
`protocol → adapter → adapter-ai-sdk → chat-tui → chat`.
Packages already published at the workspace version are skipped, except `@sarchauhan/chat`: a duplicate chat version fails. Publishing via trusted OIDC generates npm provenance for public packages.

If publishing fails partway through, previously published npm versions cannot be deleted or overwritten. Correct the issue and prepare a new release tag/version as necessary.

## Portfolio behavior

The portfolio pins `@sarchauhan/chat` to an exact version. A GitHub Release or npm publish **does not automatically update the website**.

To update `Sarthakischauhan/portfolio`:

1. Update `@sarchauhan/chat` to the newly published version in `package.json` and regenerate `package-lock.json` with `npm install`.
2. Run `node scripts/sync-chat-sdk-styles.cjs`, committing the regenerated `app/components/projects/chat-sdk-demo.css`.
3. Update the ChatSdkDemo sample subagent's `messages` with task, intermediate tool calls, and final output to demonstrate the full activity modal (the SDK cannot reconstruct missing history).
4. Build and redeploy the portfolio.

Portfolio release notes already use tags matching `chat-X.Y.Z` for GitHub release discovery.
