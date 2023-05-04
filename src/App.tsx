import type { BotState, Preferences, PrefLanguage, PrefNotification, PrefNotificationType, PrefRollType, PrefUseUsers } from "./lib/bot";
import type { KAKERA } from "./lib/mudae";
import type { MessageID, Message } from "./lib/messaging";
import type { Logs, Unseen, LogType } from "./lib/bot/log";
import type { Stats, UserStatus } from "./lib/bot/status_stats";
import type { InfoPanelType, MenuCategory, MenuSubcategory } from "./lib/app_types";
import { blankLogs, blankUnseen } from "./lib/bot/log";
import { blankStats } from "./lib/bot/status_stats";
import { isTokenValid, jsonMapSetReplacer, jsonMapSetReviver, minifyToken } from "./lib/utils";
import { BOT_STATES, NOTIFICATIONS, defaultPreferences } from "./lib/bot";
import { MESSAGES } from "./lib/messaging";
import { SVGS } from "./lib/svgs";
import { KAKERAS } from "./lib/mudae";
import InfoPanel from "./components/InfoPanel";
import NavBar from "./components/NavBar";
import React, { useCallback, useEffect, useState } from "react";
import "./styles/App.css";
import { DISCORD_NICK_MAX, DISCORD_NICK_MIN } from "./lib/consts";

function App() {
  /// App state
  const [menuCategory, setMenuCategory] = useState<MenuCategory>(null);
  const [menuSubcategory, setMenuSubcategory] = useState<MenuSubcategory>(null);
  const [infoPanel, setInfoPanel] = useState<InfoPanelType>(null);
  const [configuringKakeraPerToken, setConfiguringKakeraPerToken] = useState("");
  const [tokenList, setTokenList] = useState<string[]>([]);
  const [snipeList, setSnipeList] = useState<string[]>([]);
  const [usernames, setUsernames] = useState<{ [token: string]: string }>({});
  const [hasJustLoadedPreferences, setJustLoadedPreferences] = useState(false);
  const [didMount, setDidMount] = useState(false);

  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences());
  const [logs, setLogs] = useState<Logs>(blankLogs());
  const [stats, setStats] = useState<Stats>(blankStats());
  const [userStatus, setUserStatus] = useState<UserStatus>(new Map());
  const [unseen, setUnseen] = useState<Unseen>(blankUnseen());

  /// Bot state
  const [discordTab, setDiscordTab] = useState<chrome.tabs.Tab>();
  const [botState, setBotState] = useState<BotState>("unknown");
  const [dynamicCantRunReason, setDynamicCantRunReason] = useState("");

  /// GUI

  const isWide = menuCategory === "bot" && (menuSubcategory === "tokenlist" || menuSubcategory === "kakera");

  const tokenListAdd = () => {
    tokenList.push("");
    setTokenList([...tokenList]);
  };

  const tokenListClear = () => {
    preferences.tokenList = new Set();
    setPreferences({ ...preferences });
    setTokenList([]);
  };

  const validateTokenInput = (index: number, token: string) => {
    const isValid = isTokenValid(token);

    if (index >= preferences.tokenList.size) {
      if (isValid) {
        preferences.tokenList.add(token);
        setPreferences({ ...preferences });
      }
    } else {
      const arrTokenList = [...preferences.tokenList];

      if (isValid){
        arrTokenList.splice(index, 1, token);
      } else {
        arrTokenList.splice(index, 1);
      }

      preferences.tokenList = new Set(arrTokenList);
      setPreferences({ ...preferences });
    }

    setTokenList([...preferences.tokenList]);
  };

  const snipeListAdd = () => {
    snipeList.push("");
    setSnipeList([...snipeList]);
  };

  const snipeListClear = () => {
    preferences.snipeList = new Set();
    setPreferences({ ...preferences });
    setSnipeList([]);
  };

  const validateSnipeInput = (index: number, nick: string) => {
    nick = nick.trim();

    const isValid = nick.length >= DISCORD_NICK_MIN && nick.length <= DISCORD_NICK_MAX;

    if (index >= preferences.snipeList.size) {
      if (isValid) {
        preferences.snipeList.add(nick);
        setPreferences({ ...preferences });
      }
    } else {
      const arrSnipeList = [...preferences.snipeList];

      if (isValid){
        arrSnipeList.splice(index, 1, nick);
      } else {
        arrSnipeList.splice(index, 1);
      }

      preferences.snipeList = new Set(arrSnipeList);
      setPreferences({ ...preferences });
    }

    setSnipeList([...preferences.snipeList]);
  };

  const handleSoundToggle: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    preferences.notifications.enabled[e.target.checked ? "add" : "delete"](e.target.id.replace("sound-", "") as PrefNotification);
    setPreferences({ ...preferences });
  };

  const toggleMenuCategory = (category?: MenuCategory) => {
    setMenuCategory(category ? (category === menuCategory ? null : category) : null);
  };

  const toggleMenuSubcategory = (subcategory?: MenuSubcategory) => {
    if (!subcategory) {
      setMenuSubcategory(null);
      return;
    }

    if (menuSubcategory === "tokenlist") {
      preferences.tokenList = new Set([...preferences.tokenList].filter(token => {
        const isValid = isTokenValid(token);

        if (isValid && !preferences.kakera.perToken.has(token)) {
          preferences.kakera.perToken.set(token, new Set());
        }

        return isValid;
      }));

      const unusedTokens: string[] = [];

      for (const [token] of preferences.kakera.perToken) {
        if (token !== "all" && !preferences.tokenList.has(token)) unusedTokens.push(token);
      }

      unusedTokens.forEach(token => preferences.kakera.perToken.delete(token));

      setPreferences({ ...preferences });
    }

    setMenuSubcategory(subcategory === menuSubcategory ? null : subcategory);
  };

  const toggleInfoPanel = (infoPanelCategory?: InfoPanelType) => {
    const isFolding = infoPanelCategory && infoPanelCategory === infoPanel;

    setInfoPanel(infoPanelCategory ? (isFolding ? null : infoPanelCategory) : null);

    if (!isFolding && (infoPanelCategory === "events" || infoPanelCategory === "warns" || infoPanelCategory === "errors")) {
      clearUnseen(infoPanelCategory.slice(0, infoPanelCategory.length - 1) as LogType);
    }
  };

  const toggleKakeraForToken = (token: string, kakera: KAKERA) => {
    setConfiguringKakeraPerToken("");

    if (!preferences.kakera.perToken.has(token)) return;

    const kakeras = preferences.kakera.perToken.get(token) as Set<KAKERA>;

    kakeras[kakeras.has(kakera) ? "delete" : "add"](kakera);

    preferences.kakera.perToken.set(token, kakeras);

    setPreferences({ ...preferences });
  };

  const clearUnseen = (logType: LogType) => {
    unseen[logType] = 0;
    setUnseen({ ...unseen });
    sendWorkerMessage(MESSAGES.APP.CLEAR_UNSEEN, logType);
  };

  const getCantRunReason = (): string => {
    const reason = BOT_STATES[botState].cantRunReason;

    if (reason === "<dynamic>") return dynamicCantRunReason;

    return reason;
  };

  const reset = () => {
    toggleMenuCategory();
    toggleMenuSubcategory();
    setConfiguringKakeraPerToken("");
    setPreferences(defaultPreferences());
    setTokenList([]);
    setSnipeList([]);
  };

  const clearCache = () => {
    toggleMenuCategory();
    toggleMenuSubcategory();
    setUsernames({});
    chrome.storage.local.remove("usernames");
  };

  /// BOT

  const canToggleRun = (): boolean => {
    if (botState !== "idle" && botState !== "running" && botState !== "waiting_injection") {
      return false;
    }

    if (botState === "idle" || botState === "waiting_injection") {
      if (preferences.useUsers === "tokenlist" &&
        (preferences.tokenList.size < 1 || [...preferences.tokenList].some(token => !isTokenValid(token)))
      ) {
        const reason = "You should use logged users or have a valid token list";

        if (reason !== dynamicCantRunReason) {
          setDynamicCantRunReason(reason);
        }

        return false;
      }
    }

    return true;
  };

  const sendTabMessage = (tab: chrome.tabs.Tab | number, messageId: MessageID, data: any, cb: (response?: any) => void) => {
    const tabId = (typeof tab !== "number") ? tab.id : tab;

    if (!tabId) return;

    chrome.tabs.sendMessage<Message>(tabId, { id: messageId, data }, cb);
  };

  const broadcastMessage = useCallback((messageId: MessageID, data: any, cb: (response?: any) => void) => {
    chrome?.tabs?.query({ url: "https://discord.com/channels/*", currentWindow: true, status: "complete" })
      .then((tabs) => {
        tabs.forEach(tab => {
          if (!tab.id) return;
          sendTabMessage(tab.id, messageId, data, cb);
        });
      });
  }, []);

  const sendWorkerMessage = (messageId: MessageID, data: any, cb?: (response?: any) => void) => {
    chrome?.runtime?.sendMessage<Message>({ id: messageId, data }, cb || (() => { }));
  };

  const toggleRun = () => {
    if (!discordTab) return;

    if (botState === "waiting_injection") {
      discordTab.autoDiscardable = false;

      setBotState("setup");

      sendTabMessage(discordTab, MESSAGES.APP.INJECTION, JSON.stringify(preferences, jsonMapSetReplacer), (err?: string) => {
        if (err) {
          setDynamicCantRunReason(err);
          setBotState("injection_error");
          return;
        }

        setBotState("running");
      });

    } else if (botState === "running" || botState === "idle") {

      sendTabMessage(discordTab, MESSAGES.APP.TOGGLE, null, (response?: Error | BotState) => {
        if (response && !(response instanceof Error)) {
          setBotState(response);
          return;
        }

        setDynamicCantRunReason(response ? response.message : "Invalid response from toggle message.");
        setBotState("error");
      });
    }
  };

  const handleWorkerData = (data?: { stats: Stats, logs: Logs, unseen: Unseen }) => {
    if (!data) {
      console.error("Couldn't retrieve data from worker.");
      return;
    }

    setStats(data.stats);
    setLogs(data.logs);
    setUnseen(data.unseen);

    if (infoPanel === "events" || infoPanel === "warns" || infoPanel === "errors") {
      clearUnseen(infoPanel.slice(0, infoPanel.length - 1) as LogType);
    }
  };

  const handleExtensionMessage = (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (!Object.hasOwn(message, "id")) return;

    switch (message.id) {
      case MESSAGES.BOT.SYNC_USER_INFO:
        try {
          const { username, userinfo } = JSON.parse(message.data, jsonMapSetReviver);

          setUserStatus(current => new Map(current.set(username, userinfo)));
        } catch (error) {
          console.error("Error while sync user info:", error);
        }
        break;
      case MESSAGES.BOT.STORE_USERNAME:
        console.log("Received", message.data);
        const { username, token } = message.data as { username: string, token: string };

        usernames[token] = username;

        setUsernames({ ...usernames });
        break;
      case MESSAGES.BOT.ERROR:
      case MESSAGES.BOT.WARN:
      case MESSAGES.BOT.EVENT:
        sendWorkerMessage(MESSAGES.APP.GET_EVERYTHING, null, handleWorkerData);
        break;
      default:
        break;
    }
  };

  const savePreferences = () => {
    const stringifiedPreferences = JSON.stringify(preferences, jsonMapSetReplacer);

    broadcastMessage(
      MESSAGES.APP.SYNC_PREFERENCES,
      stringifiedPreferences,
      (err?: Error) => { if (err) console.error("Couldn't sync preferences with some tabs", err) }
    );

    chrome?.storage?.local.set({ preferences: stringifiedPreferences })
      .then(() => console.log("Saved preferences."))
      .catch(err => console.error("Couldn't save preferences", err));
  };

  useEffect(() => {
    /// Load preferences & usernames from Chrome's storage
    chrome?.storage?.local.get(["preferences", "usernames"])
      .then(result => {
        if (Object.hasOwn(result, "preferences")) {
          const loadedPreferences: Preferences = JSON.parse(result.preferences, jsonMapSetReviver);

          setPreferences(loadedPreferences);
          setTokenList([...loadedPreferences.tokenList]);
          setSnipeList([...loadedPreferences.snipeList]);
          console.log("Loaded preferences.", loadedPreferences);
        }

        if (Object.hasOwn(result, "usernames")) {
          setUsernames(result.usernames);
          console.log("Loaded usernames.", result.usernames);
        }
      })
      .catch(err => console.error("Couldn't load preferences or usernames", err))
      .finally(() => setJustLoadedPreferences(true));

    sendWorkerMessage(MESSAGES.APP.GET_EVERYTHING, null, handleWorkerData);

    chrome?.tabs?.query({ url: "https://discord.com/channels/*", highlighted: true, currentWindow: true, status: "complete" })
      .then((tabs) => {
        if (tabs.length < 1) return;

        const tab = tabs[0];

        if (!tab || tab.id == null) return;

        setDiscordTab(tab);

        sendTabMessage(tab.id, MESSAGES.APP.GET_STATUS, null, (response: { botState: BotState, lastError?: string, stringifiedUserStatus?: string }) => {
          if (!Object.hasOwn(BOT_STATES, response.botState)) return;

          if (response.stringifiedUserStatus) {
            const userStatus: UserStatus = JSON.parse(response.stringifiedUserStatus, jsonMapSetReviver);
            setUserStatus(userStatus);
          }

          if (response.lastError) setDynamicCantRunReason(response.lastError);
          setBotState(response.botState);
        });
      })
      .catch(console.error);

    chrome?.runtime?.onMessage.addListener(handleExtensionMessage);

    setDidMount(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didMount) return;

    /// Prevent execution when loading preferences from storage
    if (hasJustLoadedPreferences) {
      setJustLoadedPreferences(false);
      return;
    }

    const tSavePreferences = setTimeout(() => {
      savePreferences();
    }, 250);

    return () => clearTimeout(tSavePreferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  return (
    <div id="app">
      {
        infoPanel !== null &&
        <div id="info-panel-wrapper">
          <InfoPanel infoType={infoPanel} logs={logs} userStatus={userStatus} stats={stats} />
        </div>
      }
      <main>
        <NavBar
          showStatusButton={discordTab != null && (botState === "idle" || botState === "running") && userStatus.size > 0}
          toggleInfoPanel={toggleInfoPanel}
          unseen={unseen}
        />
        <section id="main-menu" {...isWide && ({ className: "wide" })}>
          <header>
            <img src="128.png" alt="App Icon" />
            <span>AutoMudae</span>
          </header>
          <div className="item-wrapper">
            <button {...(menuCategory === "bot" && { className: "toggle" })} onClick={() => toggleMenuCategory("bot")}>
              {SVGS.GEAR}
              <span>Bot Config</span>
              {SVGS.ARROW}
            </button>
          </div>
          {
            menuCategory === "bot" &&
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
                        menuSubcategory === "tokenlist" &&
                        <>
                          <button className="button-red" data-tooltip="Clear" onClick={tokenListClear}>
                            {SVGS.X}
                          </button>
                          <button className="button-green" data-tooltip="Add" onClick={tokenListAdd}>
                            {SVGS.PLUS}
                          </button>
                        </>
                      }
                      <button {...(menuSubcategory === "tokenlist" && { className: "toggle" })} onClick={() => toggleMenuSubcategory("tokenlist")}>
                        {SVGS.ARROW}
                      </button>
                    </div>
                  </div>
                  {
                    menuSubcategory === "tokenlist" &&
                    <div className="item-wrapper inner-1">
                      <div id="tokenlist" className="list">
                        {tokenList.map((token, i) =>
                          <div data-rollup-text={usernames[token]}>
                            <input
                              type="text"
                              spellCheck="false"
                              value={token}
                              onChange={(e) => { tokenList[i] = e.target.value; setTokenList([...tokenList]) }}
                              onBlur={(e) => validateTokenInput(i, e.target.value)}
                              key={`token-${i}`}
                            />
                          </div>
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
                <button {...(menuSubcategory === "claim" && { className: "toggle" })} onClick={() => toggleMenuSubcategory("claim")}>
                  {SVGS.ARROW}
                </button>
              </div>
              {
                menuSubcategory === "claim" &&
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
                <button {...(menuSubcategory === "kakera" && { className: "toggle" })} onClick={() => toggleMenuSubcategory("kakera")}>
                  {SVGS.ARROW}
                </button>
              </div>
              {
                menuSubcategory === "kakera" &&
                <>
                  {(preferences.useUsers === "tokenlist" ? [...preferences.kakera.perToken.keys()] : ["all"]).map((token, i) =>
                    <div className="item-wrapper inner-1 kakera-cfg" key={`kkcfg-${i}`}>
                      <span data-rollup-text={usernames[token] ? minifyToken(token) : null}>
                        {token === "all" ? "All users" : `${usernames[token] || minifyToken(token)}`}</span>
                      <div className="flex-inline-wrapper">
                        {
                          configuringKakeraPerToken === token ?
                            Object.keys(KAKERAS).map((_kakera, i) => {
                              const kakera = _kakera as keyof typeof KAKERAS;

                              if ((preferences.kakera.perToken.get(token) as Set<KAKERA>).has(kakera)) return null;

                              return (
                                <button className="toClaim" onClick={() => { toggleKakeraForToken(token, kakera) }} key={`kkcfg-btn-${i}`}>
                                  <img className="emoji" src={`https://cdn.discordapp.com/emojis/${KAKERAS[kakera].imgSrc}.webp?quality=lossless`} alt="" />
                                </button>
                              )
                            })
                            :
                            [...(preferences.kakera.perToken.get(token) as Set<KAKERA>)].map((kakera, i) =>
                              <button className="toRemove" onClick={() => { toggleKakeraForToken(token, kakera) }} key={`kkcfg-img-${i}`}>
                                <img className="emoji" src={`https://cdn.discordapp.com/emojis/${KAKERAS[kakera].imgSrc}.webp?quality=lossless`} alt="" />
                              </button>
                            )
                        }
                        <button onClick={() => setConfiguringKakeraPerToken(current => !current ? token : "")}>
                          {configuringKakeraPerToken === token ? SVGS.X : SVGS.PLUS}
                        </button>
                      </div>
                    </div>

                  )}
                  <div className="item-wrapper inner-1">
                    <span>Delay</span>
                    <span>{preferences.kakera.delay}s</span>
                    <input type="range" min={0} max={8.1} step={.1} value={preferences.kakera.delay}
                      style={{ "--value": (preferences.kakera.delay * 100 / 8.1) + "%" } as React.CSSProperties}
                      onChange={(e) => {
                        const delay = Number(e.target.value);
                        preferences.kakera.delay = delay;
                        preferences.kakera.delayRandom = delay > 0 ? preferences.kakera.delayRandom : false;
                        setPreferences({ ...preferences });
                      }} />
                  </div>
                  <div className="item-wrapper inner-1" data-tooltip="Random delay between 0 and the config">
                    <span>Random</span>
                    <input type="checkbox" checked={preferences.kakera.delayRandom} disabled={preferences.kakera.delay === 0} onChange={(e) => setPreferences(pref => { pref.kakera.delayRandom = e.target.checked; return { ...pref } })} />
                  </div>
                </>
              }
              <>
                <div className="item-wrapper inner-0">
                  <span>Snipe targets</span>
                  <div className="flex-inline-wrapper">
                    {
                      menuSubcategory === "snipe" &&
                      <>
                        <button className="button-red" data-tooltip="Clear" onClick={snipeListClear}>
                          {SVGS.X}
                        </button>
                        <button className="button-green" data-tooltip="Add" onClick={snipeListAdd}>
                          {SVGS.PLUS}
                        </button>
                      </>
                    }
                    <button {...(menuSubcategory === "snipe" && { className: "toggle" })} onClick={() => toggleMenuSubcategory("snipe")}>
                      {SVGS.ARROW}
                    </button>
                  </div>
                </div>
                {
                  menuSubcategory === "snipe" &&
                  <div className="item-wrapper inner-1">
                    <div className="list">
                      {snipeList.map((nick, i) =>
                        <input
                          type="text"
                          spellCheck="false"
                          value={nick}
                          onChange={(e) => { snipeList[i] = e.target.value; setSnipeList([...snipeList]) }}
                          onBlur={(e) => validateSnipeInput(i, e.target.value)}
                          key={`snipenick-${i}`}
                        />
                      )}
                    </div>
                  </div>
                }
              </>
              <div className="item-wrapper inner-0">
                <span>Notifications</span>
                <button {...(menuSubcategory === "notifications" && { className: "toggle" })} onClick={() => toggleMenuSubcategory("notifications")}>
                  {SVGS.ARROW}
                </button>
              </div>
              {
                menuSubcategory === "notifications" &&
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
            <button {...(menuCategory === "guild" && { className: "toggle" })} onClick={() => toggleMenuCategory("guild")}>
              {SVGS.GEAR}
              <span>Guild Config</span>
              {SVGS.ARROW}
            </button>
          </div>
          {
            menuCategory === "guild" &&
            <>
              <div className="item-wrapper inner-0">
                <span>Language</span>
                <select value={preferences.language} onChange={(e) => setPreferences({ ...preferences, language: e.target.value as PrefLanguage })}>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="pt_br">Português</option>
                </select>
              </div>
            </>
          }
          <div className="item-wrapper">
            <button {...(menuCategory === "extra" && { className: "toggle" })} onClick={() => toggleMenuCategory("extra")}>
              {SVGS.GEAR}
              <span>Extra</span>
              {SVGS.ARROW}
            </button>
          </div>
          {
            menuCategory === "extra" &&
            <>
              <div className="item-wrapper inner-0">
                <button onClick={reset}>Reset all config</button>
              </div>
              <div className="item-wrapper inner-0">
                <button onClick={clearCache}>Clear cache</button>
              </div>
            </>
          }
          {
            discordTab &&
            <div className="item-wrapper">
              {/* //# Replace these calls */}
              <button
                {... !canToggleRun() && {
                  disabled: true,
                  ...(getCantRunReason() && {
                    "data-tooltip": getCantRunReason()
                  })
                }}
                onClick={toggleRun}
              >
                {BOT_STATES[botState].buttonSVG && SVGS[BOT_STATES[botState].buttonSVG as keyof typeof SVGS]}
                <span>{BOT_STATES[botState].buttonLabel}</span>
              </button>
            </div>
          }
        </section>
      </main>
    </div>
  );
}

export default App;