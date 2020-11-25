const { describe, it } = require('mocha')
const action = require('../')
const assert = require('assert')
const core = require('@actions/core')
const sinon = require('sinon')

describe('release-please-action', () => {
  it('both opens PR and tags GitHub releases by default', async () => {
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
    action.getGitHubRelease = () => {
      class Release {}
      Release.prototype.createRelease = createRelease
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
    sinon.assert.calledOnce(createRelease)
    sinon.assert.calledOnce(releasePR)
    assert.deepStrictEqual(output, {
      release_created: true,
      upload_url: 'http://example.com',
      tag_name: 'v1.0.0'
    })
  })

  it('only opens PRs if, command set to release-pr', async () => {
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
    sinon.assert.notCalled(githubRelease)
    sinon.assert.calledOnce(releasePR)
  })

  it('only opens tags releases, if command set to github-release', async () => {
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
})
