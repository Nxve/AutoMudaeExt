# AutoMudae Extension 👾
Automates the use of Mudae bot in Discord. This is the Chrome Extension version of the discontinued [AutoMudae userscript](https://github.com/Nxve/AutoMudae).

## ⚠ Disclaimer
#### Slowed development until end of April
It is still in early development, thus unavailable in webstore.
You can expect it to be available for use after the completion of the below roadmap, _not including secondary plans_:

#### Roadmap to get it working:
- Notifications
    - Some of the events should trigger sound notifications
- Option to watch for mentioned nicknames: sniping
- Add to total claimed kakera those received from EMERALD IV reward
- Guild Config:
    - Option to get from `/server settings`
    - Adapt to guild prefix in typed commands, as `$tu`, `$dk`, `$us` and such
    - Add other language support
- Version control over preferences
- Advise about it's requirements:
    - Maybe after installation, in a "guide" page
    - Requirements:
        - Custom avatar for each user
        - Slash commands only
        - $tu exposing every needed info


#### Known bugs:
- Duplicated warn sometimes

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