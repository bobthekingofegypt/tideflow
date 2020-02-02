import { Roles } from 'meteor/alanning:roles'

import { Teams } from '/imports/modules/teams/both/collection'
import { isAdmin, isMember, matchRole } from '../both/teams'

import { ROLES } from '../both/teams'

/**
 * 
 * @param {Object} user A user, as stored in database
 */
const userTeamName = user => {
  if (!user) return 'Team'
  if (user.profile && user.profile.firstName)
    return `${user.profile.firstName || 'User'}'s Team`

  return 'User\'s team'
}

/**
 * 
 * @param {*} user 
 * @param {*} teamName 
 */
const createUsersTeam = (user, teamName) => {
  if (!teamName) teamName = userTeamName(user)
  Roles.addUsersToRoles(user._id, ROLES.ADMIN, teamName)
}

module.exports.createUsersTeam = createUsersTeam

const removeUser = (user, team) => {
  let fullTeam = team._id ? team : Teams.findOne({_id: team})
  if (!fullTeam) throw 'no-team'

  let userId = user._id || user

  let userIsMember = isMember(user, fullTeam)

  if (!userIsMember) throw 'member-not-found'

  return Teams.update({_id: fullTeam._id}, {
    $pull: {
      members: {
        user: userId
      }
    }
  })
}

module.exports.removeUser = removeUser

const setRole = (user, team, role) => {
  let userId = user._id || user

  let fullTeam = team._id ? team : Teams.findOne({_id: team})
  if (!fullTeam) throw 'no-team'

  let userIsMember = isMember(user, fullTeam)

  if (userIsMember) {
    return Teams.update({
      _id: fullTeam._id,
      'members.user': userId
    }, {
      $set: {
        'members.$.role': role
      }
    })
  }
  else {
    return Teams.update({_id: fullTeam._id}, {
      $addToSet: {
        members: {
          user: userId,
          role: role
        }
      }
    })
  }
}

module.exports.setRole = setRole