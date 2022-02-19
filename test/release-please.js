const { describe, it, beforeEach, afterEach } = require('mocha')
const action = require('../')
const assert = require('assert')
const core = require('@actions/core')
const sinon = require('sinon')
const nock = require('nock')
const { Manifest } = require('release-please/build/src/manifest')
// const { Node } = require('release-please/build/src/strategies/node')
// As defined in action.yml
const defaultInput = {
  fork: 'false',
  clean: 'true',
  'bump-minor-pre-major': 'false',
  'bump-patch-for-minor-pre-major': 'false',
  path: '',
  'monorepo-tags': 'false',
  'changelog-path': '',
  'changelog-types': '',
  command: '',
  'version-file': '',
  'default-branch': '',
  // eslint-disable-next-line no-template-curly-in-string
  'pull-request-title-pattern': 'chore${scope}: release${component} ${version}',
  draft: 'false',
  'draft-pull-request': 'false'
}

let input
let output

const sandbox = sinon.createSandbox()
process.env.GITHUB_REPOSITORY = 'google/cloud'

nock.disableNetConnect()

describe('release-please-action', () => {
  beforeEach(() => {
    input = {}
    output = {}
    core.setOutput = (name, value) => {
      output[name] = value
    }
    core.getInput = name => {
      if (input[name] === undefined || input[name] == null) {
        return defaultInput[name]
      } else {
        return input[name]
      }
    }
    core.getBooleanInput = name => {
      // Float our own helper, for mocking purposes:
      const trueValue = ['true', 'True', 'TRUE']
      const falseValue = ['false', 'False', 'FALSE']
      const val = core.getInput(name)
      if (trueValue.includes(val)) { return true }
      if (falseValue.includes(val)) { return false }
      throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` +
          'Support boolean input list: `true | True | TRUE | false | False | FALSE`')
    }
    // Default branch lookup:
    nock('https://api.github.com')
      .get('/repos/google/cloud')
      .reply(200, {
        default_branch: 'main'
      })
  })
  afterEach(() => {
    sandbox.restore()
  })

  it('opens PR with custom changelogSections', async () => {
    input = {
      command: 'release-pr',
      'release-type': 'node',
      'changelog-types':
        '[{"type":"feat","section":"Features","hidden":false},{"type":"fix","section":"Bug Fixes","hidden":false},{"type":"chore","section":"Miscellaneous","hidden":false}]'
    }

    const createPullRequestsFake = sandbox.fake.returns([22])
    const createManifestCommand = sandbox.stub(Manifest, 'fromConfig').returns({
      createPullRequests: createPullRequestsFake
    })
    await action.main()

    sinon.assert.calledOnce(createPullRequestsFake)
    sinon.assert.calledWith(
      createManifestCommand,
      sinon.match.any,
      'main',
      sinon.match.hasOwn(
        'changelogSections',
        JSON.parse(
          '[{"type":"feat","section":"Features","hidden":false},{"type":"fix","section":"Bug Fixes","hidden":false},{"type":"chore","section":"Miscellaneous","hidden":false}]'
        )
      ),
      sinon.match.any
    )
  })

  it('opens PR with custom title', async () => {
    input = {
      command: 'release-pr',
      'release-type': 'node',
      'pull-request-title-pattern': 'beep boop'
    }

    const createPullRequestsFake = sandbox.fake.returns([22])
    const createManifestCommand = sandbox.stub(Manifest, 'fromConfig').returns({
      createPullRequests: createPullRequestsFake
    })
    await action.main()

    sinon.assert.calledOnce(createPullRequestsFake)
    sinon.assert.calledWith(
      createManifestCommand,
      sinon.match.any,
      'main',
      sinon.match.hasOwn(
        'pullRequestTitlePattern',
        'beep boop'
      ),
      sinon.match.any
    )
  })

  it('both opens PR to the default branch and tags GitHub releases by default', async () => {
    input = {}

    const createReleasesFake = sandbox.fake.returns([
      {
        upload_url: 'http://example.com',
        tagName: 'v1.0.0'
      }
    ])
    const createPullRequestsFake = sandbox.fake.returns([22])
    const createManifestCommand = sandbox.stub(Manifest, 'fromConfig').returns({
      createPullRequests: createPullRequestsFake,
      createReleases: createReleasesFake
    })
    await action.main()

    sinon.assert.calledTwice(createManifestCommand)
    sinon.assert.calledOnce(createPullRequestsFake)
    sinon.assert.calledOnce(createReleasesFake)
    assert.deepStrictEqual(output, {
      release_created: true,
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0',
      pr: 22,
      prs: '[22]',
      releases_created: true,
      paths_released: '["."]'
    })
  })

  it('both opens PR to a different default branch and tags GitHub releases by default', async () => {
    input = {
      'default-branch': 'dev'
    }

    const createReleasesFake = sandbox.fake.returns([
      {
        upload_url: 'http://example.com',
        tag_name: 'v1.0.0'
      }
    ])
    const createPullRequestsFake = sandbox.fake.returns([22])
    const createManifestCommand = sandbox.stub(Manifest, 'fromConfig').returns({
      createPullRequests: createPullRequestsFake,
      createReleases: createReleasesFake
    })
    await action.main()

    sinon.assert.calledOnce(createPullRequestsFake)
    sinon.assert.calledWith(createReleasesFake)
    sinon.assert.calledWith(
      createManifestCommand,
      sinon.match.any,
      'dev',
      sinon.match.any,
      sinon.match.any
    )
    assert.deepStrictEqual(output, {
      release_created: true,
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0',
      pr: 22,
      prs: '[22]',
      releases_created: true,
      paths_released: '["."]'
    })
  })

  it('only opens PR, if command set to release-pr', async () => {
    input = {
      command: 'release-pr'
    }

    const createReleasesFake = sandbox.fake.returns([
      {
        upload_url: 'http://example.com',
        tag_name: 'v1.0.0'
      }
    ])
    const createPullRequestsFake = sandbox.fake.returns([22])
    const createManifestCommand = sandbox.stub(Manifest, 'fromConfig').returns({
      createPullRequests: createPullRequestsFake,
      createReleases: createReleasesFake
    })
    await action.main()

    sinon.assert.calledOnce(createManifestCommand)
    sinon.assert.calledOnce(createPullRequestsFake)
    sinon.assert.notCalled(createReleasesFake)
    assert.deepStrictEqual(output, {
      pr: 22,
      prs: '[22]'
    })
  })

  it('only creates GitHub release, if command set to github-release', async () => {
    input = {
      command: 'github-release'
    }

    const createReleasesFake = sandbox.fake.returns([
      {
        upload_url: 'http://example.com',
        tag_name: 'v1.0.0'
      }
    ])
    const createPullRequestsFake = sandbox.fake.returns([22])
    const createManifestCommand = sandbox.stub(Manifest, 'fromConfig').returns({
      createPullRequests: createPullRequestsFake,
      createReleases: createReleasesFake
    })
    await action.main()

    sinon.assert.calledOnce(createManifestCommand)
    sinon.assert.notCalled(createPullRequestsFake)
    sinon.assert.calledOnce(createReleasesFake)
    assert.deepStrictEqual(output, {
      release_created: true,
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0',
      releases_created: true,
      paths_released: '["."]'
    })
  })

  it('sets appropriate outputs when GitHub release created', async () => {
    const release = {
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
      patch: 3
    }
    input = {
      'release-type': 'node',
      command: 'github-release'
    }
    const createReleasesFake = sandbox.fake.returns([release])
    sandbox.stub(Manifest, 'fromConfig').returns({
      createReleases: createReleasesFake
    })
    await action.main()
    assert.strictEqual(output.release_created, true)
    assert.strictEqual(output.releases_created, true)
    assert.strictEqual(output.upload_url, 'http://example.com')
    assert.strictEqual(output.html_url, 'http://example2.com')
    assert.strictEqual(output.tag_name, 'v1.2.3')
    assert.strictEqual(output.major, 1)
    assert.strictEqual(output.minor, 2)
    assert.strictEqual(output.patch, 3)
    assert.strictEqual(output.version, '1.2.3')
    assert.strictEqual(output.sha, 'abc123')
    assert.strictEqual(output.paths_released, '["."]')
  })

  it('sets appropriate outputs when release PR opened', async () => {
    input = {
      'release-type': 'node',
      command: 'release-pr'
    }
    const createPullRequestsFake = sandbox.fake.returns([22])
    const createManifestCommand = sandbox.stub(Manifest, 'fromConfig').returns({
      createPullRequests: createPullRequestsFake
    })
    await action.main()

    sinon.assert.calledOnce(createManifestCommand)
    sinon.assert.calledOnce(createPullRequestsFake)
    assert.deepStrictEqual(output, {
      pr: 22,
      prs: '[22]'
    })
  })

  it('does not set PR output, when no release PR is returned', async () => {
    input = {
      'release-type': 'node',
      command: 'release-pr'
    }
    const createPullRequestsFake = sandbox.fake.returns([undefined])
    const createManifestCommand = sandbox.stub(Manifest, 'fromConfig').returns({
      createPullRequests: createPullRequestsFake
    })
    await action.main()
    sinon.assert.calledOnce(createManifestCommand)
    sinon.assert.calledOnce(createPullRequestsFake)
    assert.strictEqual(Object.hasOwnProperty.call(output, 'pr'), false)
  })

  it('does not set release output, when no release is returned', async () => {
    input = {
      'release-type': 'node',
      command: 'github-release'
    }
    const createReleasesFake = sandbox.fake.returns([undefined])
    sandbox.stub(Manifest, 'fromConfig').returns({
      createReleases: createReleasesFake
    })
    await action.main()
    assert.deepStrictEqual(output, { paths_released: '[]' })
  })

  it('creates and runs a manifest release', async () => {
    input = { command: 'manifest' }
    const createReleasesFake = sandbox.fake.returns([
      {
        upload_url: 'http://example.com',
        tag_name: 'v1.0.0'
      }
    ])
    const createPullRequestsFake = sandbox.fake.returns([22])
    const createManifestCommand = sandbox.stub(Manifest, 'fromManifest').returns({
      createPullRequests: createPullRequestsFake,
      createReleases: createReleasesFake
    })
    await action.main()

    sinon.assert.calledOnce(createPullRequestsFake)
    sinon.assert.calledWith(createReleasesFake)
    sinon.assert.calledWith(
      createManifestCommand,
      sinon.match.any,
      'main',
      sinon.match.any,
      sinon.match.any
    )
    assert.deepStrictEqual(output, {
      release_created: true,
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0',
      pr: 22,
      prs: '[22]',
      releases_created: true,
      paths_released: '["."]'
    })
  })

  it('opens PR only for manifest-pr', async () => {
    input = { command: 'manifest-pr' }
    const createPullRequestsFake = sandbox.fake.returns([22])
    const createManifestCommand = sandbox.stub(Manifest, 'fromManifest').returns({
      createPullRequests: createPullRequestsFake
    })
    await action.main()

    sinon.assert.calledOnce(createPullRequestsFake)
    sinon.assert.calledWith(
      createManifestCommand,
      sinon.match.any,
      'main',
      sinon.match.any,
      sinon.match.any
    )
    assert.deepStrictEqual(output, {
      pr: 22,
      prs: '[22]'
    })
  })

  it('sets appropriate output if multiple releases and prs created', async () => {
    input = { command: 'manifest' }
    const createReleasesFake = sandbox.fake.returns([
      {
        upload_url: 'http://example.com',
        tag_name: 'v1.0.0',
        path: 'a'
      },
      {
        upload_url: 'http://example2.com',
        tag_name: 'v1.2.0',
        path: 'b'
      }
    ])
    const createPullRequestsFake = sandbox.fake.returns([22, 33])
    const createManifestCommand = sandbox.stub(Manifest, 'fromManifest').returns({
      createPullRequests: createPullRequestsFake,
      createReleases: createReleasesFake
    })
    await action.main()

    sinon.assert.calledOnce(createPullRequestsFake)
    sinon.assert.calledWith(createReleasesFake)
    sinon.assert.calledWith(
      createManifestCommand,
      sinon.match.any,
      'main',
      sinon.match.any,
      sinon.match.any
    )
    assert.deepStrictEqual(output, {
      pr: 22,
      prs: '[22,33]',
      releases_created: true,
      'a--release_created': true,
      'a--upload_url': 'http://example.com',
      'a--tag_name': 'v1.0.0',
      'a--path': 'a',
      'b--release_created': true,
      'b--upload_url': 'http://example2.com',
      'b--tag_name': 'v1.2.0',
      'b--path': 'b',
      paths_released: '["a","b"]'
    })
  })
})
