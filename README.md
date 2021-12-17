# Release Please Action

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

Automate releases with Conventional Commit Messages.

## Setting up this action

1. If you haven't already done so, create a `.github/workflows` folder in your
  repository (_this is where your actions will live_).
2. Now create a `.github/workflows/release-please.yml` file with these contents:

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
          - uses: GoogleCloudPlatform/release-please-action@v2
            with:
              release-type: node
              package-name: release-please-action
    ```

3. Merge the above action into your repository and make sure new commits follow
  the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  convention, [release-please](https://github.com/googleapis/release-please)
  will start creating Release PRs for you.
4. For an alternative configuration that provides easier bootstrapping options
  for initial setup, follow [these instructions](https://github.com/googleapis/release-please/blob/master/docs/manifest-releaser.md)
  (ignore the cli section) and then configure this action as follows:

    ```yaml
    #...(same as above)
        steps:
          - uses: GoogleCloudPlatform/release-please-action@v2
            with:
              command: manifest
    ```

## Configuration

| input | description |
|:---:|---|
| `token` | A GitHub secret token, the action defaults to using the special `secrets.GITHUB_TOKEN` |
| `release-type` | What type of project is this a release for? Reference [Release types supported](#release-types-supported); new types of releases can be [added here](https://github.com/googleapis/release-please/tree/master/src/releasers) |
| `package-name` | A name for the artifact releases are being created for (this might be the `name` field in a `setup.py` or `package.json`) |
| `bump-minor-pre-major` | Should breaking changes before 1.0.0 produce minor bumps?  Default `No` |
| `bump-patch-for-minor-pre-major` | Should feat changes before 1.0.0 produce patch bumps instead of minor bumps?  Default `No` |
| `path`          | create a release from a path other than the repository's root |
| `monorepo-tags` | add prefix to tags and branches, allowing multiple libraries to be released from the same repository. |
| `changelog-types` | A JSON formatted String containing to override the outputted changelog sections |
| `version-file` | provide a path to a version file to increment (used by ruby releaser) |
| `fork`          | Should the PR be created from a fork. Default `false`|
| `command`          | release-please command to run, either `github-release`, or `release-pr`, `manifest`, `manifest-pr` (_defaults to running both_) |
| `default-branch`  | branch to open pull release PR against (detected by default) |
| `pull-request-title-pattern`  | title pattern used to make release PR, defaults to using `chore${scope}: release${component} ${version}`. |
| `changelog-path` | configure alternate path for `CHANGELOG.md`. Default `CHANGELOG.md` |
| `github-api-url` | configure github API URL. Default `https://api.github.com` |
| `--signoff` | Add [`Signed-off-by`](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---signoff) line at the end of the commit log message using the user and email provided. (format "Name \<email@example.com\>") |
| `repo-url` | configure github repository URL. Default `process.env.GITHUB_REPOSITORY` |
| `github-graphql-url` | configure github GraphQL URL. Default `https://api.github.com` |
| `extra-files` | Multiline input to claim extra files to bump. |

| output | description |
|:---:|---|
| `release_created` | `true` if the release was created, `false` otherwise |
| `upload_url` | Directly related to [**Create a release**](https://developer.github.com/v3/repos/releases/#response-4) API |
| `html_url` | Directly related to [**Create a release**](https://developer.github.com/v3/repos/releases/#response-4) API |
| `tag_name` | Directly related to [**Create a release**](https://developer.github.com/v3/repos/releases/#response-4) API |
| `major` | Number representing major semver value |
| `minor` | Number representing minor semver value |
| `patch` | Number representing patch semver value |
| `sha` | sha that a GitHub release was tagged at |
| `pr` | The PR number of an opened release (undefined if no release created) |

### Release types supported

Release Please automates releases for the following flavors of repositories:

| release type | description |
|:---:|---|
| `node` | [A Node.js repository, with a package.json and CHANGELOG.md](https://github.com/yargs/yargs) |
| `python` | [A Python repository, with a setup.py, setup.cfg, version.py and CHANGELOG.md](https://github.com/googleapis/python-storage) |
| `php` | [A php composer package with composer.json and CHANGELOG.md](https://github.com/setnemo/asterisk-notation)
| `ruby` | [A Ruby repository, with version.rb and CHANGELOG.md](https://github.com/google/google-id-token) |
| `terraform-module` | [A terraform module, with a version in the README.md, and a CHANGELOG.md](https://github.com/terraform-google-modules/terraform-google-project-factory) |
| rust              | A Rust repository, with a Cargo.toml (either as a crate or workspace) and a CHANGELOG.md |
| ocaml             | [An OCaml repository, containing 1 or more opam or esy files and a CHANGELOG.md](https://github.com/grain-lang/binaryen.ml) |
| go | Go repository, with a CHANGELOG.md |
| `simple` | [A repository with a version.txt and a CHANGELOG.md](https://github.com/googleapis/gapic-generator) |
| helm | A helm chart repository with a Chart.yaml and a CHANGELOG.md |
| elixir | An elixir repository with a mix.exs and a CHANGELOG.md |

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

* `fix:` which represents bug fixes, and correlates to a [SemVer](https://semver.org/)
  patch.
* `feat:` which represents a new feature, and correlates to a SemVer minor.
* `feat!:`,  or `fix!:`, `refactor!:`, etc., which represent a breaking change
  (indicated by the `!`) and will result in a SemVer major.

### Overriding the Changelog Sections

To output more commit information in the changelog,  a JSON formatted String can be added to the Action using the `changelog-types` input parameter.  This could look something like this:

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
      - uses: GoogleCloudPlatform/release-please-action@v2
        with:
          release-type: node
          package-name: release-please-action
          changelog-types: '[{"type":"feat","section":"Features","hidden":false},{"type":"fix","section":"Bug Fixes","hidden":false},{"type":"chore","section":"Miscellaneous","hidden":false}]'
```

### Supporting multiple release branches

`release-please` has the ability to target not default branches. You can even use separate release strategies (`release-type`).
To configure, simply configure multiple workflows that specify a different `default-branch`:

Configuration for `main` (default) branch (`.github/workflows/release-main.yaml`):
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
      - uses: GoogleCloudPlatform/release-please-action@v2
        with:
          release-type: node
          package-name: release-please-action
```

Configuration for `1.x` (default) branch (`.github/workflows/release-1.x.yaml`):
```yaml
on:
  push:
    branches:
      - 1.x
name: release-please
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: GoogleCloudPlatform/release-please-action@v2
        with:
          release-type: node
          package-name: release-please-action
          default-branch: 1.x
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
      - uses: GoogleCloudPlatform/release-please-action@v2
        id: release
        with:
          release-type: node
          package-name: test-release-please
      # The logic below handles the npm publication:
      - uses: actions/checkout@v2
        # these if statements ensure that a publication only occurs when
        # a new release is created:
        if: ${{ steps.release.outputs.release_created }}
      - uses: actions/setup-node@v1
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
`registry-url` to your own [Wombat Dressing Room](https://github.com/GoogleCloudPlatform/wombat-dressing-room) deployment.

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
      - uses: GoogleCloudPlatform/release-please-action@v2
        id: release
        with:
          release-type: node
          package-name: ${{env.ACTION_NAME}}
          command: github-release
      - uses: actions/checkout@v2
      - name: tag major and minor versions
        if: ${{ steps.release.outputs.release_created }}
        run: |
          git config user.name github-actions[bot]
          git config user.email 41898282+github-actions[bot]@users.noreply.github.com
          git remote add gh-token "https://${{ secrets.GITHUB_TOKEN }}@github.com/google-github-actions/release-please-action.git"
          git tag -d v${{ steps.release.outputs.major }} || true
          git tag -d v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }} || true
          git push origin :v${{ steps.release.outputs.major }} || true
          git push origin :v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }} || true
          git tag -a v${{ steps.release.outputs.major }} -m "Release v${{ steps.release.outputs.major }}"
          git tag -a v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }} -m "Release v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}"
          git push origin v${{ steps.release.outputs.major }}
          git push origin v${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}
```

## License

Apache Version 2.0
