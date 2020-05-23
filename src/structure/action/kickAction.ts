import { GuildMember, Message } from 'discord.js';
import { CaseModel, Case } from '../../model/case';
import { DocumentType } from '@typegoose/typegoose';
import { CaseType } from '../../util/constants';
import { MessageEmbed } from 'discord.js';
import truncate from 'truncate';

interface KickActionData {
	target: GuildMember;
	moderator: GuildMember;
	reason?: string;
	message: Message;
}

export class KickAction {
	target: GuildMember;
	moderator: GuildMember;
	message: Message;
	document?: DocumentType<Case>;
	id?: number;

	private _reason?: string;

	constructor(data: KickActionData) {
		this.target = data.target;
		this.moderator = data.moderator;
		this.message = data.message;
		this._reason = data.reason;
	}

	get reason() {
		return truncate(this._reason || 'No reason provided', 2000);
	}

	async commit() {
		// To execute the action and the after method
		if (!this.target.kickable) return;
		await this.getId();
		await this.sendTargetDm();
		const id = this.id;
		await this.target.kick(`[#${id}] ${this.reason}`);
		this.document = await CaseModel.create({
			_id: id,
			active: false,
			moderatorId: this.moderator.id,
			moderatorTag: this.moderator.user.tag,
			targetId: this.target.id,
			targetTag: this.target.user.tag,
			expiresAt: new Date(-1),
			reason: this.reason,
			type: CaseType.Kick,
		} as Case);
		await this.after();
	}

	async after() {
		// To log the action
		if (!this.document) return;
		// TODO: add mod log thingy
		console.log(`mod log stuff, ${this.document.toString()}`);
	}

	async getId() {
		if (this.id) return this.id;
		this.id = (await CaseModel.countDocuments()) + 1;
		return this.id;
	}

	async sendTargetDm() {
		const embed = new MessageEmbed()
			.setColor('RED')
			.setDescription('**You have been kicked from Minehut!**')
			.addField('ID', this.id)
			.addField('Reason', this.reason)
			.setTimestamp();
		await this.target.send(embed);
	}
}
