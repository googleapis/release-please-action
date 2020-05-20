# Changelog

### [1.2.2](https://www.github.com/bcoe/release-please-action/compare/v1.2.1...v1.2.2) (2020-05-20)


### Bug Fixes

* **build:** only run build-and-tag-action if tag_name is set ([2618be4](https://www.github.com/bcoe/release-please-action/commit/2618be43e7fa68dee5840c03a7380aaa27c369b0))
* **build:** rollback build-and-tag-action until we can figure out how to handle alternate branches ([817c3e7](https://www.github.com/bcoe/release-please-action/commit/817c3e72f48b11043a75f3fccea0332af149833b))
* name in steps should be name ([#17](https://www.github.com/bcoe/release-please-action/issues/17)) ([7e515eb](https://www.github.com/bcoe/release-please-action/commit/7e515ebd488e95f21f30fa1db2335eb309a0fc4b))

### [1.2.2](https://www.github.com/bcoe/release-please-action/compare/v1.2.1...v1.2.2) (2020-05-20)


### Bug Fixes

* name in steps should be id ([#17](https://www.github.com/bcoe/release-please-action/issues/17)) ([7e515eb](https://www.github.com/bcoe/release-please-action/commit/7e515ebd488e95f21f30fa1db2335eb309a0fc4b))

### [1.2.1](https://www.github.com/bcoe/release-please-action/compare/v1.2.0...v1.2.1) (2020-05-20)


### Bug Fixes

* tag_name was not fetched from correct step ([#15](https://www.github.com/bcoe/release-please-action/issues/15)) ([9f5401a](https://www.github.com/bcoe/release-please-action/commit/9f5401ae9ac0ed00aecf5801b263827ff4007bfd))

## [1.2.0](https://www.github.com/bcoe/release-please-action/compare/v1.1.0...v1.2.0) (2020-05-20)


### Features

* use build-and-tag-action for creating dist ([#12](https://www.github.com/bcoe/release-please-action/issues/12)) ([8352160](https://www.github.com/bcoe/release-please-action/commit/83521609fe05585dab4e2aa1dbaaf8c4f85ce3c2))


### Bug Fixes

* staticBuild should be buildStatic ([#14](https://www.github.com/bcoe/release-please-action/issues/14)) ([4fe16cd](https://www.github.com/bcoe/release-please-action/commit/4fe16cde13dddf21297d5e85f1b95973322c283e))

## [1.1.0](https://www.github.com/bcoe/release-please-action/compare/v1.0.1...v1.1.0) (2020-05-18)


### Features

* Add `bump-minor-pre-major` option ([#9](https://www.github.com/bcoe/release-please-action/issues/9)) ([788c495](https://www.github.com/bcoe/release-please-action/commit/788c495e2607702ce5ab41e9e246161d07fe8854))

### [1.0.1](https://www.github.com/bcoe/release-please-action/compare/v1.0.0...v1.0.1) (2020-05-09)


### Bug Fixes

* pass token to create release ([3ad91fa](https://www.github.com/bcoe/release-please-action/commit/3ad91fa6cb8cf2c05464672da14cbea65555e5a2))

## 1.0.0 (2020-05-09)


### ⚠ BREAKING CHANGES

* initial implementation of logic for running release please

### Features

* handle creating releases ([#3](https://www.github.com/bcoe/release-please-action/issues/3)) ([e72afe0](https://www.github.com/bcoe/release-please-action/commit/e72afe059a2eae50d319b3a4cee2a31479886fe8))
* initial implementation of logic for running release please ([196390b](https://www.github.com/bcoe/release-please-action/commit/196390b8667a14c2ab16f53ba086c11afee28327))
