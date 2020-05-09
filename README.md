# Release Please Action

Automate releases with Conventional Commit Messages.

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

The most important prefixes you should havein mind are:

* `fix:` which represents bug fixes, and correlates to a [SemVer](https://semver.org/) 
  patch.
* `feat:` which represents a new feature, and correlates to a SemVer minor.
* `feat!:`,  or `fix!:`, `refactor!:`, etc., which represent a breaking change
  (indicated by the `!`) and will result in a SemVer major.

## Configuring this action

1. If you haven't already done so, create a `.github/workflows` folder in your
  repository (_this is where your actions will live_).
2. Now create a `.github/workflows/release-please.yml` file with these contents:

   ```yaml
    on:
      push:
        branches:
          - master
    name: release-please
    jobs:
      release-please:
        runs-on: ubuntu-latest
        steps:
          - uses: bcoe/release-please-action@9291b92aca4939d0cc2781f26504c638ce1ba534
            with:
              token: ${{ secrets.GITHUB_TOKEN }}
              release-type: node
              package-name: release-please-action
    ```

3. Merge the above action into your repository and make sure new commits follow
  the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  convention, [release-please](https://github.com/googleapis/release-please)
  will start creating Release PRs for you.

## Configuration

| Variable        | Description                                      |
| --------------- | ------------------------------------------------ |
| token           | A GitHub secret token, you will most likely want to use the special secrets.GITHUB_TOKEN |
| release-type    | What type of project is this a release for? Currently we support `node`, `ruby`, `python`, `terraform-module`, new types of releases can be [added here](https://github.com/googleapis/release-please/tree/master/src/releasers) |
| package-name    | A name for the artifact releases are being created for (this might be the `name` field in a `setup.py` or `package.json`) |

## License

Apache Version 2.0
