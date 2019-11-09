import { servicesAvailable } from '/imports/services/_root/server'

import { ioTo } from '/imports/services/agent/server/socket'

import { Services } from "/imports/modules/services/both/collection.js"

import { createCheckrun, updateCheckrun } from './ghApi'

const uuidv4 = require('uuid/v4')

const sendAgent = (agentId, flow, executionId, logId, currentStep, topic, data) => {
  const agentDoc = agentId === 'any' ? 'any' : Services.findOne({_id: agentId})
  return ioTo(agentDoc, Object.assign( {
    flow: flow._id,
    execution: executionId,
    log: logId,
    step: currentStep ? currentStep._id : null
  }, data || {}), topic)
}

const service = {
  name: 'gh-ci',
  inputable: true,
  stepable: false,
  ownable: true,
  hooks: {
    // step: {},
    // trigger: {}
    service: {
      create: {
        pre: (service) => {
          return Object.assign(service, {
            config: {
              endpoint: uuidv4(),
              secret: uuidv4() 
            }
          }) 
        }
      },
      update: {
        pre: (existing, update) => {
          const { endpoint, secret } = existing.config
          const config = Object.assign(update.config || {}, { endpoint, secret })
          return Object.assign(update, { config }) 
        }
      },
      delete: {
        pre: (service) => {
          return service
        }
      }
    }
  },
  events: [
    {
      name: 'pull_request',
      humanName: 's-gh-ci.events.pull_request.name',
      viewerTitle: 's-gh-ci.events.pull_request.viewer.title',
      inputable: true,
      stepable: false,

      /**
       * @param {object} service Flow's original trigger service, including secrets, etc.
       * @param {object} flow Full flow. The trigger doesn't include secrets, etc.
       * @param {array} triggerData Data which triggered the flow execution.
       * @param {object} user Flow's owner information, excluding password, services, etc. As in database 
       * @param {object} currentStep The flow's current step object
       * @param {array} executionLogs
       * @param {string} executionId
       * @param {string} logId
       * @param {function} cb
       */
      callback: async (service, flow, triggerData, user, currentStep, executionLogs, executionId, logId, cb) => {
        const agent = currentStep.config.agent
        const webhook = executionLogs[0].stepResult.data

        const commandSent = sendAgent(agent, flow, executionId, logId, currentStep, 'tf.githubCi.pullRequest', {
          triggerService: currentStep,
          webhook
        })

        cb(null, {
          result: [],
          next: false,
          error: !commandSent,
          msgs: [
            {
              m: commandSent ? 's-gh-ci.events.pull_request.agent.sent.success' : 's-gh-ci.events.pull_request.agent.sent.error',
              err: !commandSent,
              d: new Date()
            }
          ]
        })
      },

      executionFinished: async (service, flow, triggerData, user, executionId, cb) => {
        const commandSent = sendAgent(flow.trigger.config.agent, flow, executionId, null, null, 'tf.githubCi.pullRequest.execution.finished', {})
        cb(!commandSent, null)
      }
    },
    {
      name: 'push',
      humanName: 's-gh-ci.events.push.name',
      viewerTitle: 's-gh-ci.events.push.viewer.title',
      inputable: true,
      stepable: false,
      
      /**
       * @param {object} service Flow's original trigger service, including secrets, etc.
       * @param {object} flow Full flow. The trigger doesn't include secrets, etc.
       * @param {array} triggerData Data which triggered the flow execution.
       * @param {object} user Flow's owner information, excluding password, services, etc. As in database 
       * @param {object} currentStep The flow's current step object
       * @param {array} executionLogs
       * @param {string} executionId
       * @param {string} logId
       * @param {function} cb
       */
      callback: async (service, flow, triggerData, user, currentStep, executionLogs, executionId, logId, cb) => {
        const agentId = flow.trigger.config.agent
        const commandSent = sendAgent(agentId, flow, executionId, logId, currentStep, 'tf.githubCi.push', {
          triggerService: service,
          webhook: executionLogs[0].stepResult.data
        })

        cb(null, {
          result: [],
          next: false,
          error: !commandSent,
          msgs: [
            {
              m: commandSent ? 's-gh-ci.events.push.agent.sent.success' : 's-gh-ci.events.push.agent.sent.error',
              err: !commandSent,
              d: new Date()
            }
          ]
        })
      },

      executionFinished: async (service, flow, triggerData, user, executionId, cb) => {
        const commandSent = sendAgent(flow.trigger.config.agent, flow, executionId, null, null, 'tf.githubCi.push.execution.finished', {})
        cb(!commandSent, null)
      }
    },



    {
      name: 'checksuite',
      humanName: 's-gh-ci.events.checksuite.name',
      viewerTitle: 's-gh-ci.events.checksuite.viewer.title',
      inputable: true,
      stepable: false,
      
      /**
       * @param {object} service Flow's original trigger service, including secrets, etc.
       * @param {object} flow Full flow. The trigger doesn't include secrets, etc.
       * @param {array} triggerData Data which triggered the flow execution.
       * @param {object} user Flow's owner information, excluding password, services, etc. As in database 
       * @param {object} currentStep The flow's current step object
       * @param {array} executionLogs
       * @param {string} executionId
       * @param {string} logId
       * @param {function} cb
       */
      callback: async (service, flow, triggerData, user, currentStep, executionLogs, executionId, logId, cb) => {
        const agentId = flow.trigger.config.agent
        const commandSent = sendAgent(agentId, flow, executionId, logId, currentStep, 'tf.githubCi.checksuite', {
          triggerService: service,
          webhook: executionLogs[0].stepResult.data
        })

        cb(null, {
          result: [],
          next: false,
          error: !commandSent,
          msgs: [
            {
              m: commandSent ? 's-gh-ci.events.checksuite.agent.sent.success' : 's-gh-ci.events.checksuite.agent.sent.error',
              err: !commandSent,
              d: new Date()
            }
          ]
        })
      },

      executionFinished: async (service, flow, triggerData, user, executionId, cb) => {
        const commandSent = sendAgent(flow.trigger.config.agent, flow, executionId, null, null, 'tf.githubCi.checksuite.execution.finished', {})
        cb(!commandSent, null)
      }
    },

    {
      name: 'run_cmd',
      humanName: 's-gh-ci.events.run_cmd.name',
      viewerTitle: 's-gh-ci.events.run_cmd.viewer.title',
      inputable: false,
      stepable: true,
      templates: {
        eventConfig: 'servicesGithubCiBasicStep'
      },
      
      /**
       * @param {object} service Flow's original trigger service, including secrets, etc.
       * @param {object} flow Full flow. The trigger doesn't include secrets, etc.
       * @param {array} triggerData Data which triggered the flow execution.
       * @param {object} user Flow's owner information, excluding password, services, etc. As in database 
       * @param {object} currentStep The flow's current step object
       * @param {array} executionLogs
       * @param {string} executionId
       * @param {string} logId
       * @param {function} cb
       */
      callback: async (service, flow, triggerData, user, currentStep, executionLogs, executionId, logId, cb) => {
        const agentId = flow.trigger.config.agent
        const cmd = currentStep.config.cmd
        const webhook = triggerData[0].data

        const commandSent = sendAgent(agentId, flow, executionId, logId, currentStep, 'tf.githubCi.run_cmd', {
          cmd,
          webhook,
          currentStep
        })
          
        cb(null, {
          result: [],
          next: false,
          error: !commandSent,
          msgs: [
            {
              m: commandSent ? 's-gh-ci.events.run_cmd.agent.sent.success' : 's-gh-ci.events.run_cmd.agent.sent.error',
              err: !commandSent,
              // p: callParameters,
              d: new Date()
            }
          ]
        })
      }
    },
    // {
    //   name: 'test_cmd',
    //   humanName: 's-gh-ci.events.test_cmd.name',
    //   viewerTitle: 's-gh-ci.events.test_cmd.viewer.title',
    //   inputable: false,
    //   stepable: true,
    //   templates: {
    //     eventConfig: 'servicesGithubCiBasicStep'
    //   },
      
    //   /**
    //    * @param {object} service Flow's original trigger service, including secrets, etc.
    //    * @param {object} flow Full flow. The trigger doesn't include secrets, etc.
    //    * @param {array} triggerData Data which triggered the flow execution.
    //    * @param {object} user Flow's owner information, excluding password, services, etc. As in database 
    //    * @param {object} currentStep The flow's current step object
    //    * @param {array} executionLogs
    //    * @param {string} executionId
    //    * @param {string} logId
    //    * @param {function} cb
    //    */
    //   callback: async (service, flow, triggerData, user, currentStep, executionLogs, executionId, logId, cb) => {
    //     const agentId = flow.trigger.config.agent
    //     const cmd = currentStep.config.cmd
    //     const webhook = triggerData[0].data

    //     let checkRun = null

    //     if (webhook.check_suite) {
    //       // post
    //       checkRun = await createCheckrun(service, webhook.repository, webhook.check_suite, executionId, 'in_progress')
    //     }

    //     // update execution with extras
    //     // this should run after the commands have been run, in the agent service
    //     // await updateCheckrun(service, webhook.repository, webhook.check_suite, checkRun, executionId, 'completed', 'success')

    //     const commandSent = sendAgent(agentId, flow, executionId, logId, currentStep, 'tf.githubCi.test_cmd', {
    //       cmd,
    //       webhook,
    //       currentStep
    //     })
          
    //     cb(null, {
    //       result: [],
    //       next: false,
    //       error: !commandSent,
    //       msgs: [
    //         {
    //           m: commandSent ? 's-gh-ci.events.test_cmd.agent.sent.success' : 's-gh-ci.events.test_cmd.agent.sent.error',
    //           err: !commandSent,
    //           // p: callParameters,
    //           d: new Date()
    //         }
    //       ]
    //     })
    //   }
    // }
  ]
}

module.exports.service = service

servicesAvailable.push(service)