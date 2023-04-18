export interface DiscordMessage {
    id: string
    author: DiscordUser
    channel_id: string
    content: string
    timestamp: string
    edited_timestamp: string | null
    attachments: unknown[]
    components: DiscordMessageComponentWrapper[]
    embeds: DiscordEmbed[]
    flags: number
    mention_everyone: boolean
    mention_roles: string[]
    mentions: DiscordUser[]
    pinned: boolean
    tts: boolean
    type: number
    application_id?: string
    interaction?: DiscordInteraction
    webhook_id?: string
    message_reference?: {
        channel_id: string
        guild_id: string
        message_id: string
    }
}

export interface DiscordUser {
    id: string
    username: string
    avatar: string | null
    avatar_decoration: unknown | null
    discriminator: string
    display_name: string | null
    global_name: string | null
    public_flags: number
    flags?: number
    bio?: string
    banner?: unknown | null
    banner_color?: string
    accent_color?: number
    bot?: boolean
}

export interface DiscordUserMe extends DiscordUser {
    email: string
    linked_users: unknown[]
    locale: string
    mfa_enabled: boolean
    nsfw_allowed: boolean
    phone: string
    premium_type: number
    premium_usage_flags: number
    purchased_flags: number
    verified: boolean
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
    /// Not implemented
}