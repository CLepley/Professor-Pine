"use strict";

const Commando = require('discord.js-commando');
const Raid = require('../../app/raid');

class StatusCommand extends Commando.Command {
	constructor(client) {
		super(client, {
			name: 'status',
			group: 'raids',
			memberName: 'status',
			description: 'Gets a single update on a raid, or lists all the raids in the channel',
			details: '?????',
			examples: ['\t!status', '\t!status lugia-0'],
			argsType: 'multiple'
		});
	}

	public run(message, args) {
		if (message.channel.type !== 'text') {
			message.reply('Please query status from a public channel.');
			return;
		}

		const raid = Raid.findRaid(message.channel, message.member, args);

		if (raid.raid) {
			Raid.setUserRaidId(message.member, raid.raid.id);

			// post a new raid message and replace/forget old bot message
			message.channel.send(Raid.getFormattedMessage(raid.raid)).then((bot_message) => {
				Raid.setMessage(message.channel, message.member, raid.raid.id, bot_message);
			})
			;
		} else {
			message.channel.send("blah");
		}
	}
}

module.exports = StatusCommand;
