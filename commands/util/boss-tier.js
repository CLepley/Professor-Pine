"use strict";

const log = require('loglevel').getLogger('BossTierCommand'),
  Commando = require('discord.js-commando'),
  {CommandGroup, PartyType} = require('../../app/constants'),
  Helper = require('../../app/helper'),
  PartyManager = require('../../app/party-manager'),
  settings = require('../../data/settings');

class BossTierCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'boss-tier',
      group: CommandGroup.UTIL,
      memberName: 'boss-tier',
      aliases: ['bosstier', 'boss-level'],
      description: 'Changes the pokémon for an existing raid, usually to specify the actual raid boss for a now-hatched egg.',
      details: 'Use this command to set the pokémon of a raid.',
      examples: ['\t!boss-tier deoxys', '\t!boss-level mawile'],
      args: [
        {
          key: 'pokemon',
          prompt: 'What pokémon are you attempting to look up?\nExample: `lugia`\n',
          type: 'pokemon',
        }
      ],
      argsPromptLimit: 3,
      guildOnly: true
    });
  }

  async run(message, args) {
    const pokemon = args['pokemon'];

    message.react(Helper.getEmoji(settings.emoji.thumbsUp) || '👍')
      .then(result => {
        let name = pokemon.name.split('');
        name[0] = name[0].toUpperCase();
        name = name.join('');
        let tier = ' tier ' + pokemon.tier + '';
        if (pokemon.exclusive) {
          tier = 'n exclusive';
        }
        message.channel.send(name + ' is a' + tier + ' raid boss.');

        return true;
      })
      .catch(err => log.error(err));
  }
}

module.exports = BossTierCommand;
