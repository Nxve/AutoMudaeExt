# AutoMudae Extension 👾
Automates the use of Mudae bot in Discord. This is the Chrome Extension version of the discontinued [AutoMudae userscript](https://github.com/Nxve/AutoMudae).

## ⚠ Disclaimer
It is still in early development, thus unavailable in webstore.
You can expect it to be available for use after the completion of the below roadmap, _not including secondary plans_:

#### Roadmap to get it working:
- Notifications
    - Some of the events should trigger sound notifications
- Guild Config:
    - Option to get from `/server settings`
- Advise about it's requirements:
    - Maybe after installation, in a "guide" page
    - Requirements:
        - Custom avatar for each user
        - Slash commands only
        - /tu exposing every needed info

#### Secondary plans:
- Import char/series list
- Auto scroll to bottom of lists (Tokens, Characters, Series and Target users)
- Account management:
    - $givek: Transfer kakera between users
    - $wp: Remove claimed wishes
    - $wish: Wish from user configured list of interesting characters
    - $give: Transfer characters between users
- Styling:
    - Change checkboxes to Discord's toggle buttons
    - Change dropdowns to Discord's style
    - Add a fade out/in to scrollbar thumb when not active
    - Highlight Discord messages when claiming characters/kakeras, when stolen, etc
- /daily
    - Whenever it's up, i guess
- /dk
    - States: Off | When available | To reset power (When there's still plenty of time until next reset)
- /us
    - States: Off | When no rolls | When last reset
    - Quantity: 1 ~ ?
    - Who: Whoever has stacks | Token
- /rt
    - States: On | Off
    - Flags: For wishes | For sniping wishes | For interesting characters/series
- /mk
- Better logic/performance:
    - Handle hourly reset
    - Prevent tab from going inactive

###### Initial boilerplate was created following instructions from [this LogRocket post](https://blog.logrocket.com/creating-chrome-extension-react-typescript/)