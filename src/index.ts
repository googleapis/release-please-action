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
import {
  GitHub,
  Manifest,
  CreatedRelease,
  PullRequest,
  VERSION,
  ChangelogSection,
} from 'release-please';

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
  skipLabeling?: boolean;
  fork?: boolean;
  includeComponentInTag?: boolean;
  changelogHost: string;
  versioningStrategy?: string;
  releaseAs?: string;
  changelogSections?: ChangelogSection[];
}

function parseInputs(): ActionInputs {
  const inputs: ActionInputs = {
    token: core.getInput('token', { required: true }),
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
    skipLabeling: getOptionalBooleanInput('skip-labeling'),
    fork: getOptionalBooleanInput('fork'),
    includeComponentInTag: getOptionalBooleanInput('include-component-in-tag'),
    changelogHost: core.getInput('changelog-host') || DEFAULT_GITHUB_SERVER_URL,
    versioningStrategy: getOptionalInput('versioning-strategy'),
    releaseAs: getOptionalInput('release-as'),
    changelogSections: parseChangelogSections(
      getOptionalInput('changelog-sections'),
    ),
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

function parseChangelogSections(
  input?: string,
): ChangelogSection[] | undefined {
  if (!input) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed)) {
      core.warning('changelog-sections must be a JSON array');
      return undefined;
    }
    return parsed;
  } catch (error) {
    core.warning(`Failed to parse changelog-sections: ${error}`);
    return undefined;
  }
}

function loadOrBuildManifest(
  github: GitHub,
  inputs: ActionInputs,
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
        versioning: inputs.versioningStrategy,
        releaseAs: inputs.releaseAs,
        changelogSections: inputs.changelogSections,
      },
      {
        fork: inputs.fork,
        skipLabeling: inputs.skipLabeling,
      },
      inputs.path,
    );
  }
  const manifestOverrides =
    inputs.fork || inputs.skipLabeling
      ? {
          fork: inputs.fork,
          skipLabeling: inputs.skipLabeling,
        }
      : {};
  core.debug('Loading manifest from config file');
  return Manifest.fromManifest(
    github,
    github.repository.defaultBranch,
    inputs.configFile,
    inputs.manifestFile,
    manifestOverrides,
  ).then((manifest) => {
    // Override changelogHost for all paths if provided as action input and different from default
    if (
      inputs.changelogHost &&
      inputs.changelogHost !== DEFAULT_GITHUB_SERVER_URL
    ) {
      core.debug(`Overriding changelogHost to: ${inputs.changelogHost}`);
      for (const path in manifest.repositoryConfig) {
        manifest.repositoryConfig[path].changelogHost = inputs.changelogHost;
      }
    }
    // Override changelogSections for all paths if provided as action input
    if (inputs.changelogSections) {
      core.debug(
        `Overriding changelogSections with ${inputs.changelogSections.length} sections`,
      );
      for (const path in manifest.repositoryConfig) {
        manifest.repositoryConfig[path].changelogSections =
          inputs.changelogSections;
      }
    }
    return manifest;
  });
}

export async function main(fetchOverride?: any) {
  core.info(`Running release-please version: ${VERSION}`);
  const inputs = parseInputs();
  const github = await getGitHubInstance(inputs, fetchOverride);

  if (!inputs.skipGitHubRelease) {
    const manifest = await loadOrBuildManifest(github, inputs);
    core.debug('Creating releases');
    outputReleases(await manifest.createReleases());
  }

  if (!inputs.skipGitHubPullRequest) {
    const manifest = await loadOrBuildManifest(github, inputs);
    core.debug('Creating pull requests');
    outputPRs(await manifest.createPullRequests());
  }
}

function getGitHubInstance(
  inputs: ActionInputs,
  fetchOverride?: any,
): Promise<GitHub> {
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
    fetch: fetchOverride,
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
  releases = releases.filter((release) => release !== undefined);
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
  prs = prs.filter((pr) => pr !== undefined);
  core.setOutput('prs_created', prs.length > 0);
  if (prs.length) {
    core.setOutput('pr', prs[0]);
    core.setOutput('prs', JSON.stringify(prs));
  }
}

if (require.main === module) {
  main().catch((err) => {
    core.setFailed(`release-please failed: ${err.message}`);
  });
}
