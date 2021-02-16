const { describe, it, afterEach } = require('mocha')
const action = require('../')
const assert = require('assert')
const core = require('@actions/core')
const sinon = require('sinon')
const { factory, GitHubRelease } = require('release-please/build/src')
const { Node } = require('release-please/build/src/releasers/node')
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
  'default-branch': ''
}

const sandbox = sinon.createSandbox()
process.env.GITHUB_REPOSITORY = 'google/cloud'

describe('release-please-action', () => {
  afterEach(() => {
    sandbox.restore()
  })

  const trueValue = ['true', 'True', 'TRUE', 'yes', 'Yes', 'YES', 'y', 'Y', 'on', 'On', 'ON']
  const falseValue = ['false', 'False', 'FALSE', 'no', 'No', 'NO', 'n', 'N', 'off', 'Off', 'OFF']

  trueValue.forEach(value => {
    it(`get the boolean true with the input of '${value}'`, () => {
      const input = {
        fork: value
      }
      core.getInput = (name) => {
        return input[name] || defaultInput[name]
      }
      const actual = action.getBooleanInput('fork')
      assert.strictEqual(actual, true)
    })
  })

  falseValue.forEach(value => {
    it(`get the boolean with the input of '${value}'`, () => {
      const input = {
        fork: value
      }
      core.getInput = (name) => {
        return input[name] || defaultInput[name]
      }
      const actual = action.getBooleanInput('fork')
      assert.strictEqual(actual, false)
    })
  })

  it('get an error when inputting the wrong boolean value', () => {
    const input = {
      fork: 'wrong'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }
    assert.throws(() => {
      action.getBooleanInput('fork')
    }, { name: 'TypeError', message: 'Wrong boolean value of the input \'fork\'' })
  })

  it('both opens PR to the default branch and tags GitHub releases by default', async () => {
    const output = {}
    core.setOutput = (name, value) => {
      output[name] = value
    }
    const input = {
      'release-type': 'node'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    const githubReleaseStub = runCommandStub.withArgs('github-release')
      .returns({
        upload_url: 'http://example.com',
        tag_name: 'v1.0.0'
      })

    const githubReleasePRStub = runCommandStub.withArgs('release-pr')
      .returns(25)

    await action.main()

    sinon.assert.calledOnce(githubReleaseStub)
    sinon.assert.calledOnce(githubReleasePRStub)
    sinon.assert.calledWith(githubReleaseStub, 'github-release', sinon.match.hasOwn('defaultBranch', undefined))
    sinon.assert.calledWith(githubReleasePRStub, 'release-pr', sinon.match.hasOwn('defaultBranch', undefined))
    assert.deepStrictEqual(output, {
      release_created: true,
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0',
      pr: 25
    })
  })

  it('both opens PR to a different default branch and tags GitHub releases by default', async () => {
    const output = {}
    core.setOutput = (name, value) => {
      output[name] = value
    }
    const input = {
      'release-type': 'node',
      'default-branch': 'dev'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    const githubReleaseStub = runCommandStub.withArgs('github-release')
      .returns({
        upload_url: 'http://example.com',
        tag_name: 'v1.0.0'
      })

    const githubReleasePRStub = runCommandStub.withArgs('release-pr')
      .returns(25)

    await action.main()

    sinon.assert.calledOnce(githubReleaseStub)
    sinon.assert.calledWith(githubReleaseStub, 'github-release', sinon.match.hasOwn('defaultBranch', 'dev'))
    sinon.assert.calledOnce(githubReleasePRStub)
    sinon.assert.calledWith(githubReleasePRStub, 'release-pr', sinon.match.hasOwn('defaultBranch', 'dev'))

    assert.deepStrictEqual(output, {
      release_created: true,
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0',
      pr: 25
    })
  })

  it('only opens PR, if command set to release-pr', async () => {
    const output = {}
    core.setOutput = (name, value) => {
      output[name] = value
    }
    const input = {
      'release-type': 'node',
      command: 'release-pr'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    const githubReleaseStub = runCommandStub.withArgs('github-release')
      .returns({
        upload_url: 'http://example.com',
        tag_name: 'v1.0.0'
      })

    const githubReleasePRStub = runCommandStub.withArgs('release-pr')
      .returns(25)

    await action.main()
    sinon.assert.notCalled(githubReleaseStub)
    sinon.assert.calledOnce(githubReleasePRStub)
  })

  it('only creates GitHub release, if command set to github-release', async () => {
    const output = {}
    core.setOutput = (name, value) => {
      output[name] = value
    }
    const input = {
      'release-type': 'node',
      command: 'github-release'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    const githubReleaseStub = runCommandStub.withArgs('github-release')
      .returns({
        upload_url: 'http://example.com',
        tag_name: 'v1.0.0'
      })

    const githubReleasePRStub = runCommandStub.withArgs('release-pr')
      .returns(25)

    await action.main()
    sinon.assert.calledOnce(githubReleaseStub)
    sinon.assert.notCalled(githubReleasePRStub)
  })

  it('sets approprite outputs when GitHub release created', async () => {
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
    const output = {}
    core.setOutput = (name, value) => {
      output[name] = value
    }
    const input = {
      'release-type': 'node',
      command: 'github-release'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    runCommandStub.withArgs('github-release')
      .returns(expected)

    runCommandStub.withArgs('release-pr')
      .returns(25)

    await action.main()
    assert.deepStrictEqual(output, expected)
  })

  it('sets appropriate outputs when release PR opened', async () => {
    const output = {}
    core.setOutput = (name, value) => {
      output[name] = value
    }
    const input = {
      'release-type': 'node',
      command: 'release-pr'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    runCommandStub.withArgs('release-pr')
      .returns(95)

    await action.main()
    assert.strictEqual(output.pr, 95)
  })

  it('does not set PR output, when no release PR is returned', async () => {
    const output = {}
    core.setOutput = (name, value) => {
      output[name] = value
    }
    const input = {
      'release-type': 'node',
      command: 'release-pr'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }

    const runCommandStub = sandbox.stub(factory, 'runCommand')

    runCommandStub.withArgs('release-pr')
      .returns(undefined)

    await action.main()
    assert.strictEqual(Object.hasOwnProperty.call(output, 'pr'), false)
  })

  it('creates and runs a ReleasePR instance, using factory', async () => {
    let maybeReleasePR
    sandbox.replace(factory, 'run', (runnable) => {
      maybeReleasePR = runnable
    })
    const input = {
      'release-type': 'node',
      command: 'release-pr'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }
    await action.main()
    assert.ok(maybeReleasePR instanceof Node)
  })

  it('creates and runs a GitHubRelease, using factory', async () => {
    let maybeGitHubRelease
    sandbox.replace(factory, 'run', (runnable) => {
      maybeGitHubRelease = runnable
    })
    const input = {
      'release-type': 'node',
      command: 'github-release'
    }
    core.getInput = (name) => {
      return input[name] || defaultInput[name]
    }
    await action.main()
    assert.ok(maybeGitHubRelease instanceof GitHubRelease)
  })
})
