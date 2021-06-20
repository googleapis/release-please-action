const { describe, it, beforeEach, afterEach } = require('mocha')
const action = require('../')
const assert = require('assert')
const core = require('@actions/core')
const sinon = require('sinon')
const { factory, GitHubRelease } = require('release-please/build/src')
const { Manifest } = require('release-please/build/src/manifest')
const { Node } = require('release-please/build/src/releasers/node')
// As defined in action.yml
const defaultInput = {
  fork: 'false',
  clean: 'true',
  'bump-minor-pre-major': 'false',
  path: '',
  'monorepo-tags': 'false',
  'changelog-path': '',
  'changelog-types': '',
  command: '',
  'version-file': '',
  'default-branch': '',
  // eslint-disable-next-line no-template-curly-in-string
  'pull-request-title-pattern': 'chore${scope}: release${component} ${version}'
}

let input
let output

const sandbox = sinon.createSandbox()
process.env.GITHUB_REPOSITORY = 'google/cloud'

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
  })
  afterEach(() => {
    sandbox.restore()
  })

  const trueValue = ['true', 'True', 'TRUE', 'yes', 'Yes', 'YES', 'y', 'Y', 'on', 'On', 'ON']
  const falseValue = ['false', 'False', 'FALSE', 'no', 'No', 'NO', 'n', 'N', 'off', 'Off', 'OFF']

  trueValue.forEach(value => {
    it(`get the boolean true with the input of '${value}'`, () => {
      input = {
        fork: value
      }
      const actual = action.getBooleanInput('fork')
      assert.strictEqual(actual, true)
    })
  })

  falseValue.forEach(value => {
    it(`get the boolean with the input of '${value}'`, () => {
      input = {
        fork: value
      }
      const actual = action.getBooleanInput('fork')
      assert.strictEqual(actual, false)
    })
  })

  it('get an error when inputting the wrong boolean value', () => {
    input = {
      fork: 'wrong'
    }
    assert.throws(
      () => {
        action.getBooleanInput('fork')
      },
      { name: 'TypeError', message: "Wrong boolean value of the input 'fork'" }
    )
  })

  it('sets pull pullRequestTitlePattern to undefined, if empty string provided', async () => {
    input = {
      'release-type': 'node',
      // eslint-disable-next-line no-template-curly-in-string
      'pull-request-title-pattern': ''
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')
    const githubReleasePRStub = runCommandStub.withArgs('release-pr').returns(25)

    await action.main()

    sinon.assert.calledOnce(githubReleasePRStub)
    sinon.assert.calledWith(
      githubReleasePRStub,
      'release-pr',
      // eslint-disable-next-line no-template-curly-in-string
      sinon.match.hasOwn('pullRequestTitlePattern', undefined)
    )
  })

  it('opens PR with custom changelogSections', async () => {
    input = {
      'release-type': 'node',
      'changelog-types':
        '[{"type":"feat","section":"Features","hidden":false},{"type":"fix","section":"Bug Fixes","hidden":false},{"type":"chore","section":"Miscellaneous","hidden":false}]'
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')
    const githubReleasePRStub = runCommandStub.withArgs('release-pr').returns(25)

    await action.main()

    sinon.assert.calledOnce(githubReleasePRStub)
    sinon.assert.calledWith(
      githubReleasePRStub,
      'release-pr',
      sinon.match.hasOwn(
        'changelogSections',
        JSON.parse(
          '[{"type":"feat","section":"Features","hidden":false},{"type":"fix","section":"Bug Fixes","hidden":false},{"type":"chore","section":"Miscellaneous","hidden":false}]'
        )
      )
    )
  })

  it('both opens PR to the default branch and tags GitHub releases by default', async () => {
    input = {
      'release-type': 'node'
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    const githubReleaseStub = runCommandStub.withArgs('github-release').returns({
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0'
    })

    const githubReleasePRStub = runCommandStub.withArgs('release-pr').returns(25)

    await action.main()

    sinon.assert.calledOnce(githubReleaseStub)
    sinon.assert.calledOnce(githubReleasePRStub)
    sinon.assert.calledWith(
      githubReleaseStub,
      'github-release',
      sinon.match.hasOwn('defaultBranch', undefined)
    )
    sinon.assert.calledWith(
      githubReleasePRStub,
      'release-pr',
      sinon.match.hasOwn('defaultBranch', undefined)
    )
    assert.deepStrictEqual(output, {
      release_created: true,
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0',
      pr: 25
    })
  })

  it('both opens PR to a different default branch and tags GitHub releases by default', async () => {
    input = {
      'release-type': 'node',
      'default-branch': 'dev'
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    const githubReleaseStub = runCommandStub.withArgs('github-release').returns({
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0'
    })

    const githubReleasePRStub = runCommandStub.withArgs('release-pr').returns(25)

    await action.main()

    sinon.assert.calledOnce(githubReleaseStub)
    sinon.assert.calledWith(
      githubReleaseStub,
      'github-release',
      sinon.match.hasOwn('defaultBranch', 'dev')
    )
    sinon.assert.calledOnce(githubReleasePRStub)
    sinon.assert.calledWith(
      githubReleasePRStub,
      'release-pr',
      sinon.match.hasOwn('defaultBranch', 'dev')
    )

    assert.deepStrictEqual(output, {
      release_created: true,
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0',
      pr: 25
    })
  })

  it('only opens PR, if command set to release-pr', async () => {
    input = {
      'release-type': 'node',
      command: 'release-pr'
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    const githubReleaseStub = runCommandStub.withArgs('github-release').returns({
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0'
    })

    const githubReleasePRStub = runCommandStub.withArgs('release-pr').returns(25)

    await action.main()
    sinon.assert.notCalled(githubReleaseStub)
    sinon.assert.calledOnce(githubReleasePRStub)
  })

  it('only creates GitHub release, if command set to github-release', async () => {
    input = {
      'release-type': 'node',
      command: 'github-release'
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    const githubReleaseStub = runCommandStub.withArgs('github-release').returns({
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0'
    })

    const githubReleasePRStub = runCommandStub.withArgs('release-pr').returns(25)

    await action.main()
    sinon.assert.calledOnce(githubReleaseStub)
    sinon.assert.notCalled(githubReleasePRStub)
  })

  it('sets appropriate outputs when GitHub release created', async () => {
    const expected = {
      release_created: true,
      upload_url: 'http://example.com',
      html_url: 'http://example2.com',
      tag_name: 'v1.0.0',
      major: 1,
      minor: 2,
      patch: 3,
      version: 'v1.2.3',
      sha: 'abc123',
      pr: 33
    }
    input = {
      'release-type': 'node',
      command: 'github-release'
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    runCommandStub.withArgs('github-release').returns(expected)

    runCommandStub.withArgs('release-pr').returns(25)

    await action.main()
    assert.deepStrictEqual(output, expected)
  })

  it('sets appropriate outputs when release PR opened', async () => {
    input = {
      'release-type': 'node',
      command: 'release-pr'
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    runCommandStub.withArgs('release-pr').returns(95)

    await action.main()
    assert.strictEqual(output.pr, 95)
  })

  it('does not set PR output, when no release PR is returned', async () => {
    input = {
      'release-type': 'node',
      command: 'release-pr'
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    runCommandStub.withArgs('release-pr').returns(undefined)

    await action.main()
    assert.strictEqual(Object.hasOwnProperty.call(output, 'pr'), false)
  })

  it('creates and runs a ReleasePR instance, using factory', async () => {
    let maybeReleasePR
    sandbox.replace(factory, 'call', runnable => {
      maybeReleasePR = runnable
    })
    input = {
      'release-type': 'node',
      command: 'release-pr'
    }
    await action.main()
    assert.ok(maybeReleasePR instanceof Node)
  })

  it('creates and runs a GitHubRelease, using factory', async () => {
    let maybeGitHubRelease
    sandbox.replace(factory, 'call', runnable => {
      maybeGitHubRelease = runnable
    })
    input = {
      'release-type': 'node',
      command: 'github-release'
    }
    await action.main()
    assert.ok(maybeGitHubRelease instanceof GitHubRelease)
  })

  it('creates and runs a Manifest, using factory', async () => {
    let maybeManifest
    sandbox.replace(factory, 'call', runnable => {
      maybeManifest = runnable
    })
    input = { command: 'manifest' }
    await action.main()
    assert.ok(maybeManifest instanceof Manifest)
  })

  it('opens PR creates GitHub releases by default for manifest', async () => {
    input = { command: 'manifest' }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    const manifestReleaseStub = runCommandStub.withArgs('manifest-release').resolves(
      {
        'path/pkgA':
        {
          upload_url: 'http://example.com',
          tag_name: 'v1.0.0'
        },
        '.': {
          upload_url: 'http://example.com',
          tag_name: 'v1.0.0'
        }
      })

    const manifestReleasePRStub = runCommandStub.withArgs('manifest-pr').returns(25)

    await action.main()

    sinon.assert.calledOnce(manifestReleaseStub)
    sinon.assert.calledOnce(manifestReleasePRStub)
    assert.deepStrictEqual(output, {
      releases_created: true,
      release_created: true,
      'path/pkgA--upload_url': 'http://example.com',
      'path/pkgA--tag_name': 'v1.0.0',
      'path/pkgA--release_created': true,
      tag_name: 'v1.0.0',
      upload_url: 'http://example.com',
      pr: 25
    })
  })

  it('opens PR only for manifest-pr', async () => {
    input = { command: 'manifest-pr' }

    const runCommandStub = sandbox.stub(factory, 'runCommand')
    const manifestReleasePRStub = runCommandStub.withArgs('manifest-pr').returns(25)

    await action.main()

    sinon.assert.calledOnce(manifestReleasePRStub)
    assert.deepStrictEqual(output, {
      pr: 25
    })
  })
})
