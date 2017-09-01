"use strict";

const Commando = require('discord.js-commando'),
	Raid = require('../../app/raid'),
	Utility = require('../../app/utility');

class TimeRemainingCommand extends Commando.Command {
	constructor(client) {
		super(client, {
			name: 'time-left',
			group: 'raids',
			memberName: 'time-left',
			aliases: ['left', 'time-remaining', 'remaining', 'remain', 'end-time', 'end'],
			description: 'Sets the time that the raid will be to exist.',
			details: 'Use this command to set remaining time on a raid.',
			examples: ['\t!time-left 1:45', '\t!remain 50'],
			args: [
				{
					key: 'time-left',
					label: 'time left',
					prompt: 'How much time is remaining on the raid (use h:mm or mm format)?\nExample: `1:43`',
					type: 'endtime'
				}
			],
			argsPromptLimit: 3,
			guildOnly: true
		});

		client.dispatcher.addInhibitor(message => {
			if (message.command.name === 'end-time' && !Raid.validRaid(message.channel)) {
				message.reply('Set the end time for a raid from its raid channel!');
				return true;
			}
			return false;
		});
	}

	run(message, args) {
		const time = args['time-left'],
			info = Raid.setRaidEndTime(message.channel, time);

		message.react('👍')
			.catch(err => console.log(err));

		Utility.cleanConversation(message);

		Raid.refreshStatusMessages(info.raid);
	}
}

module.exports = TimeRemainingCommand;
