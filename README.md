# serverless-exports
[![prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![license](https://img.shields.io/npm/l/serverless-offline.svg?style=flat-square)](#license)
[![build status](https://img.shields.io/github/actions/workflow/status/distinction-dev/serverless-exports/release.yml?branch=master)](https://github.com/distinction-dev/serverless-exports/actions)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/distinction-dev/serverless-exports/total)
![GitHub Release](https://img.shields.io/github/v/release/distinction-dev/serverless-exports)


This repository is used to create a serverless plugin that makes writing Output for Resources in a developer friendly way inside serverless.yml file

### 📦 Install
```sh
npm i -D serverless-exports
# or
yarn add -D serverless-exports
```

### Features & Usage

Add the plugin before any other plugin
```yaml
plugins:
  - serverless-exports
  - ...
```

Export cloudformation stack outputs in `key: value` pairs -
```yaml
...
Outputs:
  exportKey: exportValue

```
or if you want to give your key a different name instead of the logical Id, you can define like below -
```yaml
Outputs:
  <logicalId>:
    your_output_key_name: "some value"
```
`your_output_key_name` will be available as an exported key in your stack.

You can also directly declare your exports at `Resource` level if required
```yaml
Resources:
  myQueue:
    Type: AWS::SQS::Queue
    Outputs:
     myKey: myValue
```
`myKey` will be available in your stack outputs that you can refer to

> **Note**: Duplicate keys declared across the `Outputs` and all the `Resources` will be rejected

