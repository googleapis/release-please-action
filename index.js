const core = require('@actions/core')
const { GitHub } = require('release-please/build/src/github')
const { Manifest } = require('release-please/build/src/manifest')

const CONFIG_FILE = 'release-please-config.json'
const MANIFEST_FILE = '.release-please-manifest.json'
const MANIFEST_COMMANDS = ['manifest', 'manifest-pr']
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
  // Create the Manifest and GitHub instance from
  // argument provided to GitHub action:
  const { fork } = getGitHubInput()
  const manifestOpts = getManifestInput()
  const github = await getGitHubInstance()
  const manifest = await Manifest.fromManifest(
    github,
    github.repository.defaultBranch,
    manifestOpts.configFile,
    manifestOpts.manifestFile,
    {
      signoff,
      fork
    }
  )
  // Create or update release PRs:
  const pr = await manifest.createPullRequests()
  if (pr.length) {
    core.setOutput('pr', pr[0])
    core.setOutput('prs', JSON.stringify(pr))
  }
  if (command === 'manifest-pr') return

  outputReleases(await manifest.createReleases())
}

async function main () {
  const command = core.getInput('command') || undefined
  if (MANIFEST_COMMANDS.includes(command)) {
    return await runManifest(command)
  }

  const { fork } = getGitHubInput()
  const bumpMinorPreMajor = getBooleanInput('bump-minor-pre-major')
  const bumpPatchForMinorPreMajor = getBooleanInput('bump-patch-for-minor-pre-major')
  const packageName = core.getInput('package-name')
  const path = core.getInput('path') || undefined
  const releaseType = core.getInput('release-type', { required: true })
  const changelogPath = core.getInput('changelog-path') || undefined
  const changelogTypes = core.getInput('changelog-types') || undefined
  const changelogSections = changelogTypes && JSON.parse(changelogTypes)
  const versionFile = core.getInput('version-file') || undefined
  const github = await getGitHubInstance()
  const manifest = await Manifest.fromConfig(
    github,
    github.repository.defaultBranch,
    {
      bumpMinorPreMajor,
      bumpPatchForMinorPreMajor,
      packageName,
      releaseType,
      changelogPath,
      changelogSections,
      versionFile
    },
    {
      signoff,
      fork
    },
    path
  )

  // First we check for any merged release PRs (PRs merged with the label
  // "autorelease: pending"):
  if (!command || command === GITHUB_RELEASE_COMMAND) {
    outputReleases(await manifest.createReleases())
  }

  // Next we check for PRs merged since the last release, and groom the
  // release PR:
  if (!command || command === GITHUB_RELEASE_PR_COMMAND) {
    const pr = await manifest.createPullRequests()
    if (pr.length) {
      core.setOutput('pr', pr[0])
      core.setOutput('prs', JSON.stringify(pr))
    }
  }
}

const releasePlease = {
  main,
  getBooleanInput
}

function getGitHubInstance () {
  const { token, defaultBranch, apiUrl, graphqlUrl, repoUrl } = getGitHubInput()
  const [owner, repo] = repoUrl.split('/')
  const githubCreateOpts = {
    owner,
    repo,
    apiUrl,
    graphqlUrl,
    token
  }
  if (defaultBranch) githubCreateOpts.defaultBranch = defaultBranch
  return GitHub.create(githubCreateOpts)
}

function outputReleases (releases) {
  const pathsReleased = []
  if (releases.length) {
    core.setOutput('releases_created', true)
    for (const release of releases) {
      if (!release) {
        continue
      }
      const path = release.path || '.'
      if (path) {
        pathsReleased.push(path)
        // If the special root release is set (representing project root)
        // and this is explicitly a manifest release, set the release_created boolean.
        if (path === '.') {
          core.setOutput('release_created', true)
        } else {
          core.setOutput(`${path}--release_created`, true)
        }
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

/* c8 ignore next 4 */
if (require.main === module) {
  main().catch(err => {
    core.setFailed(`release-please failed: ${err.message}`)
  })
} else {
  module.exports = releasePlease
}
