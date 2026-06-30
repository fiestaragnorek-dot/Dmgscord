// Dmgscord v1.6 - Kettu Compatible
const manifest = {
    name: "Dmgscord",
    description: "Translator with AI + Slang",
    authors: [{ name: "Dmgscord" }],
    version: "1.6"
};

export default {
    manifest,
    onLoad() {
        const storage = vendetta.storage || {};
        storage.baseURL = storage.baseURL || "https://api.groq.com/openai/v1";

        // Button next to username
        const MH = vendetta.metro.findByProps("MessageHeader");
        if (MH) vendetta.patcher.after("default", MH, (args, res) => {
            const msg = args[0]?.message;
            if (!msg?.content) return res;
            const btn = React.createElement("TouchableOpacity", {
                onPress: async () => {
                    let t = msg.content;
                    if (!/[а-яё]/i.test(t) && storage.apiKey) {
                        try {
                            const r = await fetch(storage.baseURL + "/chat/completions", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${storage.apiKey}` },
                                body: JSON.stringify({ model: storage.model || "llama-3.3-70b-versatile", messages: [{ role: "user", content: "Translate to Russian: " + t }], max_tokens: 150 })
                            });
                            const d = await r.json();
                            t = d.choices?.[0]?.message?.content || t;
                        } catch(e) {}
                    }
                    navigator.clipboard.writeText(t);
                    vendetta.ui.showToast("Скопировано", "success");
                },
                style: { marginLeft: 6, padding: 3, backgroundColor: "#5865F2", borderRadius: 4 }
            }, React.createElement("Text", { style: { color: "#fff", fontSize: 10, fontWeight: "700" } }, "RU"));
            if (res.props.children) {
                const arr = Array.isArray(res.props.children) ? res.props.children : [res.props.children];
                arr.push(btn);
                res.props.children = arr;
            }
            return res;
        });

        // Button near send
        const CI = vendetta.metro.findByProps("ChatInput");
        if (CI) vendetta.patcher.after("default", CI, (_, res) => {
            const p = res.props;
            if (!p) return res;
            const btn = React.createElement("TouchableOpacity", {
                onPress: () => {
                    const inp = p.inputRef?.current;
                    if (!inp?.value) return;
                    let txt = inp.value;
                    if (!/[а-яё]/i.test(txt)) txt = txt.replace(/это круто/gi, "lit").replace(/круто/gi, "lit").replace(/отлично/gi, "no cap");
                    if (inp.setNativeProps) inp.setNativeProps({ text: txt });
                    vendetta.ui.showToast("Переведено", "success");
                },
                style: { backgroundColor: "#5865F2", borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2, marginRight: 5 }
            }, React.createElement("Text", { style: { color: "#fff", fontSize: 10, fontWeight: "700" } }, "EN"));
            p.children = Array.isArray(p.children) ? [...p.children, btn] : [p.children, btn];
            return res;
        });

        vendetta.ui.showToast("Dmgscord v1.6", "success");
    },
    onUnload() {},
    settings: () => React.createElement("View", { style: { padding: 16 } }, React.createElement("Text", { style: { color: "#fff" } }, "Dmgscord — настрой API в storage"))
};
