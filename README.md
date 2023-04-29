# AutoMudae Extension 👾
Automates the use of Mudae bot in Discord. This is the Chrome Extension version of the discontinued [AutoMudae userscript](https://github.com/Nxve/AutoMudae).

## ⚠ Disclaimer
It is still in early development, thus unavailable in webstore.
You can expect it to be available for use after the completion of the below roadmap, _not including secondary plans_:

#### Roadmap to get it working:
- In bot config:
    - Prevent user from configuring kakera to a token that is already in `all`
    - Display username/nick instead of tokens in kakera config (Get from cache or running bot)
- Notifications
    - Some of the events should trigger sound notifications
- Option to watch for mentioned nicknames: sniping
- Kakera consumption should be halved for 10+ keys characters
- Add to total claimed kakera those received from SILVER IV reward
- Guild Config:
    - Option to get from `/server settings`
    - Adapt to guild prefix in typed commands, as `$tu`, `$dk`, `$us` and such
- Version control over preferences
- Advise about it's requirements:
    - Maybe after installation, in a "guide" page
    - Requirements:
        - Custom avatar for each user
        - Slash commands only
        - $tu exposing every needed info

#### Secondary plans:
- Styling:
    - Change checkboxes to Discord's toggle buttons
    - Change dropdowns to Discord's style
    - Add a fade out/in to scrollbar thumb when not active
    - Highlight Discord messages when claiming characters/kakeras, when stolen, etc
- Better logic/performance:
    - Handle hourly reset
    - Prevent tab from going inactive
    - Should only `think` after the previous think
- List of characters to claim even if not wished
    - Maybe whole series too
- Option to use $dk, $daily
- Option to use $us, $rolls and $rt when needed
- Account management:
    - $givek: Transfer kakera between users
    - $wp: Remove claimed wishes
    - $wish: Wish from user configured list of interesting characters
    - $give: Transfer characters between users
- Portability to other browsers

###### Initial boilerplate was created following instructions from [this LogRocket post](https://blog.logrocket.com/creating-chrome-extension-react-typescript/)