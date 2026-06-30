// Dmgscord v1.4 - Minimal Working Version
// https://github.com/fiestaragnorek-dot/Dmgscord

const storage = vendetta.storage || {};

if (!storage.useAI) storage.useAI = false;
if (!storage.apiKey) storage.apiKey = "";
if (!storage.baseURL) storage.baseURL = "https://api.groq.com/openai/v1";
if (!storage.model) storage.model = "llama-3.3-70b-versatile";
if (!storage.targetLangInput) storage.targetLangInput = "en";
if (!storage.offlineOnly) storage.offlineOnly = false;

const slang = {
    "это круто": "that's lit",
    "круто": "lit",
    "отлично": "no cap",
    "ты шутишь": "you cappin'",
    "подозрительно": "sus",
    "правда": "no cap",
    "брат": "bro",
    "ладно": "bet",
    "факт": "facts",
    "лучший": "goated",
};

function applySlang(t) {
    let r = t.toLowerCase();
    for (const [ru, en] of Object.entries(slang)) {
        r = r.replace(new RegExp(ru, "gi"), en);
    }
    return r;
}

function detect(t) {
    return /[а-яё]/i.test(t) ? "ru" : "en";
}

function offline(t, toRu) {
    const d = { "hello": "привет", "hi": "привет", "good": "хорошо", "yes": "да", "no": "нет", "cool": "круто", "lit": "круто", "sus": "подозрительно", "bro": "брат", "bet": "ладно" };
    if (toRu) {
        let res = t;
        Object.entries(d).forEach(([e, r]) => res = res.replace(new RegExp(e, "gi"), r));
        return res;
    }
    let res = t;
    Object.entries(slang).forEach(([ru, en]) => res = res.replace(new RegExp(ru, "gi"), en));
    return applySlang(res);
}

async function aiTranslate(text, target, isInput) {
    if (!storage.apiKey || storage.offlineOnly) return offline(text, target === "ru");
    
    try {
        const res = await fetch(`${storage.baseURL}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${storage.apiKey}` },
            body: JSON.stringify({
                model: storage.model,
                messages: [
                    { role: "system", content: isInput ? "Translate to casual American English with slang (lit, no cap, sus, y'all, bet)." : "Translate to Russian." },
                    { role: "user", content: `Translate to ${target}: ${text}` }
                ],
                temperature: 0.2,
                max_tokens: 250
            })
        });
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || text;
    } catch {
        return offline(text, target === "ru");
    }
}

async function translateMsg(content) {
    if (!content) return content;
    if (detect(content) === "ru") return content;
    return storage.useAI && storage.apiKey ? await aiTranslate(content, "ru", false) : offline(content, true);
}

async function translateInput(content) {
    if (!content) return content;
    if (detect(content) === "en") return applySlang(content);
    return storage.useAI && storage.apiKey ? await aiTranslate(content, storage.targetLangInput, true) : offline(content, false);
}

// ==================== PLUGIN ====================
export default {
    onLoad() {
        console.log("[Dmgscord] v1.4 loaded");

        // Message header button (next to username)
        const MessageHeader = vendetta.metro.findByProps("MessageHeader");
        if (MessageHeader) {
            vendetta.patcher.after("default", MessageHeader, (args, res) => {
                const msg = args[0]?.message;
                if (!msg?.content) return res;

                const btn = React.createElement("TouchableOpacity", {
                    onPress: async () => {
                        const translated = await translateMsg(msg.content);
                        vendetta.ui.showToast("Переведено на русский!", "success");
                        navigator.clipboard?.writeText(translated);
                    },
                    style: { marginLeft: 8, padding: 4, backgroundColor: "#5865F2", borderRadius: 6 }
                }, React.createElement("Text", { style: { color: "#fff", fontSize: 11, fontWeight: "700" } }, "🌐 RU"));

                if (res?.props?.children) {
                    const ch = Array.isArray(res.props.children) ? res.props.children : [res.props.children];
                    ch.push(btn);
                    res.props.children = ch;
                }
                return res;
            });
        }

        // Input button
        const ChatInput = vendetta.metro.findByProps("ChatInput");
        if (ChatInput) {
            vendetta.patcher.after("default", ChatInput, (_, res) => {
                const props = res?.props;
                if (!props) return res;

                const btn = React.createElement("TouchableOpacity", {
                    onPress: async () => {
                        const input = props.inputRef?.current;
                        if (!input?.value) return vendetta.ui.showToast("Напиши текст", "info");
                        const t = await translateInput(input.value);
                        if (input.setNativeProps) input.setNativeProps({ text: t });
                        vendetta.ui.showToast("Переведено!", "success");
                    },
                    style: { backgroundColor: "#5865F2", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8, alignSelf: "center" }
                }, React.createElement("Text", { style: { color: "#fff", fontWeight: "700", fontSize: 12 } }, "🌐 EN"));

                props.children = Array.isArray(props.children) ? [...props.children, btn] : [props.children, btn];
                return res;
            });
        }

        vendetta.ui.showToast("Dmgscord v1.4 загружен", "success");
    },

    onUnload() {},

    settings: Settings
};

function Settings() {
    const React = vendetta.React;
    const { ScrollView, Text, View, Switch, TextInput, TouchableOpacity } = vendetta.ReactNative;

    const [useAI, setUseAI] = React.useState(storage.useAI);
    const [apiKey, setApiKey] = React.useState(storage.apiKey);
    const [baseURL, setBaseURL] = React.useState(storage.baseURL);
    const [model, setModel] = React.useState(storage.model);
    const [targetLang, setTargetLang] = React.useState(storage.targetLangInput);
    const [offlineOnly, setOfflineOnly] = React.useState(storage.offlineOnly);

    const save = () => {
        storage.useAI = useAI;
        storage.apiKey = apiKey;
        storage.baseURL = baseURL;
        storage.model = model;
        storage.targetLangInput = targetLang;
        storage.offlineOnly = offlineOnly;
        vendetta.ui.showToast("Сохранено", "success");
    };

    return React.createElement(ScrollView, { style: { flex: 1, padding: 16, backgroundColor: "#36393e" } },
        React.createElement(View, null,
            React.createElement(Text, { style: { color: "#fff", fontSize: 20, fontWeight: "bold", marginBottom: 16 } }, "Dmgscord"),
            React.createElement(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 12 } },
                React.createElement(Text, { style: { color: "#ddd", flex: 1 } }, "Использовать AI"),
                React.createElement(Switch, { value: useAI, onValueChange: setUseAI })
            ),
            React.createElement(TextInput, { placeholder: "API Key", value: apiKey, onChangeText: setApiKey, secureTextEntry: true, style: { backgroundColor: "#2f3136", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 8 } }),
            React.createElement(TextInput, { placeholder: "Base URL", value: baseURL, onChangeText: setBaseURL, style: { backgroundColor: "#2f3136", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 8 } }),
            React.createElement(TextInput, { placeholder: "Model", value: model, onChangeText: setModel, style: { backgroundColor: "#2f3136", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 8 } }),
            React.createElement(TextInput, { placeholder: "Целевой язык (en)", value: targetLang, onChangeText: setTargetLang, style: { backgroundColor: "#2f3136", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 12 } }),
            React.createElement(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 16 } },
                React.createElement(Text, { style: { color: "#ddd", flex: 1 } }, "Только оффлайн"),
                React.createElement(Switch, { value: offlineOnly, onValueChange: setOfflineOnly })
            ),
            React.createElement(TouchableOpacity, { onPress: save, style: { backgroundColor: "#5865F2", padding: 12, borderRadius: 8, alignItems: "center" } },
                React.createElement(Text, { style: { color: "#fff", fontWeight: "600" } }, "Сохранить")
            ),
            React.createElement(TouchableOpacity, {
                onPress: async () => {
                    const test = "Привет, это очень круто!";
                    const result = await aiTranslate(test, "en", true);
                    alert(result);
                },
                style: { marginTop: 10, backgroundColor: "#2f3136", padding: 12, borderRadius: 8, alignItems: "center" }
            }, React.createElement(Text, { style: { color: "#fff" } }, "Тест перевода"))
        )
    );
}
