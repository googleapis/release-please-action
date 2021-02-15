const core = require('@actions/core')
const { factory } = require('release-please/build/src')

const RELEASE_LABEL = 'autorelease: pending'
const GITHUB_RELEASE_COMMAND = 'github-release'
const GITHUB_RELEASE_PR_COMMAND = 'release-pr'

async function main () {
  const bumpMinorPreMajor = Boolean(core.getInput('bump-minor-pre-major'))
  const monorepoTags = Boolean(core.getInput('monorepo-tags'))
  const packageName = core.getInput('package-name')
  const path = core.getInput('path') ? core.getInput('path') : undefined
  const releaseType = core.getInput('release-type')
  const token = core.getInput('token')
  const fork = core.getInput('fork') ? true : undefined
  const changelogPath = core.getInput('changelog-path') ? core.getInput('changelog-path') : undefined
  const changelogTypes = core.getInput('changelog-types')
  const command = core.getInput('command') ? core.getInput('command') : undefined
  const versionFile = core.getInput('version-file') ? core.getInput('version-file') : undefined
  const defaultBranch = core.getInput('default-branch') ? core.getInput('default-branch') : undefined

  // Parse the changelogTypes if there are any
  let changelogSections
  if (changelogTypes) {
    changelogSections = JSON.parse(changelogTypes)
  }

  // First we check for any merged release PRs (PRs merged with the label
  // "autorelease: pending"):
  if (!command || command === GITHUB_RELEASE_COMMAND) {
    const releaseCreated = await factory.runCommand(GITHUB_RELEASE_COMMAND, {
      label: RELEASE_LABEL,
      repoUrl: process.env.GITHUB_REPOSITORY,
      packageName,
      path,
      monorepoTags,
      token,
      changelogPath,
      releaseType,
      defaultBranch
    })

    if (releaseCreated) {
      core.setOutput('release_created', true)
      for (const key of Object.keys(releaseCreated)) {
        core.setOutput(key, releaseCreated[key])
      }
    }
  }

  // Next we check for PRs merged since the last release, and groom the
  // release PR:
  if (!command || command === GITHUB_RELEASE_PR_COMMAND) {
    const pr = await factory.runCommand(GITHUB_RELEASE_PR_COMMAND, {
      releaseType,
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
      versionFile,
      defaultBranch
    })

    if (pr) {
      core.setOutput('pr', pr)
    }
  }
}

const releasePlease = {
  main
}

if (require.main === module) {
  main().catch(err => {
    core.setFailed(`release-please failed: ${err.message}`)
  })
} else {
  module.exports = releasePlease
}
