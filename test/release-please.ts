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

import {describe, it, beforeEach, afterEach} from 'mocha';
import * as action from '../src/index';
import * as assert from 'assert';
import * as core from '@actions/core';
import * as sinon from 'sinon';
import * as nock from 'nock';
import {RestoreFn} from 'mocked-env';
import mockedEnv from 'mocked-env';

import {Manifest, GitHub} from 'release-please';
// As defined in action.yml

const DEFAULT_INPUTS: Record<string, string> = {
  token: 'fake-token',
};

const fixturePrs = [
  {
    headBranchName: 'release-please--branches--main',
    baseBranchName: 'main',
    number: 22,
    title: 'chore(master): release 1.0.0',
    body: ':robot: I have created a release *beep* *boop*',
    labels: ['autorelease: pending'],
    files: [],
  },
  {
    headBranchName: 'release-please--branches--main',
    baseBranchName: 'main',
    number: 23,
    title: 'chore(master): release 1.0.0',
    body: ':robot: I have created a release *beep* *boop*',
    labels: ['autorelease: pending'],
    files: [],
  },
];

const sandbox = sinon.createSandbox();
process.env.GITHUB_REPOSITORY = 'fakeOwner/fakeRepo';

function mockInputs(inputs: Record<string, string>): RestoreFn {
  const envVars: Record<string, string> = {};
  for (const [name, val] of Object.entries({...DEFAULT_INPUTS, ...inputs})) {
    envVars[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = val;
  }
  return mockedEnv(envVars);
}

nock.disableNetConnect();

describe('release-please-action', () => {
  let output: Record<string, string | boolean> = {};
  // Save original env varas and restore after each test
  let restoreEnv: RestoreFn | null;
  afterEach(() => {
    sandbox.restore();
    if (restoreEnv) {
      restoreEnv();
      restoreEnv = null;
    }
  });
  beforeEach(() => {
    output = {};
    sandbox.replace(
      core,
      'setOutput',
      (key: string, value: string | boolean) => {
        output[key] = value;
      }
    );
    // Default branch lookup:
    nock('https://api.github.com').get('/repos/fakeOwner/fakeRepo').reply(200, {
      default_branch: 'main',
    });
  });
  afterEach(() => {
    sandbox.restore();
  });
  describe('configuration', () => {
    let fakeManifest: sinon.SinonStubbedInstance<Manifest>;
    describe('with release-type', () => {
      let fromConfigStub: sinon.SinonStub;
      beforeEach(() => {
        fakeManifest = sandbox.createStubInstance(Manifest);
        fromConfigStub = sandbox
          .stub(Manifest, 'fromConfig')
          .resolves(fakeManifest);
      });
      it('builds a manifest from config', async () => {
        restoreEnv = mockInputs({
          'release-type': 'simple',
        });
        fakeManifest.createReleases.resolves([]);
        fakeManifest.createPullRequests.resolves([]);
        await action.main();
        sinon.assert.calledOnce(fakeManifest.createReleases);
        sinon.assert.calledOnce(fakeManifest.createPullRequests);
      });
      it('skips creating releases if skip-github-release specified', async () => {
        restoreEnv = mockInputs({
          'skip-github-release': 'true',
          'release-type': 'simple',
        });
        fakeManifest.createPullRequests.resolves([]);
        await action.main();
        sinon.assert.notCalled(fakeManifest.createReleases);
        sinon.assert.calledOnce(fakeManifest.createPullRequests);
      });
      it('skips creating pull requests if skip-github-pull-request specified', async () => {
        restoreEnv = mockInputs({
          'skip-github-pull-request': 'true',
          'release-type': 'simple',
        });
        fakeManifest.createReleases.resolves([]);
        await action.main();
        sinon.assert.calledOnce(fakeManifest.createReleases);
        sinon.assert.notCalled(fakeManifest.createPullRequests);
      });
      it('allows specifying custom target branch', async () => {
        restoreEnv = mockInputs({
          'target-branch': 'dev',
          'release-type': 'simple',
        });
        fakeManifest.createReleases.resolves([]);
        fakeManifest.createPullRequests.resolves([]);
        await action.main();
        sinon.assert.calledOnce(fakeManifest.createReleases);
        sinon.assert.calledOnce(fakeManifest.createPullRequests);

        sinon.assert.calledWith(
          fromConfigStub,
          sinon.match.any,
          'dev',
          sinon.match.object,
          sinon.match.object,
          sinon.match.any,
        );
      });
      it('allows specifying fork', async () => {
        restoreEnv = mockInputs({
          'fork': 'true',
          'release-type': 'simple',
        });
        fakeManifest.createReleases.resolves([]);
        fakeManifest.createPullRequests.resolves([]);
        await action.main();
        sinon.assert.calledOnce(fakeManifest.createReleases);
        sinon.assert.calledOnce(fakeManifest.createPullRequests);

        sinon.assert.calledWith(
          fromConfigStub,
          sinon.match.any,
          sinon.match.string,
          sinon.match.object,
          sinon.match({fork: true}),
          sinon.match.any,
        );
      });
    });

    describe('with manifest', () => {
      let fromManifestStub: sinon.SinonStub;
      beforeEach(() => {
        fakeManifest = sandbox.createStubInstance(Manifest);
        fromManifestStub = sandbox
          .stub(Manifest, 'fromManifest')
          .resolves(fakeManifest);
      });
      it('loads a manifest from the repository', async () => {
        restoreEnv = mockInputs({});
        fakeManifest.createReleases.resolves([]);
        fakeManifest.createPullRequests.resolves([]);
        await action.main();
        sinon.assert.calledOnce(fakeManifest.createReleases);
        sinon.assert.calledOnce(fakeManifest.createPullRequests);
      });
      it('skips creating releases if skip-github-release specified', async () => {
        restoreEnv = mockInputs({
          'skip-github-release': 'true',
        });
        fakeManifest.createPullRequests.resolves([]);
        await action.main();
        sinon.assert.notCalled(fakeManifest.createReleases);
        sinon.assert.calledOnce(fakeManifest.createPullRequests);
      });
      it('skips creating pull requests if skip-github-pull-request specified', async () => {
        restoreEnv = mockInputs({
          'skip-github-pull-request': 'true',
        });
        fakeManifest.createReleases.resolves([]);
        await action.main();
        sinon.assert.calledOnce(fakeManifest.createReleases);
        sinon.assert.notCalled(fakeManifest.createPullRequests);
      });
      it('allows specifying custom target branch', async () => {
        restoreEnv = mockInputs({
          'target-branch': 'dev',
        });
        fakeManifest.createReleases.resolves([]);
        fakeManifest.createPullRequests.resolves([]);
        await action.main();
        sinon.assert.calledOnce(fakeManifest.createReleases);
        sinon.assert.calledOnce(fakeManifest.createPullRequests);

        sinon.assert.calledWith(
          fromManifestStub,
          sinon.match.any,
          'dev',
          sinon.match.string,
          sinon.match.string
        );
      });
      it('allows specifying fork', async () => {
        restoreEnv = mockInputs({
          'fork': 'true',
        });
        fakeManifest.createReleases.resolves([]);
        fakeManifest.createPullRequests.resolves([]);
        await action.main();
        sinon.assert.calledOnce(fakeManifest.createReleases);
        sinon.assert.calledOnce(fakeManifest.createPullRequests);

        sinon.assert.calledWith(
          fromManifestStub,
          sinon.match.any,
          sinon.match.string,
          sinon.match.string,
          sinon.match.string,
          sinon.match({fork: true}),
        );
      });
    });

    it('allows specifying manifest config paths', async () => {
      restoreEnv = mockInputs({
        'config-file': 'path/to/config.json',
        'manifest-file': 'path/to/manifest.json',
      });
      const fakeManifest = sandbox.createStubInstance(Manifest);
      fakeManifest.createReleases.resolves([]);
      fakeManifest.createPullRequests.resolves([]);
      const fromManifestStub = sandbox
        .stub(Manifest, 'fromManifest')
        .resolves(fakeManifest);
      await action.main();
      sinon.assert.calledOnce(fakeManifest.createReleases);
      sinon.assert.calledOnce(fakeManifest.createPullRequests);

      sinon.assert.calledWith(
        fromManifestStub,
        sinon.match.any,
        sinon.match.string,
        'path/to/config.json',
        'path/to/manifest.json'
      );
    });

    it('allows specifying network options', async () => {
      restoreEnv = mockInputs({
        'target-branch': 'dev',
        'proxy-server': 'some-host:9000',
        'github-api-url': 'https://my-enterprise-host.local/api',
        'github-graphql-url': 'https://my-enterprise-host.local/graphql',
      });
      const createGithubSpy = sandbox.spy(GitHub, 'create');
      const fakeManifest = sandbox.createStubInstance(Manifest);
      fakeManifest.createReleases.resolves([]);
      fakeManifest.createPullRequests.resolves([]);
      sandbox.stub(Manifest, 'fromManifest').resolves(fakeManifest);
      await action.main();
      sinon.assert.calledOnce(fakeManifest.createReleases);
      sinon.assert.calledOnce(fakeManifest.createPullRequests);

      sinon.assert.calledWith(
        createGithubSpy,
        sinon.match({
          apiUrl: 'https://my-enterprise-host.local/api',
          graphqlUrl: 'https://my-enterprise-host.local',
          proxy: {
            host: 'some-host',
            port: 9000,
          },
          defaultBranch: 'dev',
        })
      );
    });
  });

  describe('outputs', () => {
    it('sets appropriate outputs when GitHub release created', async () => {
      restoreEnv = mockInputs({});
      const fakeManifest = sandbox.createStubInstance(Manifest);
      fakeManifest.createReleases.resolves([
        {
          id: 123456,
          name: 'v1.2.3',
          tagName: 'v1.2.3',
          sha: 'abc123',
          notes: 'Some release notes',
          url: 'http://example2.com',
          draft: false,
          uploadUrl: 'http://example.com',
          path: '.',
          version: '1.2.3',
          major: 1,
          minor: 2,
          patch: 3,
        },
      ]);
      fakeManifest.createPullRequests.resolves([]);
      sandbox.stub(Manifest, 'fromManifest').resolves(fakeManifest);
      await action.main();
      sinon.assert.calledOnce(fakeManifest.createReleases);
      sinon.assert.calledOnce(fakeManifest.createPullRequests);

      assert.strictEqual(output.id, 123456);
      assert.strictEqual(output.release_created, true);
      assert.strictEqual(output.releases_created, true);
      assert.strictEqual(output.upload_url, 'http://example.com');
      assert.strictEqual(output.html_url, 'http://example2.com');
      assert.strictEqual(output.tag_name, 'v1.2.3');
      assert.strictEqual(output.major, 1);
      assert.strictEqual(output.minor, 2);
      assert.strictEqual(output.patch, 3);
      assert.strictEqual(output.version, '1.2.3');
      assert.strictEqual(output.sha, 'abc123');
      assert.strictEqual(output.paths_released, '["."]');
    });

    it('sets appropriate outputs when release PR opened', async () => {
      restoreEnv = mockInputs({});
      const fakeManifest = sandbox.createStubInstance(Manifest);
      fakeManifest.createReleases.resolves([]);
      fakeManifest.createPullRequests.resolves([fixturePrs[0]]);
      sandbox.stub(Manifest, 'fromManifest').resolves(fakeManifest);
      await action.main();
      sinon.assert.calledOnce(fakeManifest.createReleases);
      sinon.assert.calledOnce(fakeManifest.createPullRequests);

      const {pr, prs, prs_created} = output;
      assert.strictEqual(prs_created, true);
      assert.deepStrictEqual(pr, fixturePrs[0]);
      assert.deepStrictEqual(prs, JSON.stringify([fixturePrs[0]]));
    });
    it('sets appropriate output if multiple releases are created', async () => {
      restoreEnv = mockInputs({});
      const fakeManifest = sandbox.createStubInstance(Manifest);
      fakeManifest.createReleases.resolves([
        {
          id: 123456,
          name: 'v1.0.0',
          tagName: 'v1.0.0',
          sha: 'abc123',
          notes: 'Some release notes',
          url: 'http://example2.com',
          draft: false,
          uploadUrl: 'http://example.com',
          path: 'a',
          version: '1.0.0',
          major: 1,
          minor: 0,
          patch: 0,
        },
        {
          id: 123,
          name: 'v1.2.0',
          tagName: 'v1.2.0',
          sha: 'abc123',
          notes: 'Some release notes',
          url: 'http://example2.com',
          draft: false,
          uploadUrl: 'http://example.com',
          path: 'b',
          version: '1.2.0',
          major: 1,
          minor: 2,
          patch: 0,
        },
      ]);
      fakeManifest.createPullRequests.resolves([]);
      sandbox.stub(Manifest, 'fromManifest').resolves(fakeManifest);
      await action.main();
      sinon.assert.calledOnce(fakeManifest.createReleases);

      assert.strictEqual(output['a--id'], 123456);
      assert.strictEqual(output['a--release_created'], true);
      assert.strictEqual(output['a--upload_url'], 'http://example.com');
      assert.strictEqual(output['a--html_url'], 'http://example2.com');
      assert.strictEqual(output['a--tag_name'], 'v1.0.0');
      assert.strictEqual(output['a--major'], 1);
      assert.strictEqual(output['a--minor'], 0);
      assert.strictEqual(output['a--patch'], 0);
      assert.strictEqual(output['a--version'], '1.0.0');
      assert.strictEqual(output['a--sha'], 'abc123');
      assert.strictEqual(output['a--path'], 'a');

      assert.strictEqual(output['b--id'], 123);
      assert.strictEqual(output['b--release_created'], true);
      assert.strictEqual(output['b--upload_url'], 'http://example.com');
      assert.strictEqual(output['b--html_url'], 'http://example2.com');
      assert.strictEqual(output['b--tag_name'], 'v1.2.0');
      assert.strictEqual(output['b--major'], 1);
      assert.strictEqual(output['b--minor'], 2);
      assert.strictEqual(output['b--patch'], 0);
      assert.strictEqual(output['b--version'], '1.2.0');
      assert.strictEqual(output['b--sha'], 'abc123');
      assert.strictEqual(output['b--path'], 'b');

      assert.strictEqual(output.paths_released, '["a","b"]');
      assert.strictEqual(output.releases_created, true);
    });
    it('sets appropriate output if multiple release PR opened', async () => {
      restoreEnv = mockInputs({});
      const fakeManifest = sandbox.createStubInstance(Manifest);
      fakeManifest.createReleases.resolves([]);
      fakeManifest.createPullRequests.resolves(fixturePrs);
      sandbox.stub(Manifest, 'fromManifest').resolves(fakeManifest);
      await action.main();
      sinon.assert.calledOnce(fakeManifest.createReleases);
      sinon.assert.calledOnce(fakeManifest.createPullRequests);

      const {pr, prs} = output;
      assert.deepStrictEqual(pr, fixturePrs[0]);
      assert.deepStrictEqual(prs, JSON.stringify(fixturePrs));
    });
    it('does not set outputs when no release created or PR returned', async () => {
      restoreEnv = mockInputs({});
      const fakeManifest = sandbox.createStubInstance(Manifest);
      fakeManifest.createReleases.resolves([]);
      fakeManifest.createPullRequests.resolves([]);
      sandbox.stub(Manifest, 'fromManifest').resolves(fakeManifest);
      await action.main();
      sinon.assert.calledOnce(fakeManifest.createReleases);
      sinon.assert.calledOnce(fakeManifest.createPullRequests);

      assert.strictEqual(Object.hasOwnProperty.call(output, 'pr'), false);
      assert.deepStrictEqual(output.paths_released, '[]');
      assert.deepStrictEqual(output.prs_created, false);
      assert.deepStrictEqual(output.releases_created, false);
    });
  });
});
