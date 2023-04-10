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

function getGitHubInput () {
  return {
    fork: getOptionalBooleanInput('fork'),
    defaultBranch: core.getInput('default-branch') || undefined,
    repoUrl: core.getInput('repo-url') || process.env.GITHUB_REPOSITORY,
    apiUrl: core.getInput('github-api-url') || GITHUB_API_URL,
    graphqlUrl: (core.getInput('github-graphql-url') || '').replace(/\/graphql$/, '') || GITHUB_GRAPHQL_URL,
    useGraphql: getOptionalBooleanInput('use-graphql'),
    token: core.getInput('token', { required: true }),
    proxyServer: core.getInput('proxy-server') || undefined
  }
}

function getOptionalBooleanInput (name) {
  if (core.getInput(name) === '') {
    return undefined
  }
  return core.getBooleanInput(name)
}

function getOptionalMultilineInput (name) {
  if (core.getInput(name) === '') {
    return undefined
  }
  return core.getMultilineInput(name)
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
  let manifest = await Manifest.fromManifest(
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
  outputPRs(await manifest.createPullRequests())
  if (command !== 'manifest-pr') {
    manifest = await Manifest.fromManifest(
      github,
      github.repository.defaultBranch,
      manifestOpts.configFile,
      manifestOpts.manifestFile,
      {
        signoff,
        fork
      }
    )
    outputReleases(await manifest.createReleases())
  }
}

async function main () {
  const command = core.getInput('command') || undefined
  if (MANIFEST_COMMANDS.includes(command)) {
    return await runManifest(command)
  }
  const github = await getGitHubInstance()

  // First we check for any merged release PRs (PRs merged with the label
  // "autorelease: pending"):
  if (!command || command === GITHUB_RELEASE_COMMAND) {
    const manifest = await manifestInstance(github)
    outputReleases(await manifest.createReleases())
  }

  // Next we check for PRs merged since the last release, and groom the
  // release PR:
  if (!command || command === GITHUB_RELEASE_PR_COMMAND) {
    const manifest = await manifestInstance(github)
    outputPRs(await manifest.createPullRequests())
  }
}

const releasePlease = {
  main
}

function getGitHubInstance () {
  const { token, defaultBranch, apiUrl, graphqlUrl, repoUrl, proxyServer } = getGitHubInput()
  const [owner, repo] = repoUrl.split('/')

  let proxy
  if (proxyServer) {
    const [host, port] = proxyServer.split(':')
    proxy = { host, port }
  }
  const githubCreateOpts = {
    proxy,
    owner,
    repo,
    apiUrl,
    graphqlUrl,
    token,
    useGraphql,
  }
  if (defaultBranch) githubCreateOpts.defaultBranch = defaultBranch
  return GitHub.create(githubCreateOpts)
}

async function manifestInstance (github) {
  const { fork } = getGitHubInput()
  const bumpMinorPreMajor = getOptionalBooleanInput('bump-minor-pre-major')
  const bumpPatchForMinorPreMajor = getOptionalBooleanInput('bump-patch-for-minor-pre-major')
  const monorepoTags = getOptionalBooleanInput('monorepo-tags')
  const packageName = core.getInput('package-name') || undefined
  const path = core.getInput('path') || undefined
  const releaseType = core.getInput('release-type', { required: true })
  const changelogPath = core.getInput('changelog-path') || undefined
  const changelogHost = core.getInput('changelog-host') || undefined
  const changelogTypes = core.getInput('changelog-types') || undefined
  const changelogSections = changelogTypes && JSON.parse(changelogTypes)
  const versionFile = core.getInput('version-file') || undefined
  const extraFiles = core.getMultilineInput('extra-files') || undefined
  const pullRequestTitlePattern = core.getInput('pull-request-title-pattern') || undefined
  const pullRequestHeader = core.getInput('pull-request-header') || undefined
  const draft = getOptionalBooleanInput('draft')
  const draftPullRequest = getOptionalBooleanInput('draft-pull-request')
  const changelogType = core.getInput('changelog-notes-type') || undefined
  const versioning = core.getInput('versioning-strategy') || undefined
  const releaseAs = core.getInput('release-as') || undefined
  const skipGithubRelease = getOptionalBooleanInput('skip-github-release')
  const prerelease = getOptionalBooleanInput('prerelease')
  const component = core.getInput('component') || undefined
  const includeVInTag = getOptionalBooleanInput('include-v-in-tag')
  const tagSeparator = core.getInput('tag-separator') || undefined
  const snapshotLabels = getOptionalMultilineInput('snapshot-labels')
  const bootstrapSha = core.getInput('bootstrap-sha') || undefined
  const lastReleaseSha = core.getInput('last-release-sha') || undefined
  const alwaysLinkLocal = getOptionalBooleanInput('always-link-local')
  const separatePullRequests = getOptionalBooleanInput('separate-pull-requests')
  const plugins = core.getMultilineInput('plugins') || undefined
  const labels = core.getInput('labels') ? core.getMultilineInput('labels') : undefined
  const releaseLabels = getOptionalMultilineInput('release-labels')
  const skipLabeling = getOptionalBooleanInput('skip-labeling')
  const sequentialCalls = getOptionalBooleanInput('sequential-calls')
  const groupPullRequestTitlePattern = core.getInput('group-pull-request-title-pattern') || undefined
  const releaseSearchDepth = core.getInput('release-search-depth') || undefined
  const commitSearchDepth = core.getInput('commit-search-depth') || undefined
  return await Manifest.fromConfig(
    github,
    github.repository.defaultBranch,
    {
      bumpMinorPreMajor,
      bumpPatchForMinorPreMajor,
      packageName,
      releaseType,
      changelogPath,
      changelogHost,
      changelogSections,
      versionFile,
      extraFiles,
      includeComponentInTag: monorepoTags,
      pullRequestTitlePattern,
      pullRequestHeader,
      draftPullRequest,
      versioning,
      releaseAs,
      skipGithubRelease,
      draft,
      prerelease,
      component,
      includeVInTag,
      tagSeparator,
      changelogType,
      snapshotLabels
    },
    {
      draft,
      signoff,
      fork,
      draftPullRequest,
      bootstrapSha,
      lastReleaseSha,
      alwaysLinkLocal,
      separatePullRequests,
      plugins,
      labels,
      releaseLabels,
      snapshotLabels,
      skipLabeling,
      sequentialCalls,
      prerelease,
      groupPullRequestTitlePattern,
      releaseSearchDepth,
      commitSearchDepth
    },
    path
  )
}

function outputReleases (releases) {
  releases = releases.filter(release => release !== undefined)
  const pathsReleased = []
  if (releases.length) {
    core.setOutput('releases_created', true)
    for (const release of releases) {
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
      for (let [key, val] of Object.entries(release)) {
        // Historically tagName was output as tag_name, keep this
        // consistent to avoid breaking change:
        if (key === 'tagName') key = 'tag_name'
        if (key === 'uploadUrl') key = 'upload_url'
        if (key === 'notes') key = 'body'
        if (key === 'url') key = 'html_url'
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

function outputPRs (prs) {
  prs = prs.filter(pr => pr !== undefined)
  if (prs.length) {
    core.setOutput('pr', prs[0])
    core.setOutput('prs', JSON.stringify(prs))
  }
}

/* c8 ignore next 4 */
if (require.main === module) {
  main().catch(err => {
    core.setFailed(`release-please failed: ${err.message}`)
  })
} else {
  module.exports = releasePlease
}
