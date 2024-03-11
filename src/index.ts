import type Serverless from 'serverless'
import type ServerlessPlugin from 'serverless/classes/Plugin'

const buildServerlessV3LoggerFromLegacyLogger = (
  legacyLogger: Serverless['cli'],
  verbose?: boolean
): ServerlessPlugin.Logging['log'] => ({
  error: legacyLogger.log.bind(legacyLogger),
  warning: legacyLogger.log.bind(legacyLogger),
  notice: legacyLogger.log.bind(legacyLogger),
  info: legacyLogger.log.bind(legacyLogger),
  debug: verbose ? legacyLogger.log.bind(legacyLogger) : () => null,
  verbose: legacyLogger.log.bind(legacyLogger),
  success: legacyLogger.log.bind(legacyLogger),
})

export default class ServerlessExports implements ServerlessPlugin {
  serverless: Serverless
  options: Serverless.Options
  hooks: ServerlessPlugin.Hooks
  commands?: ServerlessPlugin.Commands | undefined
  variableResolvers?: ServerlessPlugin.VariableResolvers | undefined
  configurationVariablesSources?: ServerlessPlugin.ConfigurationVariablesSources | undefined
  provider?: string | import("serverless/plugins/aws/provider/awsProvider") | undefined
  serviceDirPath: string;
  log: ServerlessPlugin.Logging['log'];

  constructor(serverless: Serverless, options: Serverless.Options, logging?: ServerlessPlugin.Logging) {
    this.serverless = serverless
    this.options = options
    this.log = logging?.log || buildServerlessV3LoggerFromLegacyLogger(this.serverless.cli, this.options.verbose);

    this.serviceDirPath = this.serverless.config.serviceDir || this.serverless.config.servicePath;

    this.hooks = {
      initialize: () => this.onInit(),
      'before:package:initialize': () => this.onBeforePackage(),
      'after:package:initialize': () => this.onAfterPackage(),
    }
  }
  /**
   * Handler for initialize hook
   * @memberof ServerlessExports
   */
  onInit() {    
    if (!Object.keys(this.serverless.service.initialServerlessConfig??{}).length) return
    const parsedStackOutputs = this.parseStackOutputs()

    this.serverless.service.initialServerlessConfig.resources.Outputs =
      parsedStackOutputs
  }
  onBeforePackage() {
    console.dir('onBeforePackage')
    console.dir(this.serverless.service.initialServerlessConfig.resources.Outputs.queueArn)
  }
  onAfterPackage() {
    console.dir('onAfterPackage')
    console.dir(this.serverless.service.initialServerlessConfig.resources)
  }

  /**
   * scans for `Outputs` declared at resource level
   *
   * @return {*}
   * @memberof ServerlessExports
   */
  parseResourceOutputs() {
    const { Resources = [] } =
      this.serverless.service.initialServerlessConfig.resources ?? {}

      const outputs: Array<{ [key: string]: any }> = []

    // for each Resource in stack
    Object.keys(Resources).forEach((key) => {
      // check for explicit & valid `Outputs` object declaration
      if (
        Resources[key].hasOwnProperty('Outputs') &&
        typeof Resources[key].Outputs === 'object'
      ) {
        Object.keys(Resources[key].Outputs).forEach((e) =>
          outputs.push({ key: e, value: Resources[key].Outputs[e] })
        )

        delete Resources[key].Outputs
      }
    })
    return outputs
  }

  /**
   * scan & parse `Outputs` from serverless config
   *
   * @return {*}
   * @memberof ServerlessExports
   */
  parseStackOutputs() {
    const { Outputs: originalOutputs = {} } =
      this.serverless.service.initialServerlessConfig.resources ?? {}

    const outputs: { [key: string]: any } = {}

    Object.keys(originalOutputs).forEach((key: string) => {
      // valid object check
      if (
        originalOutputs[key] !== undefined &&
        !Array.isArray(originalOutputs[key]) &&
        typeof originalOutputs[key] === 'object'
      ) {
        // skip for "Value" or "Export" entries
        if (
          originalOutputs[key].hasOwnProperty('Value') ||
          originalOutputs[key].hasOwnProperty('Export')
        ) {
          outputs[key] = originalOutputs[key]
        } else {
          const exportPair = originalOutputs[key]

          if (Object.keys(exportPair).length !== 1) {
            throw new Error('Expected single key value pair to export')
          }

          // re-mapping arbitary objects to named exports as per cloudformation schema
          outputs[key] = {
            Export: { Name: Object.keys(exportPair)[0] },
            Value: Object.values(exportPair)[0],
          }
        }
      } else if (typeof originalOutputs[key] === 'string') {
        // re-mapping non-object key-value pairs to standard exports
        outputs[key] = {
          Value: originalOutputs[key],
          // Export: { Name: key },
        }
      }
    })
    // checking for outputs declared at resource level
    const resourceOutputs: Array<{ [key: string]: any }> =
      this.parseResourceOutputs()

    for (const resOp of resourceOutputs) {
      if (outputs[resOp.key]) {
        // report when an output is already declared at stack level
        throw new Error(`Duplicate export key '${resOp.key}'`)
      }
      // putting all the resource level outputs to stack outputs
      outputs[resOp.key] = { Value: resOp.value }
    }
    return outputs
  }
}

module.exports = ServerlessExports
