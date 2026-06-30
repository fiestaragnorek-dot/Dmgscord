// Dmgscord v1.0.0 - Discord Translator for Kettu
// https://github.com/fiestaragnorek-dot/Dmgscord

let patches = [];
const storage = (globalThis.vendetta?.storage || {});

if (!storage.useAI) storage.useAI = false;
if (!storage.apiKey) storage.apiKey = "";
if (!storage.baseURL) storage.baseURL = "https://api.openai.com/v1";
if (!storage.model) storage.model = "gpt-4o-mini";
if (!storage.targetLangInput) storage.targetLangInput = "en";
if (!storage.offlineOnly) storage.offlineOnly = false;

// === American Slang Map ===
const americanSlangMap = {
    "это круто": "that's lit / fire",
    "круто": "lit / fire",
    "отлично": "lit / no cap",
    "классно": "lit / bussin'",
    "ты шутишь": "you cappin' / no cap",
    "шутка": "cap",
    "не шути": "no cap",
    "реально": "no cap",
    "правда": "no cap",
    "неправда": "that's cap",
    "ложь": "cap",
    "подозрительно": "sus",
    "подозрительный": "sus",
    "странно": "sus",
    "безумие": "that's wild",
    "безумно": "wild",
    "класс": "bussin'",
    "вкусно": "bussin'",
    "хорошо": "bussin' / lit",
    "плохо": "mid / trash",
    "норм": "mid",
    "средне": "mid",
    "отстой": "trash",
    "ужас": "trash",
    "крутой": "goated / fire",
    "лучший": "goated",
    "топ": "goated",
    "дерьмо": "mid / trash",
    "я в шоке": "that's crazy",
    "вау": "no cap / lit",
    "да ладно": "no cap / fr",
    "факт": "facts / fr",
    "правда брат": "fr fr",
    "брат": "bro / bruh",
    "друг": "bro",
    "ребята": "y'all",
    "вы все": "y'all",
    "все вы": "y'all",
    "понял": "got it / bet",
    "ок": "bet / aight",
    "ладно": "aight / bet",
    "не знаю": "idk",
    "пошли": "let's go",
    "давай": "let's go / bet",
    "согласен": "facts",
};

function applyAmericanSlang(text) {
    let result = text.toLowerCase();
    for (const [ru, en] of Object.entries(americanSlangMap)) {
        const regex = new RegExp(ru, "gi");
        result = result.replace(regex, en);
    }
    if (result.includes("lit")) result = result.replace(/lit/gi, "lit 🔥");
    if (result.includes("no cap")) result = result.replace(/no cap/gi, "no cap 💯");
    return result;
}

const offlineDict = {
    "hello": "привет", "hi": "привет", "good": "хорошо", "bad": "плохо",
    "yes": "да", "no": "нет", "thanks": "спасибо", "cool": "круто",
    "awesome": "классно", "lit": "круто", "sus": "подозрительно",
    "cap": "ложь", "no cap": "правда", "y'all": "вы все",
    "bro": "брат", "bet": "ладно", "facts": "факт", "mid": "средне",
    "trash": "отстой", "goated": "лучший", "bussin": "вкусно",
};

function detectLanguage(text) {
    return /[а-яё]/i.test(text) ? "ru" : /[a-z]/i.test(text) ? "en" : "unknown";
}

function offlineTranslate(text, target) {
    const lang = detectLanguage(text);
    if (target === "ru") {
        let res = text;
        for (const [en, ru] of Object.entries(offlineDict)) {
            res = res.replace(new RegExp(`\\b${en}\\b`, "gi"), ru);
        }
        return res;
    } else {
        let res = text;
        for (const [ru, en] of Object.entries(americanSlangMap)) {
            res = res.replace(new RegExp(ru, "gi"), en);
        }
        for (const [ru, en] of Object.entries(offlineDict)) {
            res = res.replace(new RegExp(`\\b${ru}\\b`, "gi"), en);
        }
        return applyAmericanSlang(res);
    }
}

async function aiTranslate(text, targetLang, isInput = false) {
    if (!storage.apiKey || storage.offlineOnly) {
        return offlineTranslate(text, targetLang === "ru" ? "ru" : "en");
    }

    const system = isInput 
        ? "Translate Russian to natural American English with heavy slang (lit, no cap, sus, bussin', y'all, goated, mid, fr fr, bet, aight)."
        : "Translate accurately to Russian.";

    try {
        const res = await fetch(`${storage.baseURL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${storage.apiKey}`
            },
            body: JSON.stringify({
                model: storage.model,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: `Translate to ${targetLang === "ru" ? "Russian" : "English"}: ${text}` }
                ],
                temperature: 0.3,
                max_tokens: 400
            })
        });
        const data = await res.json();
        let translated = data.choices?.[0]?.message?.content?.trim() || text;
        if (targetLang !== "ru" && isInput) translated = applyAmericanSlang(translated);
        return translated;
    } catch (e) {
        return offlineTranslate(text, targetLang === "ru" ? "ru" : "en");
    }
}

async function translateMessage(content) {
    if (!content) return content;
    if (detectLanguage(content) === "ru") return content;
    return (storage.useAI && storage.apiKey && !storage.offlineOnly)
        ? await aiTranslate(content, "ru", false)
        : offlineTranslate(content, "ru");
}

async function translateInput(content) {
    if (!content) return content;
    if (detectLanguage(content) === "en") return applyAmericanSlang(content);
    return (storage.useAI && storage.apiKey && !storage.offlineOnly)
        ? await aiTranslate(content, storage.targetLangInput, true)
        : offlineTranslate(content, "en");
}

// Patch message action sheet
function patchMessageActions() {
    const MessageActionSheet = globalThis.vendetta?.metro?.findByProps?.("MessageActionSheet");
    if (!MessageActionSheet) return;

    const unpatch = globalThis.vendetta?.patcher?.after("default", MessageActionSheet, (args, res) => {
        const msg = args[0]?.message;
        if (!msg?.content) return res;

        const btn = {
            label: "🌐 Перевести на русский",
            onPress: async () => {
                const t = await translateMessage(msg.content);
                globalThis.vendetta?.ui?.showToast?.("Перевод скопирован!", "success");
                if (navigator.clipboard) navigator.clipboard.writeText(t);
            }
        };

        console.log("[Dmgscord] Message translate button ready");
        return res;
    });
    patches.push(unpatch);
}

// Patch chat input
function patchChatInput() {
    const ChatInput = globalThis.vendetta?.metro?.findByProps?.("ChatInput");
    if (!ChatInput) return;

    const unpatch = globalThis.vendetta?.patcher?.after("default", ChatInput, (args, res) => {
        const props = res?.props;
        if (!props) return res;

        const btn = React.createElement("TouchableOpacity", {
            onPress: async () => {
                const input = props.inputRef?.current;
                if (!input?.value) return;
                const translated = await translateInput(input.value);
                if (input.setNativeProps) input.setNativeProps({ text: translated });
                globalThis.vendetta?.ui?.showToast?.("Переведено на английский + сленг!", "success");
            },
            style: {
                backgroundColor: "#5865F2",
                borderRadius: 18,
                paddingHorizontal: 12,
                paddingVertical: 5,
                marginRight: 6,
                alignSelf: "center"
            }
        }, React.createElement("Text", {
            style: { color: "#fff", fontSize: 13, fontWeight: "700" }
        }, "🌐 EN"));

        props.children = Array.isArray(props.children) 
            ? [...props.children, btn] 
            : [props.children, btn];
        return res;
    });
    patches.push(unpatch);
}

// Settings screen
function Settings() {
    const React = globalThis.React || require("react");
    const RN = globalThis.ReactNative || require("react-native");
    const { ScrollView, Text, View, Switch, TextInput, TouchableOpacity } = RN;

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
        globalThis.vendetta?.ui?.showToast?.("Настройки сохранены!", "success");
    };

    return React.createElement(ScrollView, { style: { flex: 1, padding: 16, backgroundColor: "#36393e" } },
        React.createElement(View, {},
            React.createElement(Text, { style: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 } }, "Dmgscord"),
            
            React.createElement(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 16 } },
                React.createElement(Text, { style: { color: "#ddd", flex: 1, fontSize: 16 } }, "Использовать AI"),
                React.createElement(Switch, { value: useAI, onValueChange: setUseAI })
            ),
            
            React.createElement(TextInput, {
                placeholder: "API Key",
                value: apiKey,
                onChangeText: setApiKey,
                secureTextEntry: true,
                style: { backgroundColor: "#2f3136", color: "#fff", padding: 14, borderRadius: 10, marginBottom: 12 }
            }),
            
            React.createElement(TextInput, {
                placeholder: "Base URL",
                value: baseURL,
                onChangeText: setBaseURL,
                style: { backgroundColor: "#2f3136", color: "#fff", padding: 14, borderRadius: 10, marginBottom: 12 }
            }),
            
            React.createElement(TextInput, {
                placeholder: "Model",
                value: model,
                onChangeText: setModel,
                style: { backgroundColor: "#2f3136", color: "#fff", padding: 14, borderRadius: 10, marginBottom: 12 }
            }),
            
            React.createElement(TextInput, {
                placeholder: "Целевой язык (en)",
                value: targetLang,
                onChangeText: setTargetLang,
                style: { backgroundColor: "#2f3136", color: "#fff", padding: 14, borderRadius: 10, marginBottom: 20 }
            }),
            
            React.createElement(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 20 } },
                React.createElement(Text, { style: { color: "#ddd", flex: 1, fontSize: 16 } }, "Только оффлайн"),
                React.createElement(Switch, { value: offlineOnly, onValueChange: setOfflineOnly })
            ),
            
            React.createElement(TouchableOpacity, {
                onPress: save,
                style: { backgroundColor: "#5865F2", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 }
            }, React.createElement(Text, { style: { color: "#fff", fontWeight: "700", fontSize: 16 } }, "Сохранить настройки")),
            
            React.createElement(TouchableOpacity, {
                onPress: async () => {
                    const test = "Привет, это очень круто, брат!";
                    const result = await aiTranslate(test, "en", true);
                    globalThis.alert?.("Тест перевода:\n" + result);
                },
                style: { backgroundColor: "#2f3136", padding: 16, borderRadius: 12, alignItems: "center" }
            }, React.createElement(Text, { style: { color: "#fff" } }, "Тест AI + сленг")),
        )
    );
}

// Plugin export
export default {
    onLoad() {
        console.log("[Dmgscord] Loaded successfully");
        patchMessageActions();
        patchChatInput();
        
        if (globalThis.vendetta) {
            globalThis.vendetta.plugin = { settings: Settings };
        }
        
        globalThis.vendetta?.ui?.showToast?.("Dmgscord загружен!", "success");
    },
    
    onUnload() {
        patches.forEach(p => p && p());
        patches = [];
    },
    
    settings: Settings
};
