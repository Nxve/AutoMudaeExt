import React, { useEffect, useState } from "react";
import { isTokenValid } from "./lib/utils";
import "./styles/App.css";
import type { BotState } from "./lib/bot";
import { BOT_STATES } from "./lib/bot";
import { MESSAGES } from "./lib/messaging";
import { SVGS } from "./lib/svgs";

const E_NOTIFICATIONS = {
  "foundcharacter": "Found character",
  "claimcharacter": "Claim character",
  "soulmate": "New soulmate",
  "cantclaim": "Can't claim character",
  "wishsteal": "Wish steal",
  "cantroll": "Can't roll and can still marry"
} as const;

type PrefUseUsers = "logged" | "tokenlist";
type PrefRollType = "wx" | "wa" | "wg" | "hx" | "ha" | "hg";
type PrefNotificationType = "sound" | "popup" | "both";
type PrefNotification = keyof typeof E_NOTIFICATIONS;
type PrefLanguage = "en" | "fr" | "es" | "pt-br";
type PrefReactionType = "reaction" | "button";

interface Preferences {
  useUsers: PrefUseUsers
  tokenList: string[]
  rollEnabled: boolean
  rollType: PrefRollType
  notificationType: PrefNotificationType
  notifications: Set<PrefNotification>
  languague: PrefLanguage
  reactionType: PrefReactionType,
  claimDelay: number
  claimDelayRandom: boolean
  kakeraDelay: number
  kakeraDelayRandom: boolean
}

function App() {
  /// Popup state
  const [isConfiguringBOT, setIsConfiguringBOT] = useState(false);
  const [isConfiguringGuild, setIsConfiguringGuild] = useState(false);
  const [isConfiguringTokenlist, setIsConfiguringTokenlist] = useState(false);
  const [isConfiguringNotifications, setIsConfiguringNotifications] = useState(false);
  const [isConfiguringClaim, setIsConfiguringClaim] = useState(false);
  const [isConfiguringKakera, setIsConfiguringKakera] = useState(false);
  let [cantRunReason] = useState("");

  /// Bot state
  const [discordTab, setDiscordTab] = useState<chrome.tabs.Tab>();
  const [botState, setBotState] = useState<BotState>("unknown");

  const [preferences, setPreferences] = useState<Preferences>({
    useUsers: "logged",
    tokenList: [],
    rollEnabled: true,
    rollType: "wx",
    notificationType: "sound",
    notifications: new Set(),
    languague: "en",
    reactionType: "reaction",
    claimDelay: 0,
    kakeraDelay: 0,
    claimDelayRandom: false,
    kakeraDelayRandom: false
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
    preferences.notifications[e.target.checked ? "add" : "delete"](e.target.id.replace("sound-", "") as PrefNotification);
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
                      <button id="tokenlist-clear" data-tooltip="Clear" onClick={tokenListClear}>
                        {SVGS.X}
                      </button>
                      <button id="tokenlist-add" data-tooltip="Add" onClick={tokenListAdd}>
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
                  <div id="tokenlist" className="list">
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
              <input type="checkbox" checked={preferences.rollEnabled} onChange={(e) => setPreferences({ ...preferences, rollEnabled: e.target.checked })} />
              <select value={preferences.rollType} onChange={(e) => setPreferences({ ...preferences, rollType: e.target.value as PrefRollType })}>
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
                <span>{preferences.claimDelay}s</span>
                <input type="range" min={0} max={8.1} step={.1} value={preferences.claimDelay}
                  onChange={(e) => {
                    const delay = Number(e.target.value);
                    setPreferences({ ...preferences, claimDelay: Number(e.target.value), claimDelayRandom: delay > 0 ? preferences.claimDelayRandom : false })
                  }} />
              </div>
              <div className="item-wrapper inner-1" data-tooltip="Random delay between 0 and the config">
                <span>Random</span>
                <input type="checkbox" checked={preferences.claimDelayRandom} disabled={preferences.claimDelay === 0} onChange={(e) => setPreferences({ ...preferences, claimDelayRandom: e.target.checked })} />
              </div>
            </>
          }
          <div className="item-wrapper inner-0">
            <span>Kakera</span>
            <button {...(isConfiguringKakera && { className: "toggle" })} onClick={() => setIsConfiguringKakera(!isConfiguringKakera)}>
              {SVGS.ARROW}
            </button>
          </div>
          {
            isConfiguringKakera &&
            <>
              <div className="item-wrapper inner-1">
                <span>Delay</span>
                <span>{preferences.kakeraDelay}s</span>
                <input type="range" min={0} max={8.1} step={.1} value={preferences.kakeraDelay}
                  onChange={(e) => {
                    const delay = Number(e.target.value);
                    setPreferences({ ...preferences, kakeraDelay: Number(e.target.value), kakeraDelayRandom: delay > 0 ? preferences.kakeraDelayRandom : false })
                  }} />
              </div>
              <div className="item-wrapper inner-1" data-tooltip="Random delay between 0 and the config">
                <span>Random</span>
                <input type="checkbox" checked={preferences.kakeraDelayRandom} disabled={preferences.kakeraDelay === 0} onChange={(e) => setPreferences({ ...preferences, kakeraDelayRandom: e.target.checked })} />
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
                <select value={preferences.notificationType} onChange={(e) => setPreferences({ ...preferences, notificationType: e.target.value as PrefNotificationType })}>
                  <option value="sound">Sound</option>
                  <option value="popup">Popup</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="item-wrapper inner-1">
                <div id="soundlist" className="list">
                  {
                    Object.keys(E_NOTIFICATIONS).map((notification) =>
                      <div key={`soundchk-${notification}`}>
                        <input type="checkbox" id={`sound-${notification}`} checked={preferences.notifications.has(notification as PrefNotification)} onChange={handleSoundToggle} />
                        <label htmlFor={`sound-${notification}`}>{E_NOTIFICATIONS[notification as PrefNotification]}</label>
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
