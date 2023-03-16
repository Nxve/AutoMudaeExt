# AutoMudae Extension 👾
Automates the use of Mudae bot in Discord. This is the Chrome Extension version of the discontinued [AutoMudae userscript](https://github.com/Nxve/AutoMudae).

## ⚠ Disclaimer
It is still in early development, thus unavailable in webstore and not really functional by now.
You can expect it to be available for use after the completion of the below roadmap, _not including after plans_:

#### Roadmap to get it working:
- Try claiming character/kakera even before Mudae appending a button
- Option to clear preferences
- Summary about usage
- Logs:
    - Two categories:
        - Overrall events: Claimings, soulmates, ...
        - Warns & Errors
    - Catch from async methods: reactToMessage, sendChannelMessage, roll, ...
- Notifications: Some of the above events should trigger notifications
- Option to watch for mentioned nicknames: sniping
- Add to total claimed kakera those received from EMERALD IV reward
- Remove the necessity of a custom avatar
- Add other language support
- Version control over preferences
    - Does Chrome handle this already?
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
- Better logic/performance:
    - `observeToReact` should use MutationObserver
    - Handle hourly reset
- List of characters to claim even if not wished
    - Maybe whole series too
- Option to use $dk, $daily
- Option to use $us, $rolls and $rt when needed
- Wished characters maintenance: remove claimed wishes, wish from user configured list of interesting characters
- Transfer characters between users
- Portability to other browsers

###### Initial boilerplate was created following instructions from [this LogRocket post](https://blog.logrocket.com/creating-chrome-extension-react-typescript/)