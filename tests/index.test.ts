import Serverless from 'serverless'
import type Service from 'serverless/classes/Service'
import { Config } from 'serverless'

import ServerlessExports from '../src'

const getSls = ({
  serviceOverride,
  configOverride,
  configSchemaHandlerOverride,
}: {
  serviceOverride?: Partial<Service>
  configOverride?: Partial<Config>
  configSchemaHandlerOverride?: object
}): Serverless => {
  const service = {
    configValidationMode: 'error',
    disabledDeprecations: false,
    initialServerlessConfig: {},
    ...serviceOverride,
  } as Service

  const config = {
    serviceDir: process.cwd(),
    servicePath: process.cwd(),
    ...configOverride,
  }

  const configSchemaHandler = {
    defineCustomProperties: jest.fn(),
    defineFunctionEvent: jest.fn(),
    defineFunctionEventProperties: jest.fn(),
    defineFunctionProperties: jest.fn(),
    defineProvider: jest.fn(),
    defineTopLevelProperty: jest.fn(),
    ...configSchemaHandlerOverride,
  }

  return {
    service,
    config,
    configSchemaHandler,
    cli: {
      log: jest.fn(),
    },
  } as Partial<Serverless> as Serverless
}

const mockOptions: Serverless.Options = {
  verbose: true,
  // region: 'us-east-1',
  // stage: 'test'
}

describe('Stack Outputs', () => {
  it('Should not error with minimal config', () => {
    const plugin = new ServerlessExports(getSls({}), mockOptions)
    expect(typeof plugin.hooks.initialize).toBe('function')
  })
  it('Should export primitive outputs', async () => {
    const serverlessInstance = getSls({
      serviceOverride: {
        initialServerlessConfig: {
          resources: {
            Outputs: {
              key: 'value',
            },
          },
        },
      },
    })
    const plugin = new ServerlessExports(serverlessInstance, mockOptions)
    plugin.hooks.initialize?.()
    const { Outputs: parsedOutputs } =
      serverlessInstance.service.initialServerlessConfig.resources
    expect(parsedOutputs).toStrictEqual({ key: { Value: 'value' } })
  })
  it('Should export explicit key outputs', async () => {
    const serverlessInstance = getSls({
      serviceOverride: {
        initialServerlessConfig: {
          resources: {
            Outputs: {
              logicalId: { myKey: 'myValue' },
            },
          },
        },
      },
    })
    const plugin = new ServerlessExports(serverlessInstance, mockOptions)
    plugin.hooks.initialize?.()
    const { Outputs: parsedOutputs } =
      serverlessInstance.service.initialServerlessConfig.resources
    expect(parsedOutputs).toStrictEqual({
      logicalId: { Export: { Name: 'myKey' }, Value: 'myValue' },
    })
  })
  it('Should not alter standard Outputs with `Export` or `Value`', async () => {
    const stackOutputs = {
      readOnlyKey: {
        Value: 'ExportValue',
        Export: {
          Name: 'ExportKey',
        },
      },
    }
    const serverlessInstance = getSls({
      serviceOverride: {
        initialServerlessConfig: {
          resources: {
            Outputs: stackOutputs,
          },
        },
      },
    })
    const plugin = new ServerlessExports(serverlessInstance, mockOptions)
    plugin.hooks.initialize?.()
    const { Outputs: parsedOutputs } =
      serverlessInstance.service.initialServerlessConfig.resources
    expect(parsedOutputs).toStrictEqual(stackOutputs)
  })
  it('Should handle serverless attrs', async () => {
    const stackOutputs = {
      queueArn: { Value: 'Fn::GetAtt[queue, Arn]' },
    }
    const serverlessInstance = getSls({
      serviceOverride: {
        initialServerlessConfig: {
          resources: {
            Resources: {
              queue: 'Type: AWS::SQS::Queue',
              Properties: {
                QueueName: 'queue',
              },
            },
            Outputs: {
              queueArn: 'Fn::GetAtt[queue, Arn]',
            },
          },
        },
      },
    })
    const plugin = new ServerlessExports(serverlessInstance, mockOptions)
    plugin.hooks.initialize?.()
    const { Outputs: parsedOutputs } =
      serverlessInstance.service.initialServerlessConfig.resources
    expect(parsedOutputs).toStrictEqual(stackOutputs)
  })
  // it("Should update resource exports", () => {});

  // it("Should handle exports for standard objects with explicit export name", () => {});
  // it("Should handle exports for Ref attr", () => {});
  // it("Should handle exports for Fn attr", () => {});

  // it("Should not leave console trace without debug flag", () => {});
  // it("Should fail for duplicate exports declared across stack and resources", () => {});
  // it("Should fail for duplicate exports declared across stack and resources", () => {});
})
describe('Resource Outputs', () => {
  it('Should export primitive outputs', async () => {
    const serverlessInstance = getSls({
      serviceOverride: {
        initialServerlessConfig: {
          resources: {
            Resources: {
              Q: {
                Type: 'AWS::SQS::Queue',
                Outputs: {
                  key: 'value',
                },
                Properties: {
                  QueueName: 'Q',
                },
              },
            },
          },
        },
      },
    })
    const plugin = new ServerlessExports(serverlessInstance, mockOptions)
    plugin.hooks.initialize?.()
    const { Resources: parsedResources, Outputs: parsedOutputs } =
      serverlessInstance.service.initialServerlessConfig.resources
    expect(parsedResources).toStrictEqual({
      Q: {
        Type: 'AWS::SQS::Queue',
        Properties: { QueueName: 'Q' },
      },
    })
    expect(parsedOutputs).toStrictEqual({ key: { Value: 'value' } })
  })

  it('Should handle serverless attrs', async () => {
    const serverlessInstance = getSls({
      serviceOverride: {
        initialServerlessConfig: {
          resources: {
            Resources: {
              Q: {
                Type: 'AWS::SQS::Queue',
                Outputs: {
                  key: 'Fn::GetAtt[Q, Arn]',
                },
                Properties: {
                  QueueName: 'Q',
                },
              },
            },
          },
        },
      },
    })
    const plugin = new ServerlessExports(serverlessInstance, mockOptions)
    plugin.hooks.initialize?.()
    const { Resources: parsedResources, Outputs: parsedOutputs } =
      serverlessInstance.service.initialServerlessConfig.resources
    expect(parsedResources).toStrictEqual({
      Q: {
        Type: 'AWS::SQS::Queue',
        Properties: { QueueName: 'Q' },
      },
    })
    expect(parsedOutputs).toStrictEqual({
      key: { Value: 'Fn::GetAtt[Q, Arn]' },
    })
  })
  // it("Should handle exports for Ref attr", () => {});
  // it("Should handle exports for Fn attr", () => {});

  // it("Should not leave console trace without debug flag", () => {});
  it('Should fail for duplicate exports declared across stack and resources', () => {
    const serverlessInstance = getSls({
      serviceOverride: {
        initialServerlessConfig: {
          resources: {
            Resources: {
              Q: {
                Type: 'AWS::SQS::Queue',
                Outputs: {
                  key: 'value',
                },
                Properties: {
                  QueueName: 'Q',
                },
              },
            },
            Outputs: {
              key: 'value',
            },
          },
        },
      },
    })
    const plugin = new ServerlessExports(serverlessInstance, mockOptions)
    expect(plugin.hooks.initialize).toThrow(`Duplicate export key 'key'`)
  })
})
