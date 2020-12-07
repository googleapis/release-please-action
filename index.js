const core = require('@actions/core')
const { GitHubRelease } = require('release-please/build/src/github-release')
const { ReleasePRFactory } = require('release-please/build/src/release-pr-factory')

const RELEASE_LABEL = 'autorelease: pending'

async function main () {
  const bumpMinorPreMajor = Boolean(core.getInput('bump-minor-pre-major'))
  // TODO(bcoe): remove this log line.
  const monorepoTags = Boolean(core.getInput('monorepo-tags'))
  const packageName = core.getInput('package-name')
  const path = core.getInput('path') ? core.getInput('path') : undefined
  const releaseType = core.getInput('release-type')
  const token = core.getInput('token')
  const fork = core.getInput('fork') ? true : undefined
  const changelogTypes = core.getInput('changelog-types')
  const command = core.getInput('command') ? core.getInput('command') : undefined
  const versionFile = core.getInput('version-file') ? core.getInput('version-file') : undefined

  // Parse the changelogTypes if there are any
  let changelogSections
  if (changelogTypes) {
    changelogSections = JSON.parse(changelogTypes)
  }

  // First we check for any merged release PRs (PRs merged with the label
  // "autorelease: pending"):
  if (!command || command === 'github-release') {
    const Release = releasePlease.getGitHubRelease()
    const gr = new Release({
      label: RELEASE_LABEL,
      repoUrl: process.env.GITHUB_REPOSITORY,
      packageName,
      path,
      monorepoTags,
      token
    })
    const releaseCreated = await gr.createRelease()
    if (releaseCreated) {
      core.setOutput('release_created', true)
      for (const key of Object.keys(releaseCreated)) {
        core.setOutput(key, releaseCreated[key])
      }
    }
  }

  // Next we check for PRs merged since the last release, and groom the
  // release PR:
  if (!command || command === 'release-pr') {
    const release = releasePlease.getReleasePRFactory().buildStatic(releaseType, {
      monorepoTags,
      packageName,
      path,
      apiUrl: 'https://api.github.com',
      repoUrl: process.env.GITHUB_REPOSITORY,
      fork,
      token: token,
      label: RELEASE_LABEL,
      bumpMinorPreMajor,
      changelogSections,
      versionFile
    })
    const pr = await release.run()
    if (pr) {
      core.setOutput('pr', pr)
    }
  }
}

function getGitHubRelease () {
  return GitHubRelease
}

function getReleasePRFactory () {
  return ReleasePRFactory
}

const releasePlease = {
  main,
  getGitHubRelease,
  getReleasePRFactory
}

if (require.main === module) {
  main().catch(err => {
    core.setFailed(`release-please failed: ${err.message}`)
  })
} else {
  module.exports = releasePlease
}
