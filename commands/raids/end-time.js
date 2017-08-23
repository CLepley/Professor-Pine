"use strict";

const Commando = require('discord.js-commando');
const Raid = require('../../app/raid');

class EndTimeCommand extends Commando.Command {
	constructor(client) {
		super(client, {
			name: 'end-time',
			group: 'raids',
			memberName: 'end-time',
			aliases: ['end'],
			description: 'Set the time the raid will no longer exist.',
			details: '?????',
			examples: ['\t!end lugia-0 2:20pm', '\t!end-time 2:20pm lugia-0'],
			argsType: 'multiple'
		});
	}

	run(message, args) {
		if (message.channel.type !== 'text') {
			message.reply('Please set time for a raid from a public channel.');
			return;
		}

		const raid = Raid.findRaid(message.channel, message.member, args);

		if (!raid.raid) {
			message.reply('Please enter a raid id which can be found on the raid post.  If you do not know the id you can ask for a list of raids in your area via `!status`.');
			return;
		}

		const string = raid.args.join(' ');
		const times = string.match(/([0-9]{1,2}\:[0-9]{1,2}(\s?([pa])m)?)|([0-9]\sh(ours?),?\s?(and\s)?[0-9]{1,2}\sminutes?)|([0-9]\s?h?,?\s?[0-9]{1,2}\s?m?)|([0-9]\s?(h(ours?)?|m(inutes?)?))/g);
		const now = moment();
		var time, hours, minutes;

		// new moment('1:20', 'h:mm:ss a')

		// check if am/pm was given on time, which indicates that the user has given an exact time themselves, nothing further is needed
		if (times[0].search(/([ap])m/) >= 0) {
			var moment_time = new moment(times[0], 'h:mm:ss a');

			if (moment_time <= now) {
				message.reply('Please enter a raid start time in the future.');
				return;
			}

			time = moment_time.format('h:mma');
		} else if (times[0].search(/\:/) >= 0) {
			// special scenario if the user entered a time like "1:20" without am/pm or at least it couldn't be found via regex
			//		need to figure out whether it should be am or pm based on current time
			let possible_time_1, possible_time_2;
			let diff_time_1, diff_time_2;
			let am_or_pm = '';

			[hours, minutes] = times[0].split(':');
			hours = parseInt(hours);
			minutes = parseInt(minutes);

			possible_time_1 = moment().set({hours, minutes});
			possible_time_2 = moment().set({hours: hours + 12, minutes});

			diff_time_1 = possible_time_1.diff(now);
			diff_time_2 = possible_time_2.diff(now);

			// if time is greater than 3 hours, the user likely entered incorrect information
			if (diff_time_1 / 3600000 > 3 || diff_time_2 / 3600000 > 3) {
				message.reply('Please enter a raid start time that is within 3 hours and looks something like `2:00pm`.');
				return;
			}

			if (diff_time_1 >= 0) {
				am_or_pm = possible_time_1.format('a');
			} else if (diff_time_2 >= 0) {
				am_or_pm = possible_time_2.format('a');
			} else {
				message.reply('Please enter a raid start time in the future.');
				return;
			}

			time = times[0].trim() + am_or_pm;
		} else {
			// user has not given a time, but rather time remaining, so need to calculate time based off current time + time remaining
			[hours, minutes] = times[0].match(/[0-9]{1,2}/g);
			hours = parseInt(hours);
			minutes = parseInt(minutes);

			// if only 1 number given (no available minutes), need to figure out if that number is minutes or hours
			//		default is hours per how regex works
			if (!minutes && times[0].search(/m(inutes?)?/) >= 0) {
				minutes = hours;
				hours = 0;
			}

			time = moment(Date.now()).add({hours, minutes}).format('h:mma');
		}

		const info = Raid.setRaidTime(message.channel, message.member, raid.raid.id, time);

		// post a new raid message and replace/forget old bot message
		Raid.getMessage(message.channel, message.member, info.raid.id)
			.edit(Raid.getFormattedMessage(info.raid));
	}
}

module.exports = EndTimeCommand;
