# Release Please Action

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

Automate releases with Conventional Commit Messages.

## Basic Configuration

1. Create a `.github/workflows/release-please.yml` file with these contents:

   ```yaml
   on:
     push:
       branches:
         - main

   permissions:
     contents: write
     pull-requests: write

   name: release-please

   jobs:
     release-please:
       runs-on: ubuntu-latest
       steps:
         - uses: googleapis/release-please-action@v4
           with:
             # this assumes that you have created a personal access token
             # (PAT) and configured it as a GitHub action secret named
             # `MY_RELEASE_PLEASE_TOKEN` (this secret name is not important).
             token: ${{ secrets.MY_RELEASE_PLEASE_TOKEN }}
             # this is a built-in strategy in release-please, see "Action Inputs"
             # for more options
             release-type: simple
   ```

   Specifying a `release-type` configuration is the most straight-forward
   configuration option, but allows for no further customization. For advanced
   configuration options, see the [Advanced Configuration section](#advanced-release-configuration)

2. Merge the above action into your repository and make sure new commits follow
   the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
   convention, [release-please](https://github.com/googleapis/release-please)
   will start creating Release PRs for you.

## Advanced Release Configuration

For any advanced configuration, please set up a
[manifest config](https://github.com/googleapis/release-please/blob/master/docs/manifest-releaser.md)
and then configure this action as follows:

```yaml
#...(same as above)
steps:
  - uses: googleapis/release-please-action@v4
    with:
      # this assumes that you have created a personal access token
      # (PAT) and configured it as a GitHub action secret named
      # `MY_RELEASE_PLEASE_TOKEN` (this secret name is not important).
      token: ${{ secrets.MY_RELEASE_PLEASE_TOKEN }}
      # optional. customize path to release-please-config.json
      config-file: release-please-config.json
      # optional. customize path to .release-please-manifest.json
      manifest-file: .release-please-manifest.json
```

## Action Inputs

| input                      | description                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `token`                    | A GitHub secret token, the action defaults to using the special `secrets.GITHUB_TOKEN`                                                 |
| `release-type`             | If specified, defines the release strategy to use for the repository. Reference [Release types supported](#release-types-supported)    |
| `path`                     | create a release from a path other than the repository's root                                                                          |
| `target-branch`            | branch to open pull release PR against (detected by default)                                                                           |
| `config-file`              | Path to the release-please config in the repository. Defaults to `release-please-config.json`                                          |
| `manifest-file`            | Path to the release-please versions manifest. Defaults to `.release-please-manifest.json`                                              |
| `repo-url`                 | GitHub repository name in the form of `<owner>/<repo>`. Defaults to the repository the action is running in.                           |
| `github-api-url`           | Override the GitHub API URL.                                                                                                           |
| `github-graphql-url`       | Override the GitHub GraphQL URL                                                                                                        |
| `fork`                     | If `true`, send the PR from a fork. This requires the `token` to be a user that can create forks (e.g. not the default `GITHUB_TOKEN`) |
| `include-component-in-tag` | If true, add prefix to tags and branches, allowing multiple libraries to be released from the same repository                          |
| `proxy-server`             | Configure a proxy servier in the form of `<host>:<port>` e.g. `proxy-host.com:8080`                                                    |
| `skip-github-release`      | If `true`, do not attempt to create releases. This is useful if splitting release tagging from PR creation.                            |
| `skip-github-pull-request` | If `true`, do not attempt to create release pull requests. This is useful if splitting release tagging from PR creation.               |

## GitHub Credentials

`release-please` requires a GitHub token to access the GitHub API. You configure this token via
the `token` configuration option.

> [!WARNING]  
> If using GitHub Actions, you will need to specify a `token` for your workflows to run on
> Release Please's releases and PRs.

By default, Release Please uses the built-in `GITHUB_TOKEN` secret. However, all resources created
by `release-please` (release tag or release pull request) will not trigger future GitHub actions workflows,
and workflows normally triggered by `release.created` events will also not run.
From GitHub's
[docs](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow):

> When you use the repository's `GITHUB_TOKEN` to perform tasks, events triggered by the `GITHUB_TOKEN`
> will not create a new workflow run. This prevents you from accidentally creating recursive workflow runs.

You will want to configure a GitHub Actions secret with a
[Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
if you want GitHub Actions CI checks to run on Release Please PRs.

### Workflow Permissions

This workflow will need the following permissions in your workflow file:

```yml
permissions:
  contents: write
  pull-requests: write
```

You may also need to set "Allow GitHub Actions to create and approve pull requests" under
repository Settings > Actions > General.

For more information about permissions:

- GitHub APIs [protected by `contents` permission](https://docs.github.com/en/rest/overview/permissions-required-for-github-apps?apiVersion=2022-11-28#contents)
- GitHub APIs [protected by `pull_requests` permission](https://docs.github.com/en/rest/overview/permissions-required-for-github-apps?apiVersion=2022-11-28#pull-requests)
- Github Actions: [permissions for the `GITHUB_TOKEN`](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- Github Repositories: [enabling workflows for forks of private repositories](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#enabling-workflows-for-private-repository-forks)
- Github Actions: [assigning permissions to jobs](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs)

### Release Types Supported

Release Please automates releases for the following flavors of repositories:

| release type       | description                                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dart` | A repository with a pubspec.yaml and a CHANGELOG.md |
| `elixir`           | An elixir repository with a mix.exs and a CHANGELOG.md                                                                                                                                             |
| `expo` | An Expo based React Native repository, with a package.json, app.json and CHANGELOG.md |
| `go`               | Go repository, with a CHANGELOG.md                                                                                                                                                                 |
| `helm`             | A helm chart repository with a Chart.yaml and a CHANGELOG.md                                                                                                                                       |
| `java`             | [A strategy that generates SNAPSHOT version after each release](https://github.com/googleapis/release-please/blob/main/docs/java.md)                                                               |
| `krm-blueprint` | [A kpt package, with 1 or more KRM files and a CHANGELOG.md](https://github.com/GoogleCloudPlatform/blueprints/tree/main/catalog/project) |
| `maven`            | [Strategy for Maven projects, generates SNAPSHOT version after each release and updates `pom.xml` automatically](https://github.com/googleapis/release-please/blob/main/docs/java.md)              |
| `node`             | [A Node.js repository, with a package.json and CHANGELOG.md](https://github.com/yargs/yargs)                                                                                                       |
| `ocaml`            | [An OCaml repository, containing 1 or more opam or esy files and a CHANGELOG.md](https://github.com/grain-lang/binaryen.ml)                                                                        |
| `python`           | [A Python repository, with a setup.py, setup.cfg, version.py and CHANGELOG.md](https://github.com/googleapis/python-storage) and optionally a pyproject.toml and a &lt;project&gt;/\_\_init\_\_.py |
| `php`              | [A php composer package with composer.json and CHANGELOG.md](https://github.com/setnemo/asterisk-notation)                                                                                         |
| `ruby`             | [A Ruby repository, with version.rb and CHANGELOG.md](https://github.com/google/google-id-token)                                                                                                   |
| `rust`             | A Rust repository, with a Cargo.toml (either as a crate or workspace) and a CHANGELOG.md                                                                                                           |
| `sfdx`             | A repository with a [sfdx-project.json](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm) and a CHANGELOG.md                                        |
| `simple`           | [A repository with a version.txt and a CHANGELOG.md](https://github.com/googleapis/gapic-generator)                                                                                                |
| `terraform-module` | [A terraform module, with a version in the README.md, and a CHANGELOG.md](https://github.com/terraform-google-modules/terraform-google-project-factory)                                            |

New types of releases can be [added here](https://github.com/googleapis/release-please/tree/main/src/strategies).

> You can also find them in the [release-please repository](https://github.com/googleapis/release-please/tree/main#strategy-language-types-supported).

## Outputs

> Properties that are available after the action executed.

| output             | description                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `releases_created` | `true` if any release was created, `false` otherwise                                                                                                              |
| `paths_released`   | A JSON string of the array of paths that had releases created (`[]` if )                                                                                          |
| `prs_created`      | `true` if any pull request was created or updated                                                                                                                 |
| `pr`               | A JSON string of the [PullRequest object](https://github.com/googleapis/release-please/blob/main/src/pull-request.ts#L15) (unset if no release created)           |
| `prs`              | A JSON string of the array of [PullRequest objects](https://github.com/googleapis/release-please/blob/main/src/pull-request.ts#L15) (unset if no release created) |

### Root component outputs

If you have a root component (path is `.` or unset), then the action will also output:

| output               | description                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `release_created`    | `true` if a root component release was created, `false` otherwise                                          |
| `upload_url`         | Directly related to [**Create a release**](https://developer.github.com/v3/repos/releases/#response-4) API |
| `html_url`           | Directly related to [**Create a release**](https://developer.github.com/v3/repos/releases/#response-4) API |
| `tag_name`           | Directly related to [**Create a release**](https://developer.github.com/v3/repos/releases/#response-4) API |
| `major`              | Number representing major semver value                                                                     |
| `minor`              | Number representing minor semver value                                                                     |
| `patch`              | Number representing patch semver value                                                                     |
| `sha`                | SHA that a GitHub release was tagged at                                                                    |

### Path outputs

If you have a monorepo or a component with `path` different than the root (`.`)
directory, then your outputs will have the `path` prefixed to the output name.

This prefix allows you to distinguish values for different releases.

| output                    | description                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `<path>--release_created` | `true` if the release was created, `false` otherwise                                                       |
| `<path>--upload_url`      | Directly related to [**Create a release**](https://developer.github.com/v3/repos/releases/#response-4) API |
| `<path>--html_url`        | Directly related to [**Create a release**](https://developer.github.com/v3/repos/releases/#response-4) API |
| `<path>--tag_name`        | Directly related to [**Create a release**](https://developer.github.com/v3/repos/releases/#response-4) API |
| `<path>--major`           | Number representing major semver value                                                                     |
| `<path>--minor`           | Number representing minor semver value                                                                     |
| `<path>--patch`           | Number representing patch semver value                                                                     |
| `<path>--sha`             | sha that a GitHub release was tagged at                                                                    |

If the path contains `/` you can access the outputs by using javascript like property access `steps.release.outputs[<path>--...]` 
e.g.:

```yaml
run: npm publish --workflow packages/my-module
if: ${{ steps.release.outputs['packages/my-module--release_created'] }}
```

## How release please works

Release Please automates CHANGELOG generation, the creation of GitHub releases,
and version bumps for your projects. Release Please does so by parsing your
git history, looking for [Conventional Commit messages](https://www.conventionalcommits.org/),
and creating release PRs.

### What's a Release PR?

Rather than continuously releasing what's landed to your default branch,
release-please maintains Release PRs:

<img width="400" src="/screen.png">

These Release PRs are kept up-to-date as additional work is merged. When you're
ready to tag a release, simply merge the release PR.

### How should I write my commits?

Release Please assumes you are using [Conventional Commit messages](https://www.conventionalcommits.org/).

The most important prefixes you should have in mind are:

- `fix:` which represents bug fixes, and correlates to a [SemVer](https://semver.org/)
  patch.
- `feat:` which represents a new feature, and correlates to a SemVer minor.
- `feat!:`, or `fix!:`, `refactor!:`, etc., which represent a breaking change
  (indicated by the `!`) and will result in a SemVer major.

### Supporting multiple release branches

`release-please` has the ability to target not default branches. You can even use separate release strategies (`release-type`).
To configure, simply configure multiple workflows that specify a different `target-branch`:

Configuration for `main` (default) branch (`.github/workflows/release-main.yaml`):

```yaml
on:
  push:
    branches:
      - main
      - 1.x
name: release-please
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
          # The short ref name of the branch or tag that triggered
          #  the workflow run. For example, `main` or `1.x`
          target-branch: ${{ github.ref_name }}
```

## Automating publication to npm

With a few additions, the Release Please action can be made to publish to
npm when a Release PR is merged:

```yaml
on:
  push:
    branches:
      - main
name: release-please
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          release-type: node
      # The logic below handles the npm publication:
      - uses: actions/checkout@v4
        # these if statements ensure that a publication only occurs when
        # a new release is created:
        if: ${{ steps.release.outputs.release_created }}
      - uses: actions/setup-node@v4
        with:
          node-version: 12
          registry-url: 'https://registry.npmjs.org'
        if: ${{ steps.release.outputs.release_created }}
      - run: npm ci
        if: ${{ steps.release.outputs.release_created }}
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
        if: ${{ steps.release.outputs.release_created }}
```

> So that you can keep 2FA enabled for npm publications, we recommend setting
> `registry-url` to your own [Wombat Dressing Room](https://github.com/GoogleCloudPlatform/wombat-dressing-room) deployment.

## Creating major/minor tags

If you are using release-please to publish a GitHub action, you will
likely want to tag a major and minor tag during a release, i.e., if you
are releasing `v2.8.3`, you will also want to update tags `v2` and `v2.8`. This allows your
users to pin to `v2`, and get updates to your library without updating their
workflows.

The `release-please-action` has the outputs `major`, `minor`, and
`release_created` to facilitate this. These outputs can be used conditionally,
like so:

```yaml
on:
  push:
    branches:
      - main
name: release-please
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          release-type: node
      - uses: actions/checkout@v4
      - name: tag major and minor versions
        if: ${{ steps.release.outputs.release_created }}
        run: |
          git config user.name github-actions[bot]
          git config user.email 41898282+github-actions[bot]@users.noreply.github.com
          git remote add gh-token "https://${{ secrets.GITHUB_TOKEN }}@github.com/googleapis/release-please-action.git"
          git tag -d v${{ steps.release.outputs.major }} || true
          git tag -d v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }} || true
          git push origin :v${{ steps.release.outputs.major }} || true
          git push origin :v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }} || true
          git tag -a v${{ steps.release.outputs.major }} -m "Release v${{ steps.release.outputs.major }}"
          git tag -a v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }} -m "Release v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}"
          git push origin v${{ steps.release.outputs.major }}
          git push origin v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}
```

## Attaching files to the GitHub release

You can attach additional files, such as release artifacts, to the GitHub release that is created. The `gh` CLI tool, which is installed on all runners, can be used for this.

This example uses the `gh` tool to attach the file `./artifact/some-build-artifact.zip`:

```yaml
on:
  push:
    branches:
      - main
name: release-please
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          release-type: node
      - name: Upload Release Artifact
        if: ${{ steps.release.outputs.release_created }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh release upload ${{ steps.release.outputs.tag_name }} ./artifact/some-build-artifact.zip
```

## Upgrading from v3 to v4

### Command

If you were setting the `command` option, you will likely need to modify your configuration.

| Command          | New Configuration                                                | Description                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `github-release` | `skip-github-pull-request: true`                                 | This command was used for only tagging releases. Now we tell release-please to skip opening release PRs.                                      |
| `release-pr`     | `skip-github-release: true`                                      | This command was used for only opening release PRs. Now we tell release-please to skip tagging releases.                                     |
| `manifest`       | do not set `release-type` option                                 | This command told release-please to use a manifest config file. This is now the default behavior unless you explicitly set a `release-type`. |
| `manifest-pr`    | `skip-github-release: true` and do not set `release-type` option | This command told release-please to use a manifest config file and only open the pull reuqest.                                               |

### Package options

If you were previously configuring advanced options via GitHub action inputs, you
will need to configure via the release-please manifest configuration instead. Below,
you can see a mapping of the old option to the new option:

| Old Option                         | New Option                                                                            | Notes                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `path`                             | `$.packages`                                                                          | The root `packages` field is an object where the key is the `path` being configured |
| `changelog-path`                   | `$.packages[path].changelog-path`                                                     | Package-only option                                                                 |
| `component`                        | `$.packages[path].component`                                                          | Package-only option                                                                 |
| `package-name`                     | `$.packages[path].package-name`                                                       | Package-only option                                                                 |
| `always-link-local`                | `$.always-link-local`                                                                 | Root-only option                                                                    |
| `bootstrap-sha`                    | `$.bootstrap-sha`                                                                     | Root-only option                                                                    |
| `commit-search-depth`              | `$.commit-search-depth`                                                               | Root-only option                                                                    |
| `group-pull-request-title-pattern` | `$.group-pull-request-title-pattern`                                                  | Root-only option                                                                    |
| `last-release-sha`                 | `$.last-release-sha`                                                                  | Root-only option                                                                    |
| `plugins`                          | `$.plugins`                                                                           | Root-only option                                                                    |
| `release-search-depth`             | `$.release-search-depth`                                                              | Root-only option                                                                    |
| `sequential-calls`                 | `$.sequential-calls`                                                                  | Root-only option                                                                    |
| `skip-labeling`                    | `$.skip-labeling`                                                                     | Root-only option                                                                    |
| `signoff`                          | `$.signoff`                                                                           | Root-only option                                                                    |
| `bump-minor-pre-major`             | `$.bump-minor-pre-major` or `$.packages[path].bump-minor-pre-major`                   | Root or per-package option                                                          |
| `bump-patch-for-minor-pre-major`   | `$.bump-path-for-minor-pre-major` or `$.packages[path].bump-path-for-minor-pre-major` | Root or per-package option                                                          |
| `changelog-host`                   | `$.changelog-host` or `$.packages[path].changelog-host`                               | Root or per-package option                                                          |
| `changelog-notes-type`             | `$.changelog-type` or `$.packages[path].changelog-type`                               | Root or per-package option                                                          |
| `changelog-types`                  | `$.changelog-sections` or `$.packages[path].changelog-sections`                       | Root or per-package option                                                          |
| `extra-files`                      | `$.extra-files` or `$.packages[path].extra-files`                                     | Root or per-package option                                                          |
| `include-v-in-tag`                 | `$.include-v-in-tag` or `$.packages[path].include-v-in-tag`                           | Root or per-package option                                                          |
| `labels`                           | `$.label` or `$.packages[path].label`                                                 | Root or per-package option                                                          |
| `monorepo-tags`                    | `$.include-component-in-tag` or `$.packages[path].include-component-in-tag`           | Root or per-package option                                                          |
| `prerelease`                       | `$.prerelease` or `$.packages[path].prerelease`                                       | Root or per-package option                                                          |
| `pull-request-header`              | `$.pull-request-header` or `$.packages[path].pull-request-header`                     | Root or per-package option                                                          |
| `pull-request-title-pattern`       | `$.pull-request-title-pattern` or `$.packages[path].pull-request-title-pattern`       | Root or per-package option                                                          |
| `release-as`                       | `$.release-as` or `$.packages[path].release-as`                                       | Root or per-package option                                                          |
| `release-labels`                   | `$.release-label` or `$.packages[path].release-label`                                 | Root or per-package option                                                          |
| `release-type`                     | `$.release-type` or `$.packages[path].release-type`                                   | Root or per-package option                                                          |
| `separate-pull-requests`           | `$.separate-pull-requests` or `$.packages[path].separate-pull-requests`               | Root or per-package option                                                          |
| `skip-github-release`              | `$.skip-github-release` or `$.packages[path].skip-github-release`                     | Root or per-package option                                                          |
| `snapshot-labels`                  | `$.snapshot-label` or `$.packages[path].snapshot-label`                               | Root or per-package option                                                          |
| `tag-separator`                    | `$.tag-separator` or `$.packages[path].tag-separator`                                 | Root or per-package option                                                          |
| `version-file`                     | `$.version-file` or `$.packages[path].version-file`                                   | Root or per-package option                                                          |
| `versioning-strategy`              | `$.versioning` or `$.packages[path].versioning`                                       | Root or per-package option                                                          |

## License

Apache Version 2.0
