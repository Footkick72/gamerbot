import {
  Client,
  ClientOptions,
  ClientUser,
  CommandInteraction,
  ContextMenuInteraction,
  Interaction,
  Message,
} from 'discord.js'
import { DateTime } from 'luxon'
import assert from 'node:assert'
import winston, { Logger } from 'winston'
import { Command } from './commands/command.js'
import { CommandContext, MessageCommandContext, UserCommandContext } from './commands/context.js'
import COMMAND_RPS from './commands/games/rps.js'
import COMMAND_AVATAR from './commands/general/avatar.js'
import COMMAND_GETAVATAR from './commands/general/getavatar.js'
import COMMAND_SERVERICON from './commands/general/servericon.js'
import COMMAND_SERVERINFO from './commands/general/serverinfo.js'
import COMMAND_COWSAY from './commands/messages/cowsay.js'
import COMMAND_EGGLEADERBOARD from './commands/messages/eggleaderboard.js'
import COMMAND_LMGTFY from './commands/messages/lmgtfy.js'
import COMMAND_STATS from './commands/minecraft/stats.js'
import COMMAND_USERNAME from './commands/minecraft/username.js'
import COMMAND_BAN from './commands/moderation/ban.js'
import COMMAND_KICK from './commands/moderation/kick.js'
import COMMAND_PURGE from './commands/moderation/purge.js'
import COMMAND_PURGETOHERE from './commands/moderation/purgetohere.js'
import COMMAND_UNBAN from './commands/moderation/unban.js'
import COMMAND_APIMESSAGE from './commands/utility/apimessage.js'
import COMMAND_CHARACTER from './commands/utility/character.js'
import COMMAND_COLOR from './commands/utility/color.js'
import COMMAND_PING from './commands/utility/ping.js'
import { DEVELOPMENT } from './constants.js'
import * as eggs from './egg.js'
import { Plugin } from './Plugin.js'
import { prisma } from './prisma.js'
import { Embed } from './util/embed.js'
import { resolvePath } from './util/path.js'
import { PresenceManager } from './util/presence.js'

export interface GamerbotClientOptions extends Exclude<ClientOptions, 'intents'> {
  plugins?: Plugin[]
  logger: Logger
}

export class GamerbotClient extends Client {
  readonly user!: ClientUser
  readonly logger = winston.createLogger({
    levels: winston.config.npm.levels,
    exitOnError: false,
    transports: DEVELOPMENT
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.errors({ stack: true }),
              winston.format.cli({ all: true })
            ),
            level: 'silly',
          }),
        ]
      : [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.errors({ stack: true }),
              winston.format.cli({ all: true })
            ),
            level: 'info',
          }),
          new winston.transports.File({
            filename: resolvePath('logs/client-info.log'),
            rotationFormat: () => DateTime.now().toFormat('yyyy-MM-dd'),
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            level: 'info',
          }),
          new winston.transports.File({
            filename: resolvePath('logs/client-error.log'),
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            level: 'error',
          }),
        ],
  })

  commands: Map<string, Command> = new Map()
  presenceManager: PresenceManager = new PresenceManager(this)

  static defaultCommands = [
    // games
    COMMAND_RPS,
    // general
    COMMAND_AVATAR,
    COMMAND_GETAVATAR,
    COMMAND_SERVERICON,
    COMMAND_SERVERINFO,
    // messages
    COMMAND_COWSAY,
    COMMAND_EGGLEADERBOARD,
    COMMAND_LMGTFY,
    // minecraft
    COMMAND_STATS,
    COMMAND_USERNAME,
    // moderation
    COMMAND_BAN,
    COMMAND_KICK,
    COMMAND_PURGE,
    COMMAND_PURGETOHERE,
    COMMAND_UNBAN,
    // utility
    COMMAND_APIMESSAGE,
    COMMAND_CHARACTER,
    COMMAND_COLOR,
    COMMAND_PING,
  ]

  constructor(options?: GamerbotClientOptions) {
    super({
      ...options,
      intents: [
        'DIRECT_MESSAGES',
        'GUILDS',
        'GUILD_MEMBERS',
        'GUILD_BANS',
        'GUILD_EMOJIS_AND_STICKERS',
        'GUILD_INVITES',
        'GUILD_MESSAGES',
        'GUILD_MESSAGE_REACTIONS',
      ],
    })

    GamerbotClient.defaultCommands.forEach((command) => {
      this.commands.set(command.name, command)
    })

    this.on('debug', this.onDebug.bind(this))
    this.on('messageCreate', this.onMessage.bind(this))
    this.on('interactionCreate', this.onInteraction.bind(this))
  }

  registerPlugins(...plugins: Plugin[]): void {
    plugins.forEach((plugin) => {
      plugin.commands.forEach((command) => {
        const name = command.name.toLowerCase()
        if (this.commands.has(name)) {
          throw new Error(`Command ${name} already exists`)
        }

        this.commands.set(name, command)
      })
    })
  }

  async refreshPresence(): Promise<void> {
    const num = await eggs.getTotal()
    this.presenceManager.presence = {
      activities: [
        {
          type: 'PLAYING',
          name: `with ${num.toLocaleString()} egg${num === 1n ? '' : 's'} | /help`,
        },
      ],
    }
  }

  onDebug(content: string): void {
    if (content.includes('Heartbeat')) return

    if (content.includes('Remaining: ')) {
      this.logger.info(`Remaining gateway sessions: ${content.split(' ').reverse()[0]}`)
    }

    this.logger.debug(content)
  }

  async onMessage(message: Message): Promise<void> {
    void eggs.onMessage(this, message)
  }

  hasPermissions(
    interaction: CommandInteraction | ContextMenuInteraction,
    command: Command
  ): boolean {
    if (interaction.guild != null) {
      const currentUserPermissions = interaction.member.permissions
      assert(typeof currentUserPermissions !== 'string')

      assert(interaction.channel)
      assert(interaction.channel.type !== 'DM')

      const requiredUserPermissions = command.userPermissions

      if (
        requiredUserPermissions.length > 0 &&
        requiredUserPermissions.some((permission) => !currentUserPermissions.has(permission))
      ) {
        void interaction.reply({
          embeds: [
            Embed.error(
              'You do not have the required permissions to use this command.',
              `Required: ${requiredUserPermissions.join(', ')}`
            ),
          ],
          ephemeral: true,
        })
        return false
      }

      const currentBotPermissions = interaction.channel.permissionsFor(interaction.guild.me!)

      const requiredBotPermissions = command.botPermissions
      assert(typeof requiredBotPermissions !== 'string')

      if (
        requiredBotPermissions.length > 0 &&
        requiredBotPermissions.some((permission) => !currentBotPermissions.has(permission))
      ) {
        void interaction.reply({
          embeds: [
            Embed.error(
              'I do not have the required permissions to use this command.',
              `Required: ${requiredBotPermissions.join(', ')}`
            ),
          ],
          ephemeral: true,
        })
        return false
      }

      return true
    }

    return true
  }

  async onInteraction(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isContextMenu()) {
        const command = this.commands.get(interaction.commandName)

        if (command == null) {
          await interaction.reply({ embeds: [Embed.error('Command not found.')] })
          return
        }

        assert(
          command.type === 'USER' || command.type === 'MESSAGE',
          'Command type must be USER or MESSAGE'
        )

        const context =
          interaction.targetType === 'MESSAGE'
            ? new MessageCommandContext(this, interaction, prisma)
            : new UserCommandContext(this, interaction, prisma)

        if (!this.hasPermissions(interaction, command)) return

        await command.run(
          // @ts-expect-error guild types are not correct
          context
        )

        return
      }

      if (!interaction.isCommand()) return
      const command = this.commands.get(interaction.commandName)

      if (command == null) {
        await interaction.reply({ embeds: [Embed.error('Command not found.')] })
        return
      }

      assert(command.type === 'CHAT_INPUT', 'Command type must be CHAT_INPUT')

      const context = new CommandContext(this, interaction, prisma)

      if (!this.hasPermissions(interaction, command)) return

      await command.run(
        // @ts-expect-error guild types are not correct
        context
      )
    } catch (err) {
      this.logger.error(err)

      if (interaction.isCommand() || interaction.isContextMenu()) {
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [Embed.error(err.message)] })
        } else if (interaction.replied) {
          await interaction.followUp({ embeds: [Embed.error(err.message)] })
        } else {
          await interaction.reply({ embeds: [Embed.error(err.message)] })
        }
      }
    }
  }
}
