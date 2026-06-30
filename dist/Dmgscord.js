// Dmgscord v1.5 - Ultra Minimal (Manifest Fix)
export default {
    onLoad() {
        const storage = vendetta.storage || {};
        if (!storage.baseURL) storage.baseURL = "https://api.groq.com/openai/v1";

        // Message button
        const MessageHeader = vendetta.metro.findByProps("MessageHeader");
        if (MessageHeader) {
            vendetta.patcher.after("default", MessageHeader, (args, res) => {
                const msg = args[0]?.message;
                if (!msg?.content) return res;

                const btn = React.createElement("TouchableOpacity", {
                    onPress: async () => {
                        let text = msg.content;
                        if (/[а-яё]/i.test(text)) {
                            vendetta.ui.showToast("Уже на русском", "info");
                            return;
                        }
                        vendetta.ui.showToast("Перевод...", "info");
                        
                        if (storage.apiKey) {
                            try {
                                const r = await fetch(storage.baseURL + "/chat/completions", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + storage.apiKey },
                                    body: JSON.stringify({
                                        model: storage.model || "llama-3.3-70b-versatile",
                                        messages: [{ role: "user", content: "Translate to Russian: " + text }],
                                        max_tokens: 200
                                    })
                                });
                                const d = await r.json();
                                text = d.choices?.[0]?.message?.content || text;
                            } catch(e) {}
                        }
                        navigator.clipboard.writeText(text);
                        vendetta.ui.showToast("Скопировано!", "success");
                    },
                    style: { marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: "#5865F2", borderRadius: 5 }
                }, React.createElement("Text", { style: { color: "#fff", fontSize: 10, fontWeight: "700" } }, "RU"));

                if (res.props.children) {
                    const arr = Array.isArray(res.props.children) ? res.props.children : [res.props.children];
                    arr.push(btn);
                    res.props.children = arr;
                }
                return res;
            });
        }

        // Input button
        const ChatInput = vendetta.metro.findByProps("ChatInput");
        if (ChatInput) {
            vendetta.patcher.after("default", ChatInput, (_, res) => {
                const p = res.props;
                if (!p) return res;

                const btn = React.createElement("TouchableOpacity", {
                    onPress: async () => {
                        const inp = p.inputRef?.current;
                        if (!inp?.value) return;
                        let txt = inp.value;
                        if (!/[а-яё]/i.test(txt)) {
                            txt = txt.toLowerCase().replace(/это круто/g, "that's lit").replace(/круто/g, "lit").replace(/отлично/g, "no cap");
                        }
                        if (inp.setNativeProps) inp.setNativeProps({ text: txt });
                        vendetta.ui.showToast("Готово", "success");
                    },
                    style: { backgroundColor: "#5865F2", borderRadius: 14, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6 }
                }, React.createElement("Text", { style: { color: "#fff", fontSize: 11, fontWeight: "700" } }, "EN"));

                p.children = Array.isArray(p.children) ? [...p.children, btn] : [p.children, btn];
                return res;
            });
        }

        vendetta.ui.showToast("Dmgscord загружен", "success");
    },
    onUnload() {},
    settings: () => React.createElement("View", null, React.createElement("Text", { style: { color: "#fff" } }, "Dmgscord Settings (простая версия)"))
};
