(function(){
  var common=vendetta.metro&&vendetta.metro.common||{};
  var React=common.React;
  var RN=common.ReactNative||{};
  var after=vendetta.patcher&&vendetta.patcher.after;
  var metro=vendetta.metro||{};
  var findByProps=metro.findByProps;
  var findByName=metro.findByName;
  var findByTypeName=metro.findByTypeName;
  var findByDisplayName=metro.findByDisplayName;
  var findInReactTree=vendetta.utils&&vendetta.utils.findInReactTree;
  var ui=vendetta.ui||{};
  var comps=ui.components||{};
  var Forms=comps.Forms||{};
  var General=comps.General||{};
  var showToast=ui.toasts&&ui.toasts.showToast||function(){};
  var showConfirmationAlert=ui.alerts&&ui.alerts.showConfirmationAlert||function(){};
  var useProxy=vendetta.storage&&vendetta.storage.useProxy||function(){};
  var s=vendetta.plugin&&vendetta.plugin.storage?vendetta.plugin.storage:{};
  var unpatches=[];

  function def(k,v){ if(s[k]===undefined||s[k]===null) s[k]=v; }
  def("apiKey","");
  def("baseUrl","https://api.openai.com/v1");
  def("model","gpt-4o-mini");
  if(!s.cache||typeof s.cache!=="object") s.cache={};

  var ruMap={"no cap":"без шуток",sus:"подозрительно",lit:"жестко",goated:"легендарно",bussin:"топ",hello:"привет",hi:"привет",hey:"хей",yes:"да",no:"нет",thanks:"спасибо","thank you":"спасибо",please:"пожалуйста",bro:"бро",love:"люблю",good:"хорошо",bad:"плохо",cool:"круто",what:"что",why:"почему",where:"где",when:"когда",who:"кто",i:"я",you:"ты",we:"мы",they:"они",this:"это",that:"то",friend:"друг",message:"сообщение"};
  var enMap={"без шуток":"no cap","привет":"hey","да":"yes","нет":"nah","спасибо":"thanks","пожалуйста":"please","люблю":"love","хорошо":"good","плохо":"bad","круто":"cool","что":"what","почему":"why","где":"where","когда":"when","кто":"who","я":"i","ты":"you","вы":"y'all","мы":"we","они":"they","это":"this","то":"that","друг":"bro","сообщение":"message"};

  function esc(x){ return String(x).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
  function rep(text,map){
    var out=String(text||"");
    Object.keys(map).sort(function(a,b){ return b.length-a.length; }).forEach(function(from){ out=out.replace(new RegExp(esc(from),"gi"),map[from]); });
    return out;
  }
  function slang(text){
    return String(text||"")
      .replace(/\bvery good\b/gi,"bussin'")
      .replace(/\bamazing\b/gi,"goated")
      .replace(/\bsuspicious\b/gi,"sus")
      .replace(/\bfor real\b/gi,"no cap")
      .replace(/\beveryone\b/gi,"y'all")
      .replace(/\bfriend\b/gi,"bro")
      .replace(/\breally\b/gi,"fr");
  }
  function offlineRu(text){ return rep(text,ruMap); }
  function offlineEn(text){ return slang(rep(text,enMap)); }
  function log(){ try{ vendetta.logger&&vendetta.logger.log&&vendetta.logger.log.apply(vendetta.logger,arguments); }catch(e){} }
  function warn(){ try{ vendetta.logger&&vendetta.logger.warn&&vendetta.logger.warn.apply(vendetta.logger,arguments); }catch(e){} }

  function translate(text,lang){
    text=String(text||"").trim();
    if(!text) return Promise.reject(new Error("empty"));
    var key=lang+"|"+text;
    if(s.cache[key]) return Promise.resolve(s.cache[key]);
    var fallback=function(){ var out=lang==="ru"?offlineRu(text):offlineEn(text); s.cache[key]=out||text; return s.cache[key]; };
    if(!s.baseUrl||!s.model||typeof fetch!=="function") return Promise.resolve(fallback());
    return fetch(String(s.baseUrl).replace(/\/$/,"")+"/chat/completions",{
      method:"POST",
      headers:(function(){ var h={"Content-Type":"application/json"}; if(s.apiKey) h.Authorization="Bearer "+s.apiKey; return h; })(),
      body:JSON.stringify({
        model:s.model,
        temperature:lang==="en"?0.9:0.2,
        messages:[
          {role:"system",content:lang==="ru"?"Translate the user text to natural Russian. Return only the translated text.":"Translate the user text to natural American English. Use casual modern US slang when it fits, like lit, no cap, sus, y'all, bussin', goated, fr. Keep the meaning. Return only the translated text."},
          {role:"user",content:text}
        ]
      })
    }).then(function(r){ return r.json(); }).then(function(json){
      var out=json&&json.choices&&json.choices[0]&&json.choices[0].message&&json.choices[0].message.content;
      out=String(out||"").trim();
      if(!out) out=fallback();
      s.cache[key]=out||text;
      return s.cache[key];
    }).catch(function(e){ warn("Dmgscord AI fail",e); return fallback(); });
  }

  function getMsg(x){
    if(!x) return null;
    return x.message||(x.item&&x.item.message)||x.item||(x.props&&x.props.message)||null;
  }
  function getText(m){
    if(!m) return "";
    if(typeof m.content==="string") return m.content;
    if(m.message&&typeof m.message.content==="string") return m.message.content;
    return "";
  }

  function RuBtn(props){
    return React.createElement(RN.Text,{__dmgscord:props.__dmgscord,onPress:function(){
      var text=getText(props.message).trim();
      if(!text) return showToast("No text");
      showToast("Translating...");
      translate(text,"ru").then(function(out){
        showConfirmationAlert({title:"🇷🇺 RU",content:out,confirmText:"OK",onConfirm:function(){}});
      }).catch(function(){ showToast("Translate failed"); });
    },style:{fontSize:12,marginLeft:6,opacity:0.9}},"🌐 RU");
  }

  function EnBtn(props){
    var inputProps=props.inputProps||{};
    var st=React.useState(inputProps.value||"");
    var text=st[0],setText=st[1];
    React.useEffect(function(){
      if(!after||!inputProps||typeof inputProps.onChangeText!=="function") return;
      try{ return after("onChangeText",inputProps,function(a){ setText(a&&a[0]||""); },true); }catch(e){ warn(e); }
    },[inputProps]);
    if(!text) return React.createElement(RN.View,{__dmgscord:props.__dmgscord});
    return React.createElement(RN.Pressable,{__dmgscord:props.__dmgscord,onPress:function(){
      showToast("Translating...");
      translate(text,"en").then(function(out){
        if(typeof inputProps.onChangeText==="function") inputProps.onChangeText(out);
        showToast("Done");
      }).catch(function(){ showToast("Translate failed"); });
    },style:{paddingHorizontal:8,paddingVertical:6,borderRadius:12,backgroundColor:"#5865F2",marginHorizontal:4,alignSelf:"center"}},React.createElement(RN.Text,{style:{color:"white",fontSize:12,fontWeight:"600"}},"🌐 EN"));
  }

  function Settings(){
    useProxy(s);
    var Scroll=General.ScrollView||RN.ScrollView||RN.View;
    var Section=Forms.FormSection||RN.View;
    var Input=Forms.FormInput||RN.TextInput||RN.View;
    return React.createElement(Scroll,null,React.createElement(Section,{title:"Dmgscord"},
      React.createElement(Input,{title:"API Key",placeholder:"sk-...",secureTextEntry:true,value:s.apiKey,onChange:function(v){s.apiKey=v;},onChangeText:function(v){s.apiKey=v;},style:{margin:12}}),
      React.createElement(Input,{title:"Base URL",placeholder:"https://api.openai.com/v1",value:s.baseUrl,onChange:function(v){s.baseUrl=v;},onChangeText:function(v){s.baseUrl=v;},style:{margin:12}}),
      React.createElement(Input,{title:"Model",placeholder:"gpt-4o-mini",value:s.model,onChange:function(v){s.model=v;},onChangeText:function(v){s.model=v;},style:{margin:12}})
    ));
  }

  return {
    onLoad:function(){
      try{
        var cip=findByProps&&findByProps("ChatInput");
        var ChatInput=cip&&cip.ChatInput;
        if(after&&ChatInput&&ChatInput.prototype&&ChatInput.prototype.render){
          unpatches.push(after("render",ChatInput.prototype,function(_,ret){
            try{
              if(!ret||!findInReactTree) return;
              var inputNode=findInReactTree(ret.props&&ret.props.children,function(x){ return x&&x.type&&x.type.name==="ChatInput"; });
              var inputProps=inputNode&&inputNode.props;
              var wrap=findInReactTree(ret.props&&ret.props.children,function(x){ return x&&x.props&&Array.isArray(x.props.children); });
              var children=wrap&&wrap.props&&wrap.props.children;
              if(!inputProps||typeof inputProps.onChangeText!=="function"||!Array.isArray(children)) return;
              for(var i=0;i<children.length;i++) if(children[i]&&children[i].props&&children[i].props.__dmgscord==="en") return;
              children.splice(Math.max(children.length-1,0),0,React.createElement(EnBtn,{inputProps:inputProps,__dmgscord:"en",key:"dmgs-en"}));
            }catch(e){ warn("Dmgscord chat patch",e); }
          }));
        }
      }catch(e){ warn("Dmgscord ChatInput load fail",e); }

      try{
        var H=(findByName&&findByName("MessageHeader",false))||(findByTypeName&&findByTypeName("MessageHeader",false))||(findByDisplayName&&findByDisplayName("MessageHeader",false));
        if(after&&H&&H.default){
          unpatches.push(after("default",H,function(args,ret){
            try{
              var props=args&&args[0];
              var message=getMsg(props);
              var text=getText(message).trim();
              var wrap=findInReactTree&&findInReactTree(ret,function(x){ return x&&x.props&&Array.isArray(x.props.children); });
              var children=wrap&&wrap.props&&wrap.props.children;
              if(!text||!Array.isArray(children)) return ret;
              for(var i=0;i<children.length;i++) if(children[i]&&children[i].props&&children[i].props.__dmgscord==="ru") return ret;
              children.push(React.createElement(RuBtn,{message:message,__dmgscord:"ru",key:"dmgs-ru"}));
            }catch(e){ warn("Dmgscord header patch",e); }
            return ret;
          }));
        }else log("Dmgscord: MessageHeader not found");
      }catch(e){ warn("Dmgscord MessageHeader load fail",e); }
    },
    onUnload:function(){
      while(unpatches.length) try{ unpatches.pop()(); }catch(e){}
    },
    settings:Settings
  };
})();
