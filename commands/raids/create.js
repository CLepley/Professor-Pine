"use strict";

const log = require('loglevel').getLogger('CreateCommand'),
	Commando = require('discord.js-commando'),
	Gym = require('../../app/gym'),
	Raid = require('../../app/raid'),
	Utility = require('../../app/utility'),
	TimeType = require('../../types/time');

class RaidCommand extends Commando.Command {
	constructor(client) {
		super(client, {
			name: 'raid',
			group: 'raid-crud',
			memberName: 'raid',
			aliases: ['create', 'announce'],
			description: 'Announces a new raid.',
			details: 'Use this command to start organizing a new raid.  For your convenience, this command combines several options such that you can set the pokémon, the location, and the end time of the raid all at once.',
			examples: ['\t!raid lugia', '\t!raid zapdos \'manor theater\' 1:43', '\t!raid magikarp olea', '\t!raid ttar \'frog fountain\''],
			throttling: {
				usages: 5,
				duration: 300
			},
			args: [
				{
					key: 'pokemon',
					prompt: 'What pokémon (or tier if unhatched) is this raid?\nExample: `lugia`\n',
					type: 'pokemon',
				},
				{
					key: 'gym_id',
					label: 'gym',
					prompt: 'Where is this raid taking place?\nExample: `manor theater`\n',
					type: 'gym',
					wait: 60
				},
				{
					key: 'time',
					label: 'time left',
					prompt: 'How much time is remaining on the raid?\nExample: `1:43`\n',
					type: 'time',
					default: TimeType.UNDEFINED_END_TIME
				}
			],
			argsPromptLimit: 3,
			guildOnly: true
		});

		client.dispatcher.addInhibitor(message => {
			if (!!message.command && message.command.name === 'raid' &&
				(Raid.validRaid(message.channel.id) || !Gym.isValidChannel(message.channel.name))) {
				return ['invalid-channel', message.reply('Create raids from region channels!')];
			}
			return false;
		});
	}

	async run(message, args) {
		const pokemon = args['pokemon'],
			gym_id = args['gym_id'],
			time = args['time'];

		let raid,
			responses = [];

		Raid.createRaid(message.channel.id, message.member.id, pokemon, gym_id, time)
			.then(async info => {
				Utility.cleanConversation(message, true);

				raid = info.raid;
				const raid_channel_message = await Raid.getRaidChannelMessage(raid),
					formatted_message = await Raid.getFormattedMessage(raid),
					announcement_message = message.channel.send(raid_channel_message, formatted_message);

				responses.push(announcement_message);

				return announcement_message;
			})
			.then(announcement_message => {
				return Raid.setAnnouncementMessage(raid.channel_id, announcement_message);
			})
			.then(async bot_message => {
				const raid_source_channel_message = await Raid.getRaidSourceChannelMessage(raid),
					formatted_message = await Raid.getFormattedMessage(raid);
				return Raid.getChannel(raid.channel_id)
					.then(channel => channel.send(raid_source_channel_message, formatted_message))
					.catch(err => log.error(err));
			})
			.then(channel_raid_message => {
				Raid.addMessage(raid.channel_id, channel_raid_message, true);
			})
			.catch(err => log.error(err));

		return responses;
	}
}

module.exports = RaidCommand;
