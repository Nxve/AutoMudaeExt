# AutoMudae Extension 👾
Automates the use of Mudae bot in Discord. This is the Chrome Extension version of the discontinued [AutoMudae userscript](https://github.com/Nxve/AutoMudae).

## ⚠ Disclaimer
It is still in early development, thus unavailable in webstore.
You can expect it to be available for use after the completion of the below roadmap, _not including secondary plans_:

#### Roadmap to get it working:
- Auto focus added list entry
- Import/Export config
    - Maybe only lists
- Import/Export lists from pastebin or file
- Notifications
    - Some of the events should trigger sound notifications
- Advise about it's requirements:
    - Maybe after installation, in a "guide" page
    - Requirements:
        - Custom avatar for each user
        - Slash commands only
        - /tu exposing every needed info

#### Secondary plans:
- Restructure botUser to a mapped object instead of Map
- Prevent stacking stalled fetches
- Check for "nick-injections" in languages strings (replace with RegEx)
- Target characters by value/ranking
- Add kakera from $dk to stats
- Auto scroll to bottom of lists (Tokens, Characters, Series and Target users)
- Stealth: use previous `/tu` response instead of sending again (Or manual input of every `/tu` info)
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