import i18n from 'meteor/universe:i18n'

import { Services } from "/imports/modules/services/both/collection.js"

import { servicesAvailable } from '/imports/services/_root/server'

import { stepData } from '/imports/queue/server'

import { ioTo } from './socket'

const uuidv4 = require('uuid/v4')

const service = {
  name: 'agent',
  humanName: i18n.__('s-agent.name'),
  inputable: false,
  stepable: true,
  ownable: true,
  templates: {
    detailsView: 'servicesAgentDetailsView',
    createMini: 'servicesAgentCreateMini',
    createFormPre: 'servicesAgentCreateFormPre',
    updateFormPre: 'servicesAgentUpdateFormPre'
  },
  hooks: {
    // step: {},
    // trigger: {}
    service: {
      create: {
        pre: (service) => {
          return Object.assign(service, {
            config: { token: uuidv4() }
          }) 
        }
      },
      update: {
        pre: (existing, update) => {
          const { token } = existing.config
          const config = Object.assign(update.config || {}, { token })
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
      name: 'execute',
      humanName: i18n.__('s-agent.events.command.name'),
      visibe: true,
      callback: (service, flow, user, currentStep, executionLogs, executionId, logId, cb) => {
        const attachPrevious = (currentStep.config.inputLast || '') === 'yes'
        const lastData = stepData(executionLogs, 'previous')

        const agent = currentStep.config.agent

        let agentDoc

        if (agent === 'any') {
          agentDoc = agent
        }
        else {
          agentDoc = Services.findOne({_id: agent})
        }

        let commandSent = ioTo(agentDoc, {
          flow: flow._id,
          execution: executionId,
          log: logId,
          step: currentStep._id,
          command: currentStep.config.command,
          previous: attachPrevious ? JSON.stringify(lastData) : null
        })

        let callParameters = [currentStep.config.command]

        if (agentDoc) {
          callParameters.push(agentDoc._id || agentDoc)
        }
        
        cb(null, {
          result: [],
          next: false,
          error: !commandSent,
          msgs: [
            {
              m: commandSent ? 's-agent.log.execute_sent' : 's-agent.log.execute_notsent',
              err: !commandSent,
              p: callParameters,
              d: new Date()
            }
          ]
        })
      },
      conditions: [
        // {}
      ]
    },
    /*{
      name: 'nodejs',
      humanName: i18n.__('s-agent.events.nodejs.name'),
      visibe: true,
      callback: () => {},
      conditions: [
        // {}
      ]
    }*/
  ]
}

module.exports.service = service

servicesAvailable.push(service)