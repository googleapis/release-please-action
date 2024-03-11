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
import {GitHub, Manifest, CreatedRelease, PullRequest, VERSION} from 'release-please';

const DEFAULT_CONFIG_FILE = 'release-please-config.json';
const DEFAULT_MANIFEST_FILE = '.release-please-manifest.json';
const DEFAULT_GITHUB_API_URL = 'https://api.github.com';
const DEFAULT_GITHUB_GRAPHQL_URL = 'https://api.github.com';
const DEFAULT_GITHUB_SERVER_URL = 'https://github.com';

interface Proxy {
  host: string;
  port: number;
}

interface ActionInputs {
  token: string;
  repoUrl: string;
  releaseType?: string;
  path?: string;
  githubApiUrl: string;
  githubGraphqlUrl: string;
  configFile?: string;
  manifestFile?: string;
  proxyServer?: string;
  targetBranch?: string;
  skipGitHubRelease?: boolean;
  skipGitHubPullRequest?: boolean;
  fork?: boolean;
  includeComponentInTag?: boolean;
  changelogHost: string;
}

function parseInputs(): ActionInputs {
  const inputs: ActionInputs = {
    token: core.getInput('token', {required: true}),
    releaseType: getOptionalInput('release-type'),
    path: getOptionalInput('path'),
    repoUrl: core.getInput('repo-url') || process.env.GITHUB_REPOSITORY || '',
    targetBranch: getOptionalInput('target-branch'),
    configFile: core.getInput('config-file') || DEFAULT_CONFIG_FILE,
    manifestFile: core.getInput('manifest-file') || DEFAULT_MANIFEST_FILE,
    githubApiUrl: core.getInput('github-api-url') || DEFAULT_GITHUB_API_URL,
    githubGraphqlUrl:
      (core.getInput('github-graphql-url') || '').replace(/\/graphql$/, '') ||
      DEFAULT_GITHUB_GRAPHQL_URL,
    proxyServer: getOptionalInput('proxy-server'),
    skipGitHubRelease: getOptionalBooleanInput('skip-github-release'),
    skipGitHubPullRequest: getOptionalBooleanInput('skip-github-pull-request'),
    fork: getOptionalBooleanInput('fork'),
    includeComponentInTag: getOptionalBooleanInput('include-component-in-tag'),
    changelogHost: core.getInput('changelog-host') || DEFAULT_GITHUB_SERVER_URL,
  };
  return inputs;
}

function getOptionalInput(name: string): string | undefined {
  return core.getInput(name) || undefined;
}

function getOptionalBooleanInput(name: string): boolean | undefined {
  const val = core.getInput(name);
  if (val === '' || val === undefined) {
    return undefined;
  }
  return core.getBooleanInput(name);
}

function loadOrBuildManifest(
  github: GitHub,
  inputs: ActionInputs
): Promise<Manifest> {
  if (inputs.releaseType) {
    core.debug('Building manifest from config');
    return Manifest.fromConfig(
      github,
      github.repository.defaultBranch,
      {
        releaseType: inputs.releaseType,
        includeComponentInTag: inputs.includeComponentInTag,
        changelogHost: inputs.changelogHost,
      },
      {
        fork: inputs.fork,
      },
      inputs.path
    );
  }
  const manifestOverrides = inputs.fork
    ? {
        fork: inputs.fork,
      }
    : {};
  core.debug('Loading manifest from config file');
  return Manifest.fromManifest(
    github,
    github.repository.defaultBranch,
    inputs.configFile,
    inputs.manifestFile,
    manifestOverrides
  );
}

export async function main() {
  core.info(`Running release-please version: ${VERSION}`)
  const inputs = parseInputs();
  const github = await getGitHubInstance(inputs);

  if (!inputs.skipGitHubRelease) {
    const manifest = await loadOrBuildManifest(github, inputs);
    core.debug('Creating pull requests');
    outputReleases(await manifest.createReleases());
  }

  if (!inputs.skipGitHubPullRequest) {
    const manifest = await loadOrBuildManifest(github, inputs);
    core.debug('Creating pull requests');
    outputPRs(await manifest.createPullRequests());
  }
}

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
    defaultBranch: inputs.targetBranch,
  };
  return GitHub.create(githubCreateOpts);
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
  core.setOutput('releases_created', releases.length > 0);
  if (releases.length) {
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
      for (const [rawKey, value] of Object.entries(release)) {
        let key = rawKey;
        // Historically tagName was output as tag_name, keep this
        // consistent to avoid breaking change:
        if (key === 'tagName') key = 'tag_name';
        if (key === 'uploadUrl') key = 'upload_url';
        if (key === 'notes') key = 'body';
        if (key === 'url') key = 'html_url';
        setPathOutput(path, key, value);
      }
    }
  }
  // Paths of all releases that were created, so that they can be passed
  // to matrix in next step:
  core.setOutput('paths_released', JSON.stringify(pathsReleased));
}

function outputPRs(prs: (PullRequest | undefined)[]) {
  prs = prs.filter(pr => pr !== undefined);
  core.setOutput('prs_created', prs.length > 0);
  if (prs.length) {
    core.setOutput('pr', prs[0]);
    core.setOutput('prs', JSON.stringify(prs));
  }
}

if (require.main === module) {
  main().catch(err => {
    core.setFailed(`release-please failed: ${err.message}`)
  })
}
