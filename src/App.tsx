import type { BotState, Preferences, PrefLanguage, PrefNotification, PrefNotificationType, PrefRollType, PrefUseUsers } from "./lib/bot";
import type { KAKERA } from "./lib/mudae";
import type { MessageID, Message } from "./lib/messaging";
import React, { useEffect, useState } from "react";
import { isTokenValid, jsonMapSetReplacer, jsonMapSetReviver, minifyToken } from "./lib/utils";
import { BOT_STATES, NOTIFICATIONS } from "./lib/bot";
import { MESSAGES } from "./lib/messaging";
import { SVGS } from "./lib/svgs";
import { KAKERAS } from "./lib/mudae";
import "./styles/App.css";

const defaultPreferences = (): Preferences => ({
  useUsers: "logged",
  tokenList: new Set(),
  languague: "en",
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
    perToken: new Map([["all", new Set()]])
  }
});

function App() {
  /// Popup state
  const [isConfiguringBOT, setIsConfiguringBOT] = useState(false);
  const [isConfiguringGuild, setIsConfiguringGuild] = useState(false);
  const [isConfiguringExtra, setIsConfiguringExtra] = useState(false);
  const [isConfiguringTokenlist, setIsConfiguringTokenlist] = useState(false);
  const [isConfiguringClaim, setIsConfiguringClaim] = useState(false);
  const [isConfiguringKakera, setIsConfiguringKakera] = useState(false);
  const [isConfiguringNotifications, setIsConfiguringNotifications] = useState(false);
  const [configuringKakeraPerToken, setConfiguringKakeraPerToken] = useState("");
  const [tokenList, setTokenList] = useState<string[]>([]);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences());

  /// Bot state
  const [discordTab, setDiscordTab] = useState<chrome.tabs.Tab>();
  const [botState, setBotState] = useState<BotState>("unknown");
  const [dynamicCantRunReason, setDynamicCantRunReason] = useState("");

  /// GUI

  const isWide = (): boolean => {
    return isConfiguringBOT && (isConfiguringTokenlist || isConfiguringKakera);
  };

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
      arrTokenList.splice(index, 1, isValid ? token : undefined as unknown as string);
      preferences.tokenList = new Set([...arrTokenList]);
      setPreferences({ ...preferences });
    }

    setTokenList([...preferences.tokenList]);
  };

  const handleSoundToggle: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    preferences.notifications.enabled[e.target.checked ? "add" : "delete"](e.target.id.replace("sound-", "") as PrefNotification);
    setPreferences({ ...preferences });
  };

  const toggleMenuCategory = (category?: string) => {
    const setters = new Set([setIsConfiguringBOT, setIsConfiguringGuild, setIsConfiguringExtra]);
    let setter;

    /// Fold all
    if (!category) {
      for (const setOtherCategory of setters) {
        setOtherCategory(false);
      }

      return;
    }

    switch (category) {
      case "bot":
        setter = setIsConfiguringBOT;
        break;
      case "guild":
        setter = setIsConfiguringGuild;
        break;
      case "extra":
        setter = setIsConfiguringExtra;
        break;
      default:
        break;
    }

    if (setter) {
      setters.delete(setter);

      setter(current => {
        if (!current) {
          for (const setOtherCategory of setters) {
            setOtherCategory(false);
          }
        }

        return !current;
      });
    }
  };

  const toggleMenuSubcategory = (subcategory: string) => {
    const setters = new Set([setIsConfiguringTokenlist, setIsConfiguringClaim, setIsConfiguringKakera, setIsConfiguringNotifications]);
    let setter;

    switch (subcategory) {
      case "tokenlist":
        setter = setIsConfiguringTokenlist;
        break;
      case "claim":
        setter = setIsConfiguringClaim;
        break;
      case "kakera":
        setter = setIsConfiguringKakera;
        break;
      case "notifications":
        setter = setIsConfiguringNotifications;
        break;
      default:
        break;
    }

    if (setter) {
      if (isConfiguringTokenlist) {
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

      setters.delete(setter);

      setter(current => {
        if (!current) {
          for (const setOtherCategory of setters) {
            setOtherCategory(false);
          }
        }

        return !current;
      });
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

  const getCantRunReason = (): string => {
    const reason = BOT_STATES[botState].cantRunReason;

    if (reason === "<dynamic>") return dynamicCantRunReason;

    return reason;
  };

  const reset = () => {
    toggleMenuCategory();
    setPreferences(defaultPreferences());
    setTokenList([]);
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

  const sendMessage = (messageId: MessageID, data: any, cb: (response?: any) => void, target?: chrome.tabs.Tab | number): boolean => {
    if (!target) {
      chrome?.tabs?.query({ url: "https://discord.com/channels/*", currentWindow: true, status: "complete" })
        .then((tabs) => {
          tabs.forEach(tab => {
            if (!tab.id) return;
            chrome.tabs.sendMessage<Message>(tab.id, { id: messageId, data }, cb);
          });
        });
      return true;
    }

    if (typeof target !== "number") target = target.id;

    if (!target) return false;

    chrome.tabs.sendMessage<Message>(target, { id: messageId, data }, cb);

    return true;
  }

  const toggleRun = () => {
    if (!discordTab) return;

    try {
      if (botState === "waiting_injection") {
        discordTab.autoDiscardable = false;

        setBotState("setup");

        const sent = sendMessage(MESSAGES.INJECTION, JSON.stringify(preferences, jsonMapSetReplacer), (err?: Error) => {
          if (err) {
            setDynamicCantRunReason(err.message);
            setBotState("injection_error");
            return;
          }

          setBotState("running");
        }, discordTab);

        if (!sent) throw Error("Couldn't find Discord ID. Refresh the page");
      } else if (botState === "running" || botState === "idle") {
        const sent = sendMessage(MESSAGES.TOGGLE, null, (response?: Error | BotState) => {
          if (response && !(response instanceof Error)) {
            setBotState(response);
            return;
          }

          setDynamicCantRunReason(response ? response.message : "Invalid response from toggle message.");
          setBotState("error");
        }, discordTab);

        if (!sent) throw Error("Couldn't find Discord ID. Refresh the page");
      }
    } catch (error) {
      setDynamicCantRunReason(error instanceof Error ? error.message : String(error));
      setBotState("error");
    }
  };

  useEffect(() => {
    /// Load preferences from Chrome's storage
    chrome?.storage?.local.get("preferences")
      .then(result => {
        if (result && Object.hasOwn(result, "preferences") && result.preferences != null) {
          const loadedPreferences = JSON.parse(result.preferences, jsonMapSetReviver);

          setPreferences(loadedPreferences);
          setTokenList([...loadedPreferences.tokenList]);
        }
      })
      .catch(console.error)
      .finally(() => setHasLoadedPreferences(true));

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
      .catch(console.error)
  }, []);

  useEffect(() => {
    //# Use debounce here, so it doesn't spam messages and store process when
    //# the user is changing a range input or something

    if (!hasLoadedPreferences) return;

    sendMessage(
      MESSAGES.SYNC_PREFERENCES,
      JSON.stringify(preferences, jsonMapSetReplacer),
      (err?: Error) => console.error(err)
    );

    chrome?.storage?.local.set({
      preferences: JSON.stringify(preferences, jsonMapSetReplacer)
    })
      .catch(console.error);
  }, [preferences, hasLoadedPreferences]);

  return (
    <div id="App">
      <aside>
        {
          discordTab && (botState === "idle" || botState === "running") &&
          <div id="aside-summary" data-tooltip="Summary">
            {SVGS.STACK}
          </div>
        }
        <div id="aside-events" data-tooltip="Events" data-notifications-count="3">
          {SVGS.LIST_CHECKED}
        </div>
        <div id="aside-warns" data-tooltip="Warns" data-notifications-count="239">
          {SVGS.EXCLAMATION}
        </div>
        <div id="aside-errors" data-tooltip="Errors" data-notifications-count="1.2k">
          {SVGS.EXCLAMATION}
        </div>
      </aside>
      <main {...isWide() && ({ className: "wide" })}>
        <header>
          <img src="128.png" alt="App Icon" />
          <span>AutoMudae</span>
        </header>
        <div className="item-wrapper">
          <button {...(isConfiguringBOT && { className: "toggle" })} onClick={() => toggleMenuCategory("bot")}>
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
                    <button {...(isConfiguringTokenlist && { className: "toggle" })} onClick={() => toggleMenuSubcategory("tokenlist")}>
                      {SVGS.ARROW}
                    </button>
                  </div>
                </div>
                {
                  isConfiguringTokenlist &&
                  <div className="item-wrapper inner-1">
                    <div className="list">
                      {tokenList.map((token, i) =>
                        <input type="text" spellCheck="false" value={token} onChange={(e) => { tokenList[i] = e.target.value; setTokenList([...tokenList]) }} onBlur={(e) => validateTokenInput(i, e.target.value)} key={`token-${i}`} />
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
              <button {...(isConfiguringClaim && { className: "toggle" })} onClick={() => toggleMenuSubcategory("claim")}>
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
              <button {...(isConfiguringKakera && { className: "toggle" })} onClick={() => toggleMenuSubcategory("kakera")}>
                {SVGS.ARROW}
              </button>
            </div>
            {
              isConfiguringKakera &&
              <>
                {(preferences.useUsers === "tokenlist" ? [...preferences.kakera.perToken.keys()] : ["all"]).map((token, i) =>
                  <div className="item-wrapper inner-1 kakera-cfg" key={`kkcfg-${i}`}>
                    <span>
                      {token === "all" ? "All users" : `${minifyToken(token)}`}</span>
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
            <div className="item-wrapper inner-0">
              <span>Notifications</span>
              <button {...(isConfiguringNotifications && { className: "toggle" })} onClick={() => toggleMenuSubcategory("notifications")}>
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
          <button {...(isConfiguringGuild && { className: "toggle" })} onClick={() => toggleMenuCategory("guild")}>
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
          </>
        }
        <div className="item-wrapper">
          <button {...(isConfiguringExtra && { className: "toggle" })} onClick={() => toggleMenuCategory("extra")}>
            {SVGS.GEAR}
            <span>Extra</span>
            {SVGS.ARROW}
          </button>
        </div>
        {
          isConfiguringExtra &&
          <div className="item-wrapper inner-0">
            <button onClick={reset}>Reset all config</button>
          </div>
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
      </main>
    </div>
  );
}

export default App;
