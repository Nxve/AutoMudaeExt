export interface DiscordMessage {
    application_id: string
    attachments: unknown[]
    author: DiscordUser
    channel_id: string
    components: DiscordMessageComponentWrapper[]
    content: string
    edited_timestamp: unknown | null
    embeds: DiscordEmbed[]
    flags: number
    id: string
    interaction: DiscordInteraction
    mention_everyone: boolean
    mention_roles: unknown[]
    mentions: unknown[]
    pinned: boolean
    timestamp: string
    tts: boolean
    type: number
    webhook_id: string
}

export interface DiscordUser {
    id: string
    username: string
    avatar: string
    avatar_decoration: unknown
    discriminator: string
    display_name: string | null
    global_name: string | null
    public_flags: number
    bot?: boolean
}

interface DiscordInteraction {
    id: string
    name: string
    type: number
    user: DiscordUser
}

interface DiscordMessageComponentWrapper {
    type: number
    components: DiscordMessageComponent[]
}

interface DiscordMessageComponent {
    type: number
    style: number
    custom_id: string
    emoji: {
        id: string
        name: string
    }
}

interface DiscordEmbed {
    //# Not implemented
}