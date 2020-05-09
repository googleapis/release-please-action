const core = require('@actions/core')
const { GitHubRelease } = require('release-please/build/src/github-release')
const { ReleasePRFactory } = require('release-please/build/src/release-pr-factory')

const RELEASE_LABEL = 'autorelease: pending'

const action = core.getInput('action')

async function main () {
  const token = core.getInput('token')
  const releaseType = core.getInput('release-type')
  const packageName = core.getInput('package-name')

  // First we check for any merged release PRs (PRs merged with the label
  // "autorelease: pending"):
  const gr = new GitHubRelease({
    label: RELEASE_LABEL,
    repoUrl: process.env.GITHUB_REPOSITORY,
    packageName
  })
  await gr.createRelease();

  // Next we check for PRs merged since the last release, and groom the
  // release PR:
  const release = ReleasePRFactory.build(releaseType, {
    packageName: name || 'unknown',
    apiUrl: 'https://api.github.com',
    repoUrl: process.env.GITHUB_REPOSITORY,
    token: token,
    label: RELEASE_LABEL
  })
  await release.run()
}

main().catch(err => {
  core.setFailed(`release-please failed: ${err.message}`)
})
