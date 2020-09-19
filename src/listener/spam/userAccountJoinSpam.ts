import { Listener } from "discord-akairo";
import { GuildMember } from "discord.js";
import { BanAction } from "../../structure/action/ban";
import InfluxManager from "../../structure/manager/influx/influxManager";
import { FOREVER_MS } from "../../util/constants";
import { isNew } from "../../util/functions";

export default class UserAccountJoinSpan extends Listener {
    constructor() {
        super('userAccountJoinSpam', {
            emitter: 'client',
            event: 'guildMemberAdd'
        });
    }

    async exec(member: GuildMember) {
        if (isNew(member)) {
            let memberJoinInfluxManager: InfluxManager<GuildMember> | undefined = 
                this.client.influxManagerStore
                    .getInfluxManager(`@memberJoinInflux-${member.guild.id}`);
            if (!memberJoinInfluxManager) {
                memberJoinInfluxManager = new InfluxManager<GuildMember>(
                    [],
                    {
                        clearInterval: 10000,
                        executingQuantity: 5,
                        executingListener: this,
                        executingFunction: (members) => {
                            members.forEach(async member => {
                                const action = new BanAction({
                                    target: member.user,
                                    moderator: await member.guild!.members.fetch(this.client.user!),
                                    reason: 'Bot Detected',
                                    duration: FOREVER_MS,
                                    client: this.client,
                                    guild: member.guild
                                });
                                action.commit();    
                            });
                        }
                    }
                )
                this.client.influxManagerStore
                    .registerInfluxManager(`@memberJoinInflux-${member.guild.id}`, memberJoinInfluxManager);
            }
            memberJoinInfluxManager.addInflux(member);
        }
    }
}