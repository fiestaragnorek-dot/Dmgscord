(() => {
  const { React, ReactNative: RN } = vendetta.metro.common;
  const { after } = vendetta.patcher;
  const { findByProps, findByName, findByTypeName, findByDisplayName } = vendetta.metro;
  const { findInReactTree } = vendetta.utils;
  const { Forms = {}, General = {} } = vendetta.ui.components;
  const { showToast } = vendetta.ui.toasts;
  const { showConfirmationAlert } = vendetta.ui.alerts;
  const { useProxy } = vendetta.storage;
  const s = vendetta.plugin.storage;
  const unpatches = [];

  const defaults = {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    cache: {},
  };
  for (const k in defaults) s[k] ??= defaults[k];

  const ruMap = {
    "no cap": "без шуток",
    sus: "подозрительно",
    lit: "жестко",
    goated: "легендарно",
    bussin: "топ",
    hello: "привет",
    hi: "привет",
    hey: "хей",
    yes: "да",
    no: "нет",
    thanks: "спасибо",
    "thank you": "спасибо",
    please: "пожалуйста",
    bro: "бро",
    love: "люблю",
    good: "хорошо",
    bad: "плохо",
    cool: "круто",
    what: "что",
    why: "почему",
    where: "где",
    when: "когда",
    who: "кто",
    i: "я",
    you: "ты",
    we: "мы",
    they: "они",
    this: "это",
    that: "то",
    friend: "друг",
    message: "сообщение",
  };

  const enMap = {
    "без шуток": "no cap",
    "привет": "hey",
    "да": "yes",
    "нет": "nah",
    "спасибо": "thanks",
    "пожалуйста": "please",
    "люблю": "love",
    "хорошо": "good",
    "плохо": "bad",
    "круто": "cool",
    "что": "what",
    "почему": "why",
    "где": "where",
    "когда": "when",
    "кто": "who",
    "я": "i",
    "ты": "you",
    "вы": "y'all",
    "мы": "we",
    "они": "they",
    "это": "this",
    "то": "that",
    "друг": "bro",
    "сообщение": "message",
  };

  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rep = (text, map) =>
    Object.entries(map)
      .sort((a, b) => b[0].length - a[0].length)
      .reduce((out, [from, to]) => out.replace(new RegExp(esc(from), "gi"), to), text);

  const slang = (text) =>
    text
      .replace(/\bvery good\b/gi, "bussin'")
      .replace(/\bamazing\b/gi, "goated")
      .replace(/\bsuspicious\b/gi, "sus")
      .replace(/\bfor real\b/gi, "no cap")
      .replace(/\beveryone\b/gi, "y'all")
      .replace(/\bfriend\b/gi, "bro")
      .replace(/\breally\b/gi, "fr");

  const offlineRu = (text) => rep(text, ruMap);
  const offlineEn = (text) => slang(rep(text, enMap));

  async function translate(text, lang) {
    text = (text || "").trim();
    if (!text) throw new Error("empty");
    const key = `${lang}|${text}`;
    if (s.cache[key]) return s.cache[key];

    let out = "";
    if (s.baseUrl && s.model) {
      try {
        const res = await fetch(`${s.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: s.model,
            temperature: lang === "en" ? 0.9 : 0.2,
            messages: [
              {
                role: "system",
                content:
                  lang === "ru"
                    ? "Translate the user text to natural Russian. Return only the translated text."
                    : "Translate the user text to natural American English. Use casual modern US slang when it fits, like lit, no cap, sus, y'all, bussin', goated, fr. Keep the meaning. Return only the translated text.",
              },
              { role: "user", content: text },
            ],
          }),
        });
        const json = await res.json();
        out = json?.choices?.[0]?.message?.content?.trim() || "";
      } catch (e) {
        vendetta.logger.warn("Dmgscord AI fail", e);
      }
    }

    if (!out) out = lang === "ru" ? offlineRu(text) : offlineEn(text);
    s.cache[key] = out || text;
    return s.cache[key];
  }

  const getMsg = (x) => x?.message || x?.item?.message || x?.item || x?.props?.message || null;
  const getText = (m) => (typeof (m?.content ?? m?.message?.content) === "string" ? (m.content ?? m.message?.content) : "");

  const RuBtn = ({ message, __dmgscord }) =>
    React.createElement(
      RN.Text,
      {
        __dmgscord,
        onPress: async () => {
          const text = getText(message).trim();
          if (!text) return showToast("No text");
          showToast("Translating...");
          try {
            showConfirmationAlert({
              title: "🇷🇺 RU",
              content: await translate(text, "ru"),
              confirmText: "OK",
              onConfirm: () => {},
            });
          } catch {
            showToast("Translate failed");
          }
        },
        style: { fontSize: 12, marginLeft: 6, opacity: 0.9 },
      },
      "🌐 RU",
    );

  const EnBtn = ({ inputProps, __dmgscord }) => {
    const [text, setText] = React.useState(inputProps?.value || "");
    React.useEffect(() => after("onChangeText", inputProps, ([t]) => setText(t || ""), true), [inputProps]);

    if (!text) return React.createElement(RN.View, { __dmgscord });

    return React.createElement(
      RN.Pressable,
      {
        __dmgscord,
        onPress: async () => {
          showToast("Translating...");
          try {
            inputProps.onChangeText?.(await translate(text, "en"));
            showToast("Done");
          } catch {
            showToast("Translate failed");
          }
        },
        style: {
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 12,
          backgroundColor: "#5865F2",
          marginHorizontal: 4,
          alignSelf: "center",
        },
      },
      React.createElement(RN.Text, { style: { color: "white", fontSize: 12, fontWeight: "600" } }, "🌐 EN"),
    );
  };

  const Settings = () => {
    useProxy(s);
    const Scroll = General.ScrollView || RN.ScrollView;
    const Section = Forms.FormSection || RN.View;
    const Input = Forms.FormInput || RN.TextInput;

    return React.createElement(
      Scroll,
      null,
      React.createElement(
        Section,
        { title: "Dmgscord" },
        React.createElement(Input, {
          title: "API Key",
          placeholder: "sk-...",
          secureTextEntry: true,
          value: s.apiKey,
          onChange: (v) => (s.apiKey = v),
          onChangeText: (v) => (s.apiKey = v),
          style: { margin: 12 },
        }),
        React.createElement(Input, {
          title: "Base URL",
          placeholder: "https://api.openai.com/v1",
          value: s.baseUrl,
          onChange: (v) => (s.baseUrl = v),
          onChangeText: (v) => (s.baseUrl = v),
          style: { margin: 12 },
        }),
        React.createElement(Input, {
          title: "Model",
          placeholder: "gpt-4o-mini",
          value: s.model,
          onChange: (v) => (s.model = v),
          onChangeText: (v) => (s.model = v),
          style: { margin: 12 },
        }),
      ),
    );
  };

  return {
    onLoad() {
      const ChatInput = findByProps("ChatInput")?.ChatInput;
      if (ChatInput?.prototype?.render) {
        unpatches.push(
          after("render", ChatInput.prototype, (_, ret) => {
            const inputProps = findInReactTree(ret?.props?.children, (x) => x?.type?.name === "ChatInput")?.props;
            const children = findInReactTree(ret?.props?.children, (x) => Array.isArray(x?.props?.children))?.props?.children;
            if (!inputProps?.onChangeText || !Array.isArray(children) || children.some((x) => x?.props?.__dmgscord === "en")) return;
            children.splice(Math.max(children.length - 1, 0), 0, React.createElement(EnBtn, { inputProps, __dmgscord: "en", key: "dmgs-en" }));
          }),
        );
      }

      const Header = findByName("MessageHeader", false) || findByTypeName("MessageHeader", false) || findByDisplayName("MessageHeader", false);
      if (Header?.default) {
        unpatches.push(
          after("default", Header, ([props], ret) => {
            const message = getMsg(props);
            const text = getText(message).trim();
            const children = findInReactTree(ret, (x) => Array.isArray(x?.props?.children))?.props?.children;
            if (!text || !Array.isArray(children) || children.some((x) => x?.props?.__dmgscord === "ru")) return ret;
            children.push(React.createElement(RuBtn, { message, __dmgscord: "ru", key: "dmgs-ru" }));
            return ret;
          }),
        );
      }
    },

    onUnload() {
      for (const unpatch of unpatches.splice(0)) try { unpatch(); } catch {}
    },

    settings: Settings,
  };
})();
