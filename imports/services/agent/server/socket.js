import { Meteor } from 'meteor/meteor'

import http from 'http'
import socket_io from 'socket.io'

import { Services } from '/imports/modules/services/both/collection.js'

import { logUpdate, executeNextStep, executionError } from '/imports/queue/server'
import { pick } from '/imports/helpers/both/objects'

// Server
const server = http.createServer()
const io = socket_io(server)

Meteor.startup(async () => {
  await Services.update(
    {
      type: 'agent'
    },
    { 
      $set: {
        'details.online': false,
      },
      $unset: { 'secrets.socketId': '' }
    },
    { multi: true }
  )
  
  // middleware
  io.use(async (socket, next) => {
    let token = socket.handshake.query.token
    let c = await Services.findOne({
      type: 'agent',
      'config.token': token
    })
    if (c) {
      socket.tf = {
        _id: c._id,
        token,
        user: c.user,
        title: c.title,
        description: c.description
      }
      return next()
    }
    return next(new Error('authentication error'))
  })

  // New client
  io.on('connection', async (socket) => {
    let auth = socket.tf
    await Services.update(
      { _id: auth._id },
      { 
        $set: {
          'details.online': true,
          'secrets.socketId': socket.id
        },
        $unset: { 'details.lastSeen': '' }
      }
    )
    
    socket.emit('tf.authz', auth)

    // An agent is reporting std/err output.
    // Add this to the list of messages for the workflow's execution step.
    socket.on('tf.notify.progress', async message => {
      let date = message.date || new Date()
      let err = !!(message.stderr && message.stderr.length)
      let msgs = err ? message.stderr : message.stdout
      await logUpdate(
        message.execution,
        message.log,
        msgs.map(msg => { return { m: msg, p: null, err, d: date } })
      )
    })

    // An agent is reporting std/err output.
    // Add this to the list of messages for the workflow's execution step.
    socket.on('tf.notify.finishBulk', async message => {
      let err = !!message.code

      await logUpdate(
        message.execution,
        message.log,
        message.stdLines.map(line => { return { 
          m: line.output,
          p: null,
          err: line.err,
          d: line.date
        } }),
        { status: err ? 'error' : 'success' }
      )

      if (err) {
        executionError(pick(message, ['flow', 'execution']))
      }
      else {
        executeNextStep(pick(message, ['flow', 'execution', 'log', 'step']))
      }
    })

    // An agent is reporting std/err and the exit code
    // Add this to the list of messages for the workflow's execution step.
    socket.on('tf.notify.finish', async message => {
      let msgs = message.stdout || message.stderr
      let err = !!(message.stderr && message.stderr.length)

      await logUpdate(
        message.execution,
        message.log,
        msgs.map(msg => { return { m: msg, p: null, err, d: new Date() } }),
        { status: err ? 'error' : 'success' }
      )

      if (err) {
        executionError(pick(message, ['flow', 'execution']))
      }
      else {
        executeNextStep(pick(message, ['flow', 'execution', 'log', 'step']))
      }
      // Once reported, check if the Workflow have more steps to execute
    })

    // An agent is reporting an exception when executing the command
    socket.on('tf.notify.exception', async message => {
      console.log('tf.notify.exception', message)
      await logUpdate(
        message.execution,
        message.log,
        [
          { m: message.ex, p: null, err: true, d: new Date() }
        ],
        { status: 'error' }
      )
      executionError(pick(message, ['flow', 'execution']))
    })
    
    socket.on('disconnect', async socket => {
      await Services.update(
        { _id: auth._id },
        {
          $set: {
            'details.online': false,
            'details.lastSeen': new Date()
          },
          $unset: { 'secrets.socketId': '' }
        }
      )
    })
  })

  // Start server
  try {
    server.listen(1337)
  } catch (e) {
    console.error(e)
  }
})

/**
 * Sends a message to an agent.
 * 
 * @param {Object} agent 
 * @param {*} message 
 * @param {*} topic 
 */
const ioTo = (agent, message, topic) => {
  if (agent === 'any') {
    // TODO Select the most recent-online agent and send it the message.
    // If not agents found, set the execution and the step as failed.
  }
  else {
    try {
      if (!agent.secrets.socketId) throw new Error('agent-not-connected')
      return io
        .to(agent.secrets.socketId)
        .emit(topic, message)
    }
    catch (ex) {
      console.error(ex)
      executionError(pick(message, ['flow', 'execution']))
      return null
    }
  }
}

module.exports.ioTo = ioTo