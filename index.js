const core = require('@actions/core')
const { factory } = require('release-please/build/src')

const CONFIG_FILE = 'release-please-config.json'
const MANIFEST_FILE = '.release-please-manifest.json'
const MANIFEST_COMMANDS = ['manifest', 'manifest-pr']
const RELEASE_LABEL = 'autorelease: pending'
const GITHUB_RELEASE_COMMAND = 'github-release'
const GITHUB_RELEASE_PR_COMMAND = 'release-pr'
const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_GRAPHQL_URL = 'https://api.github.com'

const signoff = core.getInput('signoff') || undefined

function getBooleanInput (input) {
  const trueValue = ['true', 'True', 'TRUE', 'yes', 'Yes', 'YES', 'y', 'Y', 'on', 'On', 'ON']
  const falseValue = ['false', 'False', 'FALSE', 'no', 'No', 'NO', 'n', 'N', 'off', 'Off', 'OFF']
  const stringInput = core.getInput(input)
  if (trueValue.indexOf(stringInput) > -1) return true
  if (falseValue.indexOf(stringInput) > -1) return false
  throw TypeError(`Wrong boolean value of the input '${input}'`)
}

function getGitHubInput () {
  return {
    fork: getBooleanInput('fork'),
    defaultBranch: core.getInput('default-branch') || undefined,
    repoUrl: core.getInput('repo-url') || process.env.GITHUB_REPOSITORY,
    apiUrl: core.getInput('github-api-url') || GITHUB_API_URL,
    graphqlUrl: core.getInput('github-graphql-url') || GITHUB_GRAPHQL_URL,
    token: core.getInput('token', { required: true })
  }
}

function getManifestInput () {
  return {
    configFile: core.getInput('config-file') || CONFIG_FILE,
    manifestFile: core.getInput('manifest-file') || MANIFEST_FILE,
    signoff
  }
}

async function runManifest (command) {
  const githubOpts = getGitHubInput()
  const manifestOpts = { ...githubOpts, ...getManifestInput() }
  const pr = await factory.runCommand('manifest-pr', manifestOpts)
  if (pr) {
    core.setOutput('pr', pr)
  }
  if (command === 'manifest-pr') return

  const releasesCreated = await factory.runCommand('manifest-release', manifestOpts)
  const pathsReleased = []
  if (releasesCreated) {
    core.setOutput('releases_created', true)
    for (const [path, release] of Object.entries(releasesCreated)) {
      if (!release) {
        continue
      }
      pathsReleased.push(path)
      if (path === '.') {
        core.setOutput('release_created', true)
      } else {
        core.setOutput(`${path}--release_created`, true)
      }
      for (const [key, val] of Object.entries(release)) {
        if (path === '.') {
          core.setOutput(key, val)
        } else {
          core.setOutput(`${path}--${key}`, val)
        }
      }
    }
  }
  // Paths of all releases that were created, so that they can be passed
  // to matrix in next step:
  core.setOutput('paths_released', JSON.stringify(pathsReleased))
}

async function main () {
  const command = core.getInput('command') || undefined
  if (MANIFEST_COMMANDS.includes(command)) {
    return await runManifest(command)
  }

  const { token, fork, defaultBranch, apiUrl, graphqlUrl, repoUrl } = getGitHubInput()

  const bumpMinorPreMajor = getBooleanInput('bump-minor-pre-major')
  const bumpPatchForMinorPreMajor = getBooleanInput('bump-patch-for-minor-pre-major')
  const monorepoTags = getBooleanInput('monorepo-tags')
  const packageName = core.getInput('package-name')
  const path = core.getInput('path') || undefined
  const releaseType = core.getInput('release-type', { required: true })
  const changelogPath = core.getInput('changelog-path') || undefined
  const changelogTypes = core.getInput('changelog-types') || undefined
  const changelogSections = changelogTypes && JSON.parse(changelogTypes)
  const versionFile = core.getInput('version-file') || undefined
  const pullRequestTitlePattern = core.getInput('pull-request-title-pattern') || undefined
  const extraFiles = core.getMultilineInput('extra-files')

  // First we check for any merged release PRs (PRs merged with the label
  // "autorelease: pending"):
  if (!command || command === GITHUB_RELEASE_COMMAND) {
    const releaseCreated = await factory.runCommand(GITHUB_RELEASE_COMMAND, {
      label: RELEASE_LABEL,
      repoUrl,
      packageName,
      path,
      monorepoTags,
      token,
      changelogPath,
      releaseType,
      defaultBranch,
      pullRequestTitlePattern,
      apiUrl,
      graphqlUrl
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
      apiUrl,
      graphqlUrl,
      repoUrl,
      fork,
      token,
      label: RELEASE_LABEL,
      bumpMinorPreMajor,
      bumpPatchForMinorPreMajor,
      changelogPath,
      changelogSections,
      versionFile,
      defaultBranch,
      pullRequestTitlePattern,
      signoff,
      extraFiles
    })

    if (pr) {
      core.setOutput('pr', pr)
    }
  }
}

const releasePlease = {
  main,
  getBooleanInput
}

/* c8 ignore next 4 */
if (require.main === module) {
  main().catch(err => {
    core.setFailed(`release-please failed: ${err.message}`)
  })
} else {
  module.exports = releasePlease
}
