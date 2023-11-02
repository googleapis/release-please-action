// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as core from '@actions/core';
import {GitHub, Manifest} from 'release-please';

const CONFIG_FILE = 'release-please-config.json';
const MANIFEST_FILE = '.release-please-manifest.json';
const MANIFEST_COMMAND = 'manifest';
const MANIFEST_PR_COMMAND = 'manifest-pr';
const MANIFEST_COMMANDS = [MANIFEST_COMMAND, MANIFEST_PR_COMMAND];
const GITHUB_RELEASE_COMMAND = 'github-release';
const GITHUB_RELEASE_PR_COMMAND = 'release-pr';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_GRAPHQL_URL = 'https://api.github.com';

interface Proxy {
  host: string;
  port: number;
}

interface ActionInputs {
  token: string;
  repoUrl: string;
  releaseType: string;
  githubApiUrl: string;
  githubGraphqlUrl: string;
  fork?: boolean;
  clean?: boolean;
  packageName?: string;
  bumpMinorPreMajor?: boolean;
  bumpPatchForMinorPreMajor?: boolean;
  path?: string;
  changelogPath?: string;
  changelogHost?: string;
  command?: string;
  versionFile?: string;
  extraFiles?: string[];
  defaultBranch?: string;
  changelogTypes?: string; // JSON format string
  configFile?: string;
  manifestFile?: string;
  signoff?: string;
  monorepoTags?: boolean;
  pullRequestTitlePattern?: string;
  pullRequestHeader?: string;
  draft?: boolean;
  draftPullRequest?: boolean;
  changelogNotesType?: string;
  versioningStrategy?: string;
  releaseAs?: string;
  skipGitHubRelease?: boolean;
  prerelease?: boolean;
  component?: string;
  includeVInTag?: boolean;
  tagSeparator?: string;
  snapshotLabels?: string[];
  bootstrapSha?: string;
  lastReleaseSha?: string;
  alwaysLinkLocal?: boolean;
  separatePullRequests?: boolean;
  plugins?: string[];
  labels?: string[];
  releaseLabels?: string[];
  skipLabeling?: boolean;
  sequentialCalls?: boolean;
  groupPullRequestTitlePattern?: string;
  releaseSearchDepth?: number;
  commitSearchDepth?: number;
  proxyServer?: string;
}

// TODO: replace this interface is exported from release-please
interface PullRequest {
  readonly headBranchName: string;
  readonly baseBranchName: string;
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly labels: string[];
  readonly files: string[];
  readonly sha?: string;
}
// TODO: replace this interface is exported from release-please
interface CreatedRelease {
  id: number;
  path: string;
  version: string;
  major: number;
  minor: number;
  patch: number;
  name?: string;
  tagName: string;
  sha: string;
  notes?: string;
  url: string;
  draft?: boolean;
  uploadUrl?: string;
}

function parseInputs(): ActionInputs {
  const inputs: ActionInputs = {
    token: core.getInput('token', {required: true}),
    releaseType: core.getInput('release-type', { required: true }),
    repoUrl: core.getInput('repo-url') || process.env.GITHUB_REPOSITORY || '',
    fork: getOptionalBooleanInput('fork'),
    clean: getOptionalBooleanInput('fork'),
    packageName: getOptionalInput('package-name'),
    bumpMinorPreMajor: getOptionalBooleanInput('bump-minor-pre-major'),
    bumpPatchForMinorPreMajor: getOptionalBooleanInput(
      'bump-patch-for-minor-pre-major'
    ),
    path: getOptionalInput('path'),
    changelogPath: getOptionalInput('changelog-path'),
    changelogHost: getOptionalInput('changelog-host'),
    command: getOptionalInput('command'),
    versionFile: getOptionalInput('version-file'),
    extraFiles: getOptionalMultilineInput('extra-files'),
    defaultBranch: getOptionalInput('default-branch'),
    changelogTypes: getOptionalInput('changelog-types'),
    configFile: core.getInput('config-file') || CONFIG_FILE,
    manifestFile: core.getInput('manifest-file') || MANIFEST_FILE,
    signoff: getOptionalInput('signoff'),
    githubApiUrl: core.getInput('github-api-url') || GITHUB_API_URL,
    githubGraphqlUrl:
      (core.getInput('github-graphql-url') || '').replace(/\/graphql$/, '') ||
      GITHUB_GRAPHQL_URL,
    monorepoTags: getOptionalBooleanInput('monorepo-tags'),
    pullRequestTitlePattern: getOptionalInput('pull-request-title-pattern'),
    pullRequestHeader: getOptionalInput('pull-request-header'),
    draft: getOptionalBooleanInput('draft'),
    draftPullRequest: getOptionalBooleanInput('draft-pull-request'),
    changelogNotesType: getOptionalInput('changelog-notes-type'),
    versioningStrategy: getOptionalInput('versioning-strategy'),
    releaseAs: getOptionalInput('release-as'),
    skipGitHubRelease: getOptionalBooleanInput('skip-github-release'),
    prerelease: getOptionalBooleanInput('prerelease'),
    component: getOptionalInput('component'),
    includeVInTag: getOptionalBooleanInput('include-v-in-tag'),
    tagSeparator: getOptionalInput('tag-separator'),
    snapshotLabels: getOptionalMultilineInput('snapshot-labels'),
    bootstrapSha: getOptionalInput('bootstrap-sha'),
    lastReleaseSha: getOptionalInput('last-release-sha'),
    alwaysLinkLocal: getOptionalBooleanInput('always-link-local'),
    separatePullRequests: getOptionalBooleanInput('separate-pull-requests'),
    plugins: getOptionalMultilineInput('plugins'),
    labels: getOptionalMultilineInput('labels'),
    releaseLabels: getOptionalMultilineInput('release-labels'),
    skipLabeling: getOptionalBooleanInput('skip-labeling'),
    sequentialCalls: getOptionalBooleanInput('sequential-calls'),
    groupPullRequestTitlePattern: getOptionalInput(
      'group-pull-request-title-pattern'
    ),
    releaseSearchDepth: getOptionalNumberInput('release-search-depth'),
    commitSearchDepth: getOptionalNumberInput('commit-search-depth'),
    proxyServer: getOptionalInput('proxy-server'),
  };
  return inputs;
}

function getOptionalInput(name: string): string | undefined {
  return core.getInput(name) || undefined;
}

function getOptionalBooleanInput(name: string): boolean | undefined {
  if (core.getInput(name) === '') {
    return undefined;
  }
  return core.getBooleanInput(name);
}

function getOptionalMultilineInput(name: string): string[] | undefined {
  if (core.getInput(name) === '') {
    return undefined;
  }
  return core.getMultilineInput(name);
}

function getOptionalNumberInput(name: string): number | undefined {
  const value = core.getInput(name);
  if (value) {
    return parseInt(value);
  }
  return undefined;
}

async function loadManifest(
  github: GitHub,
  inputs: ActionInputs
): Promise<Manifest> {
  return await Manifest.fromManifest(
    github,
    github.repository.defaultBranch,
    inputs.configFile,
    inputs.manifestFile,
    {
      signoff: inputs.signoff,
      fork: inputs.fork,
    }
  );
}

function shouldTagReleases(command?: string): boolean {
  // by default, we do tag releases
  if (!command) {
    return true;
  }
  return command === GITHUB_RELEASE_COMMAND || command === MANIFEST_COMMAND;
}

function shouldOpenPrs(command?: string): boolean {
  // by default, we do open release PRs
  if (!command) {
    return true;
  }
  //
  return command !== GITHUB_RELEASE_COMMAND;
}

function loadOrBuildManifest(
  github: GitHub,
  inputs: ActionInputs
): Promise<Manifest> {
  const command = inputs.command;

  if (command && MANIFEST_COMMANDS.includes(command)) {
    return loadManifest(github, inputs);
  }
  return buildManifest(github, inputs);
}

async function main() {
  const inputs = parseInputs();
  const command = inputs.command;
  const github = await getGitHubInstance(inputs);
  const tagReleases = shouldTagReleases(command);
  const openReleasePRs = shouldOpenPrs(command);

  if (tagReleases) {
    const manifest = await loadOrBuildManifest(github, inputs);
    outputReleases(await manifest.createReleases());
  }

  if (openReleasePRs) {
    const manifest = await loadOrBuildManifest(github, inputs);
    outputPRs(await manifest.createPullRequests());
  }
}

const releasePlease = {
  main,
};

function getGitHubInstance(inputs: ActionInputs): Promise<GitHub> {
  const [owner, repo] = inputs.repoUrl.split('/');
  let proxy: Proxy | undefined = undefined;
  if (inputs.proxyServer) {
    const [host, port] = inputs.proxyServer.split(':');
    proxy = {
      host,
      port: parseInt(port),
    };
  }

  const githubCreateOpts = {
    proxy,
    owner,
    repo,
    apiUrl: inputs.githubApiUrl,
    graphqlUrl: inputs.githubGraphqlUrl,
    token: inputs.token,
    defaultBranch: inputs.defaultBranch,
  };
  return GitHub.create(githubCreateOpts);
}

async function buildManifest(
  github: GitHub,
  inputs: ActionInputs
): Promise<Manifest> {
  return await Manifest.fromConfig(
    github,
    github.repository.defaultBranch,
    {
      bumpMinorPreMajor: inputs.bumpMinorPreMajor,
      bumpPatchForMinorPreMajor: inputs.bumpPatchForMinorPreMajor,
      packageName: inputs.packageName,
      releaseType: inputs.releaseType,
      changelogPath: inputs.changelogPath,
      changelogHost: inputs.changelogHost,
      changelogSections: inputs.changelogTypes
        ? JSON.parse(inputs.changelogTypes)
        : undefined,
      versionFile: inputs.versionFile,
      extraFiles: inputs.extraFiles,
      includeComponentInTag: inputs.monorepoTags,
      pullRequestTitlePattern: inputs.pullRequestTitlePattern,
      pullRequestHeader: inputs.pullRequestHeader,
      draftPullRequest: inputs.draftPullRequest,
      versioning: inputs.versioningStrategy,
      releaseAs: inputs.releaseAs,
      skipGithubRelease: inputs.skipGitHubRelease,
      draft: inputs.draft,
      prerelease: inputs.prerelease,
      component: inputs.component,
      includeVInTag: inputs.includeVInTag,
      tagSeparator: inputs.tagSeparator,
      changelogType: inputs.changelogNotesType,
      snapshotLabels: inputs.snapshotLabels,
    },
    {
      draft: inputs.draft,
      signoff: inputs.signoff,
      fork: inputs.fork,
      draftPullRequest: inputs.draftPullRequest,
      bootstrapSha: inputs.bootstrapSha,
      lastReleaseSha: inputs.lastReleaseSha,
      alwaysLinkLocal: inputs.alwaysLinkLocal,
      separatePullRequests: inputs.separatePullRequests,
      plugins: inputs.plugins,
      labels: inputs.labels,
      releaseLabels: inputs.releaseLabels,
      snapshotLabels: inputs.snapshotLabels,
      skipLabeling: inputs.skipLabeling,
      sequentialCalls: inputs.sequentialCalls,
      prerelease: inputs.prerelease,
      groupPullRequestTitlePattern: inputs.groupPullRequestTitlePattern,
      releaseSearchDepth: inputs.releaseSearchDepth,
      commitSearchDepth: inputs.commitSearchDepth,
    },
    inputs.path
  );
}

function setPathOutput(path: string, key: string, value: string | boolean) {
  if (path === '.') {
    core.setOutput(key, value);
  } else {
    core.setOutput(`${path}--${key}`, value);
  }
}

function outputReleases(releases: (CreatedRelease | undefined)[]) {
  releases = releases.filter(release => release !== undefined);
  const pathsReleased = [];
  if (releases.length) {
    core.setOutput('releases_created', true);
    for (const release of releases) {
      if (!release) {
        continue;
      }
      const path = release.path || '.';
      if (path) {
        pathsReleased.push(path);
        // If the special root release is set (representing project root)
        // and this is explicitly a manifest release, set the release_created boolean.
        setPathOutput(path, 'release_created', true);
      }
      if (release.tagName) {
        setPathOutput(path, 'tag_name', release.tagName);
      }
      if (release.uploadUrl) {
        setPathOutput(path, 'upload_url', release.uploadUrl);
      }
      if (release.notes) {
        setPathOutput(path, 'body', release.notes);
      }
      if (release.url) {
        setPathOutput(path, 'html_url', release.url);
      }
    }
  }
  // Paths of all releases that were created, so that they can be passed
  // to matrix in next step:
  core.setOutput('paths_released', JSON.stringify(pathsReleased));
}

function outputPRs(prs: (PullRequest | undefined)[]) {
  prs = prs.filter(pr => pr !== undefined);
  if (prs.length) {
    core.setOutput('pr', prs[0]);
    core.setOutput('prs', JSON.stringify(prs));
  }
}

/* c8 ignore next 4 */
if (require.main === module) {
  main().catch(err => {
    core.setFailed(`release-please failed: ${err.message}`);
  });
} else {
  module.exports = releasePlease;
}
