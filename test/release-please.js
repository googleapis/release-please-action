const { describe, it } = require('mocha')
const action = require('../')
const assert = require('assert')
const core = require('@actions/core')
const sinon = require('sinon')

describe('release-please-action', () => {
  it('both opens PR to the default branch and tags GitHub releases by default', async () => {
    const output = {}
    core.setOutput = (name, value) => {
      output[name] = value
    }
    const input = {
      'release-type': 'node'
    }
    core.getInput = (name) => {
      return input[name]
    }
    const createRelease = sinon.stub().returns({
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0'
    })
    let ReleaseStub = sinon.stub()
    action.getGitHubRelease = () => {
      class Release {
        createRelease () {}
      }
      ReleaseStub = sinon.spy(function () {
        const instance = sinon.createStubInstance(Release)
        instance.createRelease = createRelease
        return instance
      })
      return ReleaseStub
    }

    let GithubReleasePRStub = sinon.stub()
    const runStub = sinon.stub().returns(25)

    action.getReleasePR = () => {
      class GithubReleasePR {
        run () {}
      }
      GithubReleasePRStub = sinon.spy(function () {
        const instance = sinon.createStubInstance(GithubReleasePR)
        instance.run = runStub
        return instance
      })
      return GithubReleasePRStub
    }

    await action.main()

    sinon.assert.calledOnce(createRelease)
    sinon.assert.calledWith(ReleaseStub, sinon.match.hasOwn('defaultBranch', undefined))
    sinon.assert.calledOnce(runStub)
    sinon.assert.calledWith(GithubReleasePRStub, sinon.match.hasOwn('defaultBranch', undefined))
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
      return input[name]
    }
    const createRelease = sinon.stub().returns({
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0'
    })

    let ReleaseStub = sinon.stub()
    action.getGitHubRelease = () => {
      class Release {
        createRelease () {}
      }
      ReleaseStub = sinon.spy(function () {
        const instance = sinon.createStubInstance(Release)
        instance.createRelease = createRelease
        return instance
      })
      return ReleaseStub
    }

    let GithubReleasePRStub = sinon.stub()
    const runStub = sinon.stub().returns(25)

    action.getReleasePR = () => {
      class GithubReleasePR {
        run () {}
      }
      GithubReleasePRStub = sinon.spy(function () {
        const instance = sinon.createStubInstance(GithubReleasePR)
        instance.run = runStub
        return instance
      })
      return GithubReleasePRStub
    }

    await action.main()

    sinon.assert.calledOnce(createRelease)
    sinon.assert.calledWith(ReleaseStub, sinon.match.hasOwn('defaultBranch', 'dev'))
    sinon.assert.calledOnce(runStub)
    sinon.assert.calledWith(GithubReleasePRStub, sinon.match.hasOwn('defaultBranch', 'dev'))
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
      return input[name]
    }
    const githubRelease = sinon.stub().returns({
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0'
    })
    action.getGitHubRelease = () => {
      class Release {}
      Release.prototype.createRelease = githubRelease
      return Release
    }

    let GithubReleasePRStub = sinon.stub()
    const runStub = sinon.stub().returns(25)

    action.getReleasePR = () => {
      class GithubReleasePR {
        run () {}
      }
      GithubReleasePRStub = sinon.spy(function () {
        const instance = sinon.createStubInstance(GithubReleasePR)
        instance.run = runStub
        return instance
      })
      return GithubReleasePRStub
    }

    await action.main()
    sinon.assert.notCalled(githubRelease)
    sinon.assert.calledOnce(runStub)
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
      return input[name]
    }
    const githubRelease = sinon.stub().returns({
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0'
    })
    action.getGitHubRelease = () => {
      class Release {}
      Release.prototype.createRelease = githubRelease
      return Release
    }
    const releasePR = sinon.stub()
    action.getReleasePRFactory = () => {
      return {
        buildStatic: () => {
          return {
            run: releasePR
          }
        }
      }
    }
    await action.main()
    sinon.assert.calledOnce(githubRelease)
    sinon.assert.notCalled(releasePR)
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
      return input[name]
    }
    const githubRelease = sinon.stub().returns(expected)
    action.getGitHubRelease = () => {
      class Release {}
      Release.prototype.createRelease = githubRelease
      return Release
    }
    const releasePR = sinon.stub()
    action.getReleasePRFactory = () => {
      return {
        buildStatic: () => {
          return {
            run: releasePR
          }
        }
      }
    }
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
      return input[name]
    }
    let GithubReleasePRStub = sinon.stub()
    const runStub = sinon.stub().returns(95)

    action.getReleasePR = () => {
      class GithubReleasePR {
        run () {}
      }
      GithubReleasePRStub = sinon.spy(function () {
        const instance = sinon.createStubInstance(GithubReleasePR)
        instance.run = runStub
        return instance
      })
      return GithubReleasePRStub
    }
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
      return input[name]
    }
    let GithubReleasePRStub = sinon.stub()
    const runStub = sinon.stub().returns(undefined)

    action.getReleasePR = () => {
      class GithubReleasePR {
        run () {}
      }
      GithubReleasePRStub = sinon.spy(function () {
        const instance = sinon.createStubInstance(GithubReleasePR)
        instance.run = runStub
        return instance
      })
      return GithubReleasePRStub
    }
    await action.main()
    assert.strictEqual(Object.hasOwnProperty.call(output, 'pr'), false)
  })
})
