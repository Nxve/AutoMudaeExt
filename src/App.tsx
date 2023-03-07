import type { BotState, Preferences, PrefLanguage, PrefNotification, PrefNotificationType, PrefReactionType, PrefRollType, PrefUseUsers } from "./lib/bot";
import React, { useEffect, useState } from "react";
import { isTokenValid } from "./lib/utils";
import { BOT_STATES, NOTIFICATIONS } from "./lib/bot";
import { MESSAGES } from "./lib/messaging";
import { SVGS } from "./lib/svgs";
import { KAKERAS } from "./lib/mudae";
import "./styles/App.css";

function App() {
  /// Popup state
  const [isConfiguringBOT, setIsConfiguringBOT] = useState(false);
  const [isConfiguringGuild, setIsConfiguringGuild] = useState(false);
  const [isConfiguringTokenlist, setIsConfiguringTokenlist] = useState(false);
  const [isConfiguringNotifications, setIsConfiguringNotifications] = useState(false);
  const [isConfiguringClaim, setIsConfiguringClaim] = useState(false);
  // const [isConfiguringKakera, setIsConfiguringKakera] = useState(false);
  const [isConfiguringKakera, setIsConfiguringKakera] = useState<keyof typeof KAKERAS | "all" | null>(null);
  const [isConfiguringKakeraClaimList, setIsConfiguringKakeraClaimList] = useState<keyof typeof KAKERAS | "none">("none");
  let [cantRunReason] = useState("");

  /// Bot state
  const [discordTab, setDiscordTab] = useState<chrome.tabs.Tab>();
  const [botState, setBotState] = useState<BotState>("unknown");

  const [preferences, setPreferences] = useState<Preferences>({
    useUsers: "logged",
    tokenList: [],
    languague: "en",
    reactionType: "reaction",
    notifications: {
      type: "sound",
      enabled: new Set()
    },
    roll: {
      enabled: true,
      type: "wx"
    },
    claim: {
      delay: 0,
      delayRandom: false
    },
    kakera: {
      delay: 0,
      delayRandom: false,
      each: {
        PURPLE: { enabled: false },
        BLUE: { enabled: false },
        CYAN: { enabled: false },
        GREEN: { enabled: false },
        YELLOW: { enabled: false },
        ORANGE: { enabled: false },
        RED: { enabled: false },
        RAINBOW: { enabled: false },
        LIGHT: { enabled: false },
      }
    }
  });

  /// GUI

  const isWide = (): boolean => {
    return isConfiguringBOT && isConfiguringTokenlist;
  };

  const tokenListAdd = () => {
    preferences.tokenList.push("");
    setPreferences({ ...preferences });
  };

  const tokenListClear = () => {
    preferences.tokenList = [];
    setPreferences({ ...preferences });

    //# Save
  };

  const tokenListUpdate = (tokenIndex: number, newToken: string) => {
    preferences.tokenList[tokenIndex] = newToken;
    setPreferences({ ...preferences });
  };

  const tokenListValidate = (tokenIndex: number) => {
    if (!isTokenValid(preferences.tokenList[tokenIndex])) {
      preferences.tokenList.splice(tokenIndex, 1);
      setPreferences({ ...preferences });
      return;
    }

    //# Save
  };

  const tokenListToggleVisibility = () => {
    setIsConfiguringTokenlist(!isConfiguringTokenlist);

    preferences.tokenList = preferences.tokenList.filter(token => isTokenValid(token));
    setPreferences({ ...preferences });
  };

  const handleSoundToggle: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    preferences.notifications.enabled[e.target.checked ? "add" : "delete"](e.target.id.replace("sound-", "") as PrefNotification);
    setPreferences({ ...preferences });
  };

  /// BOT

  const canToggleRun = (): boolean => {
    if (botState !== "idle" && botState !== "run") {
      const reason = BOT_STATES[botState].cantRunReason;

      if (reason) cantRunReason = reason;

      return false;
    }

    if (botState === "idle") {
      if (preferences.useUsers === "tokenlist" &&
        (preferences.tokenList.length < 1 || preferences.tokenList.some(token => !isTokenValid(token)))
      ) {
        cantRunReason = "You should use logged users or have a valid token list";

        return false;
      }
    }

    return true;
  };

  const toggleRun = () => {

  };

  useEffect(() => {
    chrome?.tabs?.query({ url: "https://discord.com/channels/*", highlighted: true, currentWindow: true, status: "complete" })
      .then((tabs) => {
        if (tabs.length < 1) return;

        const tab = tabs[0];

        if (!tab || tab.id == null) return;

        setDiscordTab(tab);

        chrome.tabs.sendMessage(tab.id, { id: MESSAGES.GET_STATE }, (state: BotState) => {
          if (!Object.hasOwn(BOT_STATES, state)) return;

          setBotState(state)
        });
      })
      .catch(() => {/* Handle error */ })
  }, []);

  return (
    <div id="App" {...isWide() && ({ className: "wide" })}>
      <header>
        <img src="128.png" alt="App Icon" />
        <span>AutoMudae</span>
      </header>
      <div className="item-wrapper">
        <button {...(isConfiguringBOT && { className: "toggle" })} onClick={() => setIsConfiguringBOT(!isConfiguringBOT)}>
          {SVGS.GEAR}
          <span>Bot Config</span>
          {SVGS.ARROW}
        </button>
      </div>
      {
        isConfiguringBOT &&
        <>
          <div className="item-wrapper inner-0">
            <span>Use</span>
            <select value={preferences.useUsers} onChange={(e) => setPreferences({ ...preferences, useUsers: e.target.value as PrefUseUsers })}>
              <option value="logged">Logged users</option>
              <option value="tokenlist">Token list</option>
            </select>
          </div>
          {
            preferences.useUsers === "tokenlist" &&
            <>
              <div className="item-wrapper inner-0">
                <span>Token List</span>
                <div className="flex-inline-wrapper">
                  {
                    isConfiguringTokenlist &&
                    <>
                      <button className="button-red" data-tooltip="Clear" onClick={tokenListClear}>
                        {SVGS.X}
                      </button>
                      <button className="button-green" data-tooltip="Add" onClick={tokenListAdd}>
                        {SVGS.PLUS}
                      </button>
                    </>
                  }
                  <button {...(isConfiguringTokenlist && { className: "toggle" })} onClick={tokenListToggleVisibility}>
                    {SVGS.ARROW}
                  </button>
                </div>
              </div>
              {
                isConfiguringTokenlist &&
                <div className="item-wrapper inner-1">
                  <div className="list">
                    {preferences.tokenList.map((token, i) =>
                      <input type="text" spellCheck="false" value={token} onChange={(e) => tokenListUpdate(i, e.target.value)} onBlur={(e) => tokenListValidate(i)} />
                    )}
                  </div>
                </div>
              }
            </>
          }
          <div className="item-wrapper inner-0">
            <span>Roll</span>
            <div className="flex-inline-wrapper">
              <input type="checkbox" checked={preferences.roll.enabled} onChange={(e) => setPreferences(pref => { pref.roll.enabled = e.target.checked; return { ...pref } })} />
              <select value={preferences.roll.type} onChange={(e) => setPreferences(pref => { pref.roll.type = e.target.value as PrefRollType; return { ...pref } })}>
                <option value="wx">wx</option>
                <option value="wa">wa</option>
                <option value="wg">wg</option>
                <option value="hx">hx</option>
                <option value="ha">ha</option>
                <option value="hg">hg</option>
              </select>
            </div>
          </div>
          <div className="item-wrapper inner-0">
            <span>Claim</span>
            <button {...(isConfiguringClaim && { className: "toggle" })} onClick={() => setIsConfiguringClaim(!isConfiguringClaim)}>
              {SVGS.ARROW}
            </button>
          </div>
          {
            isConfiguringClaim &&
            <>
              <div className="item-wrapper inner-1">
                <span>Delay</span>
                <span>{preferences.claim.delay}s</span>
                <input type="range" min={0} max={8.1} step={.1} value={preferences.claim.delay}
                  style={{ "--value": (preferences.claim.delay * 100 / 8.1) + "%" } as React.CSSProperties}
                  onChange={(e) => {
                    const delay = Number(e.target.value);
                    setPreferences({ ...preferences, claim: { delay: delay, delayRandom: delay > 0 ? preferences.claim.delayRandom : false } })
                  }} />
              </div>
              <div className="item-wrapper inner-1" data-tooltip="Random delay between 0 and the config">
                <span>Random</span>
                <input type="checkbox" checked={preferences.claim.delayRandom} disabled={preferences.claim.delay === 0} onChange={(e) => setPreferences(pref => { pref.claim.delayRandom = e.target.checked; return { ...pref } })} />
              </div>
            </>
          }
          <div className="item-wrapper inner-0">
            <span>Kakera</span>
            <button {...(isConfiguringKakera && { className: "toggle" })} onClick={() => setIsConfiguringKakera(current => !current ? "all" : null)}>
              {SVGS.ARROW}
            </button>
          </div>
          {
            isConfiguringKakera &&
            <>
              {
                Object.keys(KAKERAS).map((_kakera, i) => {
                  const kakera = _kakera as keyof typeof KAKERAS;

                  return (
                    <>
                      <div className="item-wrapper inner-1" key={`kkcfg-${i}`}>
                        <img className="emoji" src={`https://cdn.discordapp.com/emojis/${KAKERAS[kakera].imgSrc}.webp?quality=lossless`} alt="" />
                        <div className="flex-inline-wrapper">
                          <input type="checkbox" checked={preferences.kakera.each[kakera].enabled} onChange={(e) => setPreferences(pref => { pref.kakera.each[kakera].enabled = e.target.checked; return { ...pref } })} />
                          <button {...(isConfiguringKakera === kakera && { className: "toggle" })} onClick={() => setIsConfiguringKakera(current => current === kakera ? "all" : kakera)}>
                            {SVGS.ARROW}
                          </button>
                        </div>
                      </div>
                      {
                        isConfiguringKakera === kakera &&
                        <>
                          <div className="item-wrapper inner-2">
                            <span>Who will claim</span>
                            <div className="flex-inline-wrapper">
                              <button className="button-red" data-tooltip="Clear" onClick={tokenListClear}>
                                {SVGS.X}
                              </button>
                              <button className="button-green" data-tooltip="Add" onClick={tokenListAdd}>
                                {SVGS.PLUS}
                              </button>
                            </div>
                          </div>
                          <div className="item-wrapper inner-2">
                            <div className="list">
                              <input type="text" spellCheck="false" />
                            </div>
                          </div>
                        </>
                      }
                    </>
                  )
                })
              }
              <div className="item-wrapper inner-1">
                <span>Delay</span>
                <span>{preferences.kakera.delay}s</span>
                <input type="range" min={0} max={8.1} step={.1} value={preferences.kakera.delay}
                  style={{ "--value": (preferences.kakera.delay * 100 / 8.1) + "%" } as React.CSSProperties}
                  onChange={(e) => {
                    const delay = Number(e.target.value);
                    setPreferences({ ...preferences, kakera: { ...preferences.kakera, delay: delay, delayRandom: delay > 0 ? preferences.kakera.delayRandom : false } });
                  }} />
              </div>
              <div className="item-wrapper inner-1" data-tooltip="Random delay between 0 and the config">
                <span>Random</span>
                <input type="checkbox" checked={preferences.kakera.delayRandom} disabled={preferences.kakera.delay === 0} onChange={(e) => setPreferences(pref => { pref.kakera.delayRandom = e.target.checked; return { ...pref } })} />
              </div>
            </>
          }
          <div className="item-wrapper inner-0">
            <span>Notifications</span>
            <button {...(isConfiguringNotifications && { className: "toggle" })} onClick={() => setIsConfiguringNotifications(!isConfiguringNotifications)}>
              {SVGS.ARROW}
            </button>
          </div>
          {
            isConfiguringNotifications &&
            <>
              <div className="item-wrapper inner-1">
                <span>Notification type</span>
                <select value={preferences.notifications.type} onChange={(e) => setPreferences(pref => { pref.notifications.type = e.target.value as PrefNotificationType; return { ...pref } })}>
                  <option value="sound">Sound</option>
                  <option value="popup">Popup</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="item-wrapper inner-1">
                <div id="soundlist" className="list">
                  {
                    Object.keys(NOTIFICATIONS).map((notification) =>
                      <div key={`soundchk-${notification}`}>
                        <input type="checkbox" id={`sound-${notification}`} checked={preferences.notifications.enabled.has(notification as PrefNotification)} onChange={handleSoundToggle} />
                        <label htmlFor={`sound-${notification}`}>{NOTIFICATIONS[notification as PrefNotification]}</label>
                      </div>
                    )
                  }
                </div>
              </div>
            </>
          }
        </>
      }
      <div className="item-wrapper">
        <button {...(isConfiguringGuild && { className: "toggle" })} onClick={() => setIsConfiguringGuild(!isConfiguringGuild)}>
          {SVGS.GEAR}
          <span>Guild Config</span>
          {SVGS.ARROW}
        </button>
      </div>
      {
        isConfiguringGuild &&
        <>
          <div className="item-wrapper inner-0">
            <span>Language</span>
            <select value={preferences.languague} onChange={(e) => setPreferences({ ...preferences, languague: e.target.value as PrefLanguage })}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="pt-br">Português</option>
            </select>
          </div>
          <div className="item-wrapper inner-0">
            <span>Reaction Type</span>
            <select value={preferences.reactionType} onChange={(e) => setPreferences({ ...preferences, reactionType: e.target.value as PrefReactionType })}>
              <option value="reaction">Reaction</option>
              <option value="button">Button</option>
            </select>
          </div>
        </>
      }
      {
        discordTab &&
        <div className="item-wrapper">
          <button {... !canToggleRun() && ({ disabled: true, "data-tooltip": cantRunReason })} onClick={toggleRun}>
            {BOT_STATES[botState].buttonSVG && SVGS[BOT_STATES[botState].buttonSVG as keyof typeof SVGS]}
            <span>{BOT_STATES[botState].buttonLabel}</span>
          </button>
        </div>
      }
    </div>
  );
}

export default App;
