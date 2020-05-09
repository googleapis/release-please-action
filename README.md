# Release Please Action

Automate releases based on Conventional Commit Messages.

## How release please works

### How should I write my commits?

### What's a release PR?

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

## License

Apache Version 2.0
