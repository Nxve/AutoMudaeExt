import type { BotState, Preferences, PrefLanguage, PrefNotification, PrefNotificationType, PrefReactionType, PrefRollType, PrefUseUsers } from "./lib/bot";
import type { KAKERA } from "./lib/mudae";
import React, { useEffect, useState } from "react";
import { isTokenValid, jsonMapSetReplacer, jsonMapSetReviver } from "./lib/utils";
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
  const [isConfiguringClaim, setIsConfiguringClaim] = useState(false);
  const [isConfiguringKakera, setIsConfiguringKakera] = useState(false);
  const [isConfiguringNotifications, setIsConfiguringNotifications] = useState(false);
  const [configuringKakeraPerToken, setConfiguringKakeraPerToken] = useState("");
  const [tokenList, setTokenList] = useState<string[]>([]);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    useUsers: "logged",
    tokenList: new Set(),
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
      perToken: new Map([["all", new Set()]])
    }
  });

  /// Bot state
  const [discordTab, setDiscordTab] = useState<chrome.tabs.Tab>();
  const [botState, setBotState] = useState<BotState>("unknown");
  const [cantRunReason, setCantRunReason] = useState("");

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

  const toggleMenuCategory = (category: string) => {
    const setters = new Set([setIsConfiguringBOT, setIsConfiguringGuild]);
    let setter;

    switch (category) {
      case "bot":
        setter = setIsConfiguringBOT;
        break;
      case "guild":
        setter = setIsConfiguringGuild;
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

  /// BOT

  const canToggleRun = (): boolean => {
    if (botState !== "idle" && botState !== "running" && botState !== "waiting_injection") {
      const reason = BOT_STATES[botState].cantRunReason;

      if (!reason && cantRunReason) {
        setCantRunReason("");
      } else if (reason && reason !== "<dynamic>" && reason !== cantRunReason) {
        setCantRunReason(reason);
      }

      return false;
    }

    if (botState === "idle" || botState === "waiting_injection") {
      if (preferences.useUsers === "tokenlist" &&
        (preferences.tokenList.size < 1 || [...preferences.tokenList].some(token => !isTokenValid(token)))
      ) {
        const reason = "You should use logged users or have a valid token list";

        if (reason !== cantRunReason) {
          setCantRunReason(reason);
        }

        return false;
      }
    }

    return true;
  };

  const toggleRun = () => {
    if (!discordTab || !discordTab.id) {
      setBotState("injection_error");
      setCantRunReason("Couldn't find Discord tab, refresh the page and reopen the extension");
      return;
    }

    if (botState === "waiting_injection") {
      discordTab.autoDiscardable = false;

      setBotState("setup");

      chrome.tabs.sendMessage(discordTab.id, { id: MESSAGES.INJECTION, data: JSON.stringify(preferences, jsonMapSetReplacer) }, (err) => {
        if (err) {
          setCantRunReason(err);
          setBotState("injection_error");
          return;
        }

        setBotState("running");
      });
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

  /// Save preferences to Chrome's storage whenever it changes
  useEffect(() => {
    if (!hasLoadedPreferences) return;

    chrome?.storage?.local.set({
      preferences: JSON.stringify(preferences, jsonMapSetReplacer)
    })
      .catch(console.error);
  }, [preferences, hasLoadedPreferences]);

  return (
    <div id="App" {...isWide() && ({ className: "wide" })}>
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
                    {token === "all" ? "All users" : `${token.slice(0, 7)}...${token.slice(-7)}`}</span>
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
          <button {... !canToggleRun() && { disabled: true, "data-tooltip": cantRunReason }} onClick={toggleRun}>
            {BOT_STATES[botState].buttonSVG && SVGS[BOT_STATES[botState].buttonSVG as keyof typeof SVGS]}
            <span>{BOT_STATES[botState].buttonLabel}</span>
          </button>
        </div>
      }
    </div>
  );
}

export default App;
