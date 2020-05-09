const core = require('@actions/core')
const { ReleasePRFactory } = require('release-please/build/src/release-pr-factory')

const RELEASE_LABEL = 'autorelease: pending'

const action = core.getInput('action')

async function main () {
  const token = core.getInput('token')
  const releaseType = core.getInput('release-type')
  const name = core.getInput('name')

  switch (action) {
    case 'update-pr': {
      const release = ReleasePRFactory.build(releaseType, {
        packageName: name || 'unknown',
        apiUrl: 'https://api.github.com',
        repoUrl: process.env.GITHUB_REPOSITORY,
        token: token,
        label: RELEASE_LABEL
      })
      await release.run()
      break
    }
    default:
      core.setFailed(`unknown action, ${action}, should be "update-pr", or "create-release".`)
      break
  }
}

main().catch(err => {
  core.setFailed(`release-please failed to ${action} (${err.message})`)
})
