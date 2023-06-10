import type { BotState, PrefDailyKakera, Preferences, PrefLanguage, PrefNotification, PrefNotificationType, PrefRollType, PrefUseUsers } from "./lib/bot";
import type { KAKERA } from "./lib/mudae";
import type { MessageID, Message } from "./lib/messaging";
import type { Logs, Unseen, LogType } from "./lib/bot/log";
import type { Stats, UserStatus } from "./lib/bot/status_stats";
import type { InfoPanelType, MenuCategory, MenuSubcategory } from "./lib/app_types";
import { blankLogs, blankUnseen } from "./lib/bot/log";
import { blankStats } from "./lib/bot/status_stats";
import { getClipboard, isTokenValid, jsonMapSetReplacer, jsonMapSetReviver, minifyToken, replaceProperties, setClipboard } from "./lib/utils";
import { BOT_STATES, NOTIFICATIONS, defaultPreferences } from "./lib/bot";
import { MESSAGES } from "./lib/messaging";
import { SVGS } from "./lib/svgs";
import { KAKERAS } from "./lib/mudae";
import InfoPanel from "./components/InfoPanel";
import NavBar from "./components/NavBar";
import Range from "./components/Range";
import React, { useCallback, useEffect, useState } from "react";
import "./styles/App.css";
import { DISCORD_EMBED_FIELD_MAX, DISCORD_EMBED_FIELD_MIN, DISCORD_NICK_MAX, DISCORD_NICK_MIN, MUDAE_CLAIM_RESET_MAX, MUDAE_CLAIM_RESET_MIN, VERSION_PREFERENCES } from "./lib/consts";
import { ItemsWrapper, Item } from "./components/Items";
import { EVENTS } from "./lib/bot/event";

function App() {
  /// App state
  const [menuCategory, setMenuCategory] = useState<MenuCategory>(null);
  const [menuSubcategory, setMenuSubcategory] = useState<MenuSubcategory>(null);
  const [infoPanel, setInfoPanel] = useState<InfoPanelType>(null);
  const [configuringKakeraPerToken, setConfiguringKakeraPerToken] = useState("");
  const [tokenList, setTokenList] = useState<string[]>([]);
  const [targetUsersList, setTargetUsersList] = useState<string[]>([]);
  const [characterList, setCharacterList] = useState<string[]>([]);
  const [seriesList, setSeriesList] = useState<string[]>([]);
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

  const isWide = menuCategory === "guild" || menuCategory === "extra" || (menuCategory === "general" && (menuSubcategory === "tokenlist" || menuSubcategory === "kakera"));

  const listAdd = (listId: string) => {
    switch (listId) {
      case "token_list":
        tokenList.push("");
        setTokenList([...tokenList]);
        break;
      case "target_users":
        targetUsersList.push("");
        setTargetUsersList([...targetUsersList]);
        break;
      case "character_list":
        characterList.push("");
        setCharacterList([...characterList]);
        break;
      case "series_list":
        seriesList.push("");
        setSeriesList([...seriesList]);
        break;
      default:
        break;
    }
  };

  const listClear = (listId: string) => {
    switch (listId) {
      case "token_list":
        preferences.tokenList = new Set();
        setTokenList([]);
        break;
      case "target_users":
        preferences.claim.targetUsersList = new Set();
        setTargetUsersList([]);
        break;
      case "character_list":
        preferences.claim.characterList = new Set();
        setCharacterList([]);
        break;
      case "series_list":
        preferences.claim.seriesList = new Set();
        setSeriesList([]);
        break;
      default:
        break;
    }

    setPreferences({ ...preferences });
  };

  const validateListInput = (index: number, input: string, listId: string) => {
    if (listId === "target_users" || listId === "character_list" || listId === "series_list") {
      const isTargetUsersList = listId === "target_users";

      const min = isTargetUsersList ? DISCORD_NICK_MIN : DISCORD_EMBED_FIELD_MIN;
      const max = isTargetUsersList ? DISCORD_NICK_MAX : DISCORD_EMBED_FIELD_MAX;

      const isValid = input.length >= min && input.length <= max;

      const listMap = {
        "target_users": { setter: setTargetUsersList, set: preferences.claim.targetUsersList },
        "character_list": { setter: setCharacterList, set: preferences.claim.characterList },
        "series_list": { setter: setSeriesList, set: preferences.claim.seriesList }
      };

      const targetSet = listMap[listId].set;
      const targetSetter = listMap[listId].setter;

      if (index >= targetSet.size) {
        if (isValid) {
          targetSet.add(input);
          setPreferences({ ...preferences });
        }
      } else {
        const arrInputList = [...targetSet];

        if (isValid) {
          arrInputList.splice(index, 1, input);
        } else {
          arrInputList.splice(index, 1);
        }

        targetSet.clear();

        arrInputList.forEach(input => targetSet.add(input));

        setPreferences({ ...preferences });
      }

      targetSetter([...targetSet]);
    } else if (listId === "token_list") {
      const token = input;
      const isValid = isTokenValid(token);

      if (index >= preferences.tokenList.size) {
        if (isValid) {
          preferences.tokenList.add(token);
          setPreferences({ ...preferences });
        }
      } else {
        const arrTokenList = [...preferences.tokenList];

        if (isValid) {
          arrTokenList.splice(index, 1, token);
        } else {
          arrTokenList.splice(index, 1);
        }

        preferences.tokenList = new Set(arrTokenList);
        setPreferences({ ...preferences });
      }

      setTokenList([...preferences.tokenList]);
    }
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
    setTargetUsersList([]);
    setCharacterList([]);
    setSeriesList([]);
  };

  const clearCache = () => {
    toggleMenuCategory();
    toggleMenuSubcategory();
    setUsernames({});
    chrome.storage.local.remove("usernames");
  };

  const importPreferences = () => {
    //# Dont replace pref.preferencesVersion, check for minmax of numbers and such

    // try {
    //   const clipboardContent = getClipboard();

    //   if (clipboardContent) {
    //     const importedObj: object = JSON.parse(atob(clipboardContent), jsonMapSetReviver);

    //     replaceProperties(preferences, importedObj);
    //   }
    // } catch (error) {
    //   console.error("Couldn't import preferences:", error);
    //   //# Pop error at app error tab
    // } finally {
    //   toggleMenuCategory();
    //   toggleMenuSubcategory();
    // }
  };

  const exportPreferences = () => {
    toggleMenuCategory();
    toggleMenuSubcategory();

    const base64Preferences = btoa(JSON.stringify(preferences, jsonMapSetReplacer));

    setClipboard(base64Preferences);
  };

  /// BOT

  const canToggleRun: boolean = (() => {
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
  })();

  const sendTabMessage = (tab: chrome.tabs.Tab | number, messageId: MessageID, data: any, cb: (response?: any) => void) => {
    const tabId: number | chrome.tabs.Tab | undefined = (typeof tab !== "number") ? tab.id : tab;

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
        const { username, token } = message.data as { username: string, token: string };

        usernames[token] = username;

        setUsernames({ ...usernames });
        break;
      case MESSAGES.BOT.ERROR:
      case MESSAGES.BOT.WARN:
      case MESSAGES.BOT.EVENT:
        sendWorkerMessage(MESSAGES.APP.GET_EVERYTHING, null, handleWorkerData);

        if (message.id === MESSAGES.BOT.EVENT) {
          if (message.data.eventType === EVENTS.CLAIM) {
            const claimCharacter: string = message.data.content.character;

            const characterIndex = characterList.indexOf(claimCharacter);

            if (~characterIndex) {
              characterList.splice(characterIndex, 1);
              setCharacterList([...characterList]);
            }
          }
        }
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
          const prefVersion: number | undefined = loadedPreferences.preferencesVersion;

          const isPrefVersionCompatible = prefVersion != null && prefVersion === VERSION_PREFERENCES;

          if (isPrefVersionCompatible) {
            setPreferences(loadedPreferences);
            setTokenList([...loadedPreferences.tokenList]);
            setTargetUsersList([...loadedPreferences.claim.targetUsersList]);
            setCharacterList([...loadedPreferences.claim.characterList]);
            setSeriesList([...loadedPreferences.claim.seriesList]);

            console.log("Loaded preferences.", loadedPreferences);
          } else {
            console.log(`Preferences were incompatible. Preferences version: ${prefVersion ? "v" + prefVersion : "unknown"}. Current version: v${VERSION_PREFERENCES}`);

            chrome?.storage?.local.remove("preferences");
          }
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

        sendTabMessage(tab.id, MESSAGES.APP.GET_STATUS, null, (response?: { botState: BotState, lastError?: string, stringifiedUserStatus?: string }) => {
          if (!response) {
            console.error("Couldn't communicate with the active Discord tab. Reload the tab and try again.");
            return;
          }

          setDiscordTab(tab);

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
          <ItemsWrapper
            currentMenuCategory={menuCategory}
            currentMenuSubcategory={menuSubcategory}
            toggleMenuCategory={toggleMenuCategory}
            toggleMenuSubcategory={toggleMenuSubcategory}
          >
            <Item category="general" label="General Config">
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
                            <button className="button-red" data-tooltip="Clear" onClick={() => listClear("token_list")}>
                              {SVGS.X}
                            </button>
                            <button className="button-green" data-tooltip="Add" onClick={() => listAdd("token_list")}>
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
                                onBlur={(e) => validateListInput(i, e.target.value, "token_list")}
                                key={`token-${i}`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    }
                  </>
                }
              </>
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
              <Item category="kakera" label="Kakera">
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
                    <Range
                      max={8.1}
                      step={.1}
                      value={preferences.kakera.delay}
                      onChange={(e) => {
                        const delay = Number(e.target.value);
                        preferences.kakera.delay = delay;
                        preferences.kakera.delayRandom = delay > 0 ? preferences.kakera.delayRandom : false;
                        setPreferences({ ...preferences });
                      }}
                    />
                  </div>
                  <div className="item-wrapper inner-1" data-tooltip="Random delay between 0 and the config">
                    <span>Random</span>
                    <input type="checkbox" checked={preferences.kakera.delayRandom} disabled={preferences.kakera.delay === 0} onChange={(e) => setPreferences(pref => { pref.kakera.delayRandom = e.target.checked; return { ...pref } })} />
                  </div>
                </>
              </Item>
              <Item category="notifications" label="Notifications" className="not-implemented">
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
                    <div className="list">
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
              </Item>
            </Item>
            <Item category="claim" label="Claim Config">
              <div className="item-wrapper inner-1">
                <div className="list">
                  <div>
                    <input type="checkbox" id="claim-chk-wishedbyme" checked={preferences.claim.wishedByMe} onChange={(e) => { setPreferences({ ...preferences, claim: { ...preferences.claim, wishedByMe: e.target.checked } }) }} />
                    <label htmlFor="claim-chk-wishedbyme">Claim wished by me</label>
                  </div>
                  <div>
                    <input type="checkbox" id="claim-chk-snipe" checked={preferences.claim.wishedByOthers} onChange={(e) => { setPreferences({ ...preferences, claim: { ...preferences.claim, wishedByOthers: e.target.checked } }) }} />
                    <label htmlFor="claim-chk-snipe">Claim wished by specific users</label>
                  </div>
                  <div>
                    <input type="checkbox" id="claim-chk-fromlist-char" checked={preferences.claim.fromListCharacters} onChange={(e) => { setPreferences({ ...preferences, claim: { ...preferences.claim, fromListCharacters: e.target.checked } }) }} />
                    <label htmlFor="claim-chk-fromlist-char">Claim from character list</label>
                  </div>
                  <div>
                    <input type="checkbox" id="claim-chk-fromlist-series" checked={preferences.claim.fromListSeries} onChange={(e) => { setPreferences({ ...preferences, claim: { ...preferences.claim, fromListSeries: e.target.checked } }) }} />
                    <label htmlFor="claim-chk-fromlist-series">Claim from series list</label>
                  </div>
                  <div>
                    <input type="checkbox" id="claim-chk-lastreset" checked={preferences.claim.onlyLastReset} onChange={(e) => { setPreferences({ ...preferences, claim: { ...preferences.claim, onlyLastReset: e.target.checked } }) }} />
                    <label htmlFor="claim-chk-lastreset">Use lists only during last reset</label>
                  </div>
                </div>
              </div>
              <Item category="claim_delay" label="Claim delay">
                <>
                  <div className="item-wrapper inner-1">
                    <span>Delay</span>
                    <span>{preferences.claim.delay}s</span>
                    <Range
                      max={8.1}
                      step={.1}
                      value={preferences.claim.delay}
                      onChange={(e) => {
                        const delay = Number(e.target.value);
                        preferences.claim.delay = delay;
                        if (delay === 0) preferences.claim.delayRandom = false;
                        setPreferences({ ...preferences });
                      }}
                    />
                  </div>
                  <div className="item-wrapper inner-1" data-tooltip="Random delay between 0 and the config">
                    <span>Random</span>
                    <input type="checkbox" checked={preferences.claim.delayRandom} disabled={preferences.claim.delay === 0} onChange={(e) => setPreferences(pref => { pref.claim.delayRandom = e.target.checked; return { ...pref } })} />
                  </div>
                </>
              </Item>
              {
                preferences.claim.wishedByOthers &&
                <>
                  <div className="item-wrapper inner-0" data-tooltip={"List their nicknames"}>
                    <span>Target users</span>
                    <div className="flex-inline-wrapper">
                      {
                        menuSubcategory === "target_users" &&
                        <>
                          <button className="button-red" data-tooltip="Clear" onClick={() => listClear("target_users")}>
                            {SVGS.X}
                          </button>
                          <button className="button-green" data-tooltip="Add" onClick={() => listAdd("target_users")}>
                            {SVGS.PLUS}
                          </button>
                        </>
                      }
                      <button {...(menuSubcategory === "target_users" && { className: "toggle" })} onClick={() => toggleMenuSubcategory("target_users")}>
                        {SVGS.ARROW}
                      </button>
                    </div>
                  </div>
                  {
                    menuSubcategory === "target_users" &&
                    <div className="item-wrapper inner-1">
                      <div className="list">
                        {targetUsersList.map((nick, i) =>
                          <input
                            type="text"
                            spellCheck="false"
                            value={nick}
                            onChange={(e) => { targetUsersList[i] = e.target.value; setTargetUsersList([...targetUsersList]) }}
                            onBlur={(e) => validateListInput(i, e.target.value, "target_users")}
                            key={`targetusernick-${i}`}
                          />
                        )}
                      </div>
                    </div>
                  }
                </>
              }
              {
                preferences.claim.fromListCharacters &&
                <>
                  <div className="item-wrapper inner-0">
                    <span>Character list</span>
                    <div className="flex-inline-wrapper">
                      {
                        menuSubcategory === "character_list" &&
                        <>
                          <button className="button-red" data-tooltip="Clear" onClick={() => listClear("character_list")}>
                            {SVGS.X}
                          </button>
                          <button className="button-green" data-tooltip="Add" onClick={() => listAdd("character_list")}>
                            {SVGS.PLUS}
                          </button>
                        </>
                      }
                      <button {...(menuSubcategory === "character_list" && { className: "toggle" })} onClick={() => toggleMenuSubcategory("character_list")}>
                        {SVGS.ARROW}
                      </button>
                    </div>
                  </div>
                  {
                    menuSubcategory === "character_list" &&
                    <div className="item-wrapper inner-1">
                      <div className="list">
                        {characterList.map((character, i) =>
                          <input
                            type="text"
                            spellCheck="false"
                            value={character}
                            onChange={(e) => { characterList[i] = e.target.value; setCharacterList([...characterList]) }}
                            onBlur={(e) => validateListInput(i, e.target.value, "character_list")}
                            key={`characterlist-${i}`}
                          />
                        )}
                      </div>
                    </div>
                  }
                </>
              }
              {
                preferences.claim.fromListSeries &&
                <>
                  <div className="item-wrapper inner-0">
                    <span>Series list</span>
                    <div className="flex-inline-wrapper">
                      {
                        menuSubcategory === "series_list" &&
                        <>
                          <button className="button-red" data-tooltip="Clear" onClick={() => listClear("series_list")}>
                            {SVGS.X}
                          </button>
                          <button className="button-green" data-tooltip="Add" onClick={() => listAdd("series_list")}>
                            {SVGS.PLUS}
                          </button>
                        </>
                      }
                      <button {...(menuSubcategory === "series_list" && { className: "toggle" })} onClick={() => toggleMenuSubcategory("series_list")}>
                        {SVGS.ARROW}
                      </button>
                    </div>
                  </div>
                  {
                    menuSubcategory === "series_list" &&
                    <div className="item-wrapper inner-1">
                      <div className="list">
                        {seriesList.map((series, i) =>
                          <input
                            type="text"
                            spellCheck="false"
                            value={series}
                            onChange={(e) => { seriesList[i] = e.target.value; setSeriesList([...seriesList]) }}
                            onBlur={(e) => validateListInput(i, e.target.value, "series_list")}
                            key={`serieslist-${i}`}
                          />
                        )}
                      </div>
                    </div>
                  }
                </>
              }
            </Item>
            <Item category="guild" label="Guild Config">
              <div className="item-wrapper inner-0">
                <span>Language</span>
                <select value={preferences.guild.language} onChange={(e) => { preferences.guild.language = e.target.value as PrefLanguage; setPreferences({ ...preferences }) }}>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="pt_br">Português</option>
                </select>
              </div>
              <div className="item-wrapper inner-0 not-implemented">
                <span>Claim reset</span>
                <span>{preferences.guild.claimReset}min</span>
                <Range
                  min={MUDAE_CLAIM_RESET_MIN}
                  max={MUDAE_CLAIM_RESET_MAX}
                  value={preferences.guild.claimReset}
                  onChange={(e) => {
                    preferences.guild.claimReset = Number(e.target.value);
                    setPreferences({ ...preferences });
                  }} />
              </div>
            </Item>
            <Item category="extra" label="Mudae Extra">
              <div className="item-wrapper inner-0">
                <span>$daily</span>
                <input type="checkbox" checked={preferences.getDaily} onChange={(e) => setPreferences({ ...preferences, getDaily: e.target.checked })} />
              </div>
              <div className="item-wrapper inner-0 not-implemented">
                <span>$dk</span>
                <select value={preferences.dk} onChange={(e) => setPreferences({ ...preferences, dk: e.target.value as PrefDailyKakera })}>
                  <option value="off">Off</option>
                  <option value="available">When available</option>
                  <option value="reset_power">To reset power</option>
                </select>
              </div>
              <div className="item-wrapper inner-0 not-implemented" data-tooltip="Spam kakeraloots. Won't roll at the same time">
                <span>$kl</span>
                <span>{preferences.kl.amount}x</span>
                <Range
                  min={1}
                  value={preferences.kl.amount}
                  onChange={(e) => {
                    const amount = Number(e.target.value);
                    preferences.kl.amount = amount;
                    setPreferences({ ...preferences });
                  }}
                />
                <input type="checkbox" checked={preferences.kl.enabled} onChange={(e) => setPreferences(pref => { pref.kl.enabled = e.target.checked; return { ...pref } })} />
              </div>
            </Item>
            <Item category="importexport" label="Import/Export">
              <div className="item-wrapper inner-0 not-implemented" data-tooltip="Import from clipboard">
                <button onClick={importPreferences}>Import config</button>
              </div>
              <div className="item-wrapper inner-0" data-tooltip="Export to clipboard">
                <button onClick={exportPreferences}>Export config</button>
              </div>
              <div className="item-wrapper inner-0">
                <button onClick={reset}>Reset all config</button>
              </div>
              <div className="item-wrapper inner-0">
                <button onClick={clearCache}>Clear cache</button>
              </div>
            </Item>
          </ItemsWrapper>
          {
            discordTab &&
            <div className="item-wrapper">
              <button
                disabled={!canToggleRun}
                data-tooltip={canToggleRun ? null : getCantRunReason() || null}
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