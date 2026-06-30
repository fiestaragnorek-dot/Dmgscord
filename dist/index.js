(function(){
  var common=vendetta.metro&&vendetta.metro.common||{};
  var React=common.React;
  var RN=common.ReactNative||{};
  var i18n=common.i18n||{};
  var after=vendetta.patcher&&vendetta.patcher.after;
  var before=vendetta.patcher&&vendetta.patcher.before;
  var metro=vendetta.metro||{};
  var findByProps=metro.findByProps;
  var findByName=metro.findByName;
  var findByTypeName=metro.findByTypeName;
  var findByDisplayName=metro.findByDisplayName;
  var findAll=metro.findAll;
  var findInReactTree=vendetta.utils&&vendetta.utils.findInReactTree;
  var ui=vendetta.ui||{};
  var comps=ui.components||{};
  var Forms=comps.Forms||{};
  var General=comps.General||{};
  var showToast=ui.toasts&&ui.toasts.showToast||function(){};
  var showConfirmationAlert=ui.alerts&&ui.alerts.showConfirmationAlert||function(){};
  var getAssetIDByName=ui.assets&&ui.assets.getAssetIDByName||function(){};
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
  function getAuthor(m){
    return m&&((m.nick)||((m.author&&m.author.globalName))||((m.author&&m.author.username))||"")||"";
  }
  function uniqPush(arr,v){ if(v&&arr.indexOf(v)<0) arr.push(v); }
  function hasMark(children, mark){
    if(!Array.isArray(children)) return false;
    for(var i=0;i<children.length;i++) if(children[i]&&children[i].props&&children[i].props.__dmgscord===mark) return true;
    return false;
  }
  function findChildrenArray(node, pred, depth){
    depth=depth||0;
    if(depth>12||!node) return null;
    if(Array.isArray(node)){
      if(!pred||pred(node)) return node;
      for(var i=0;i<node.length;i++){
        var r=findChildrenArray(node[i],pred,depth+1);
        if(r) return r;
      }
      return null;
    }
    if(typeof node!=="object") return null;
    var ch=node.props&&node.props.children;
    if(Array.isArray(ch)){
      if(!pred||pred(ch,node)) return ch;
      return findChildrenArray(ch,pred,depth+1);
    }
    if(ch&&typeof ch==="object") return findChildrenArray(ch,pred,depth+1);
    return null;
  }
  function arrayHasAuthor(children, author){
    if(!Array.isArray(children)||!author) return false;
    for(var i=0;i<children.length;i++){
      var c=children[i];
      if(!c||!c.props) continue;
      var cc=c.props.children;
      if(typeof cc==="string"&&cc.indexOf(author)!==-1) return true;
      if(Array.isArray(cc)){
        for(var j=0;j<cc.length;j++){
          var v=cc[j];
          if(typeof v==="string"&&v.indexOf(author)!==-1) return true;
          if(v&&v.props&&typeof v.props.children==="string"&&v.props.children.indexOf(author)!==-1) return true;
        }
      }
    }
    return false;
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

  function setInputText(inputProps, text){
    if(inputProps&&typeof inputProps.handleTextChanged==="function") return inputProps.handleTextChanged(text);
    if(inputProps&&typeof inputProps.onChangeText==="function") return inputProps.onChangeText(text);
  }

  function EnBtn(props){
    var inputProps=props.inputProps||{};
    var st=React.useState(inputProps.value||"");
    var text=st[0],setText=st[1];
    React.useEffect(function(){
      var des=[];
      try{ if(before&&inputProps&&typeof inputProps.handleTextChanged==="function") des.push(before("handleTextChanged",inputProps,function(a){ setText(a&&a[0]||""); })); }catch(e){ warn(e); }
      try{ if(after&&inputProps&&typeof inputProps.onChangeText==="function") des.push(after("onChangeText",inputProps,function(a){ setText(a&&a[0]||""); },true)); }catch(e){ warn(e); }
      return function(){ while(des.length) try{ des.pop()(); }catch(e){} };
    },[inputProps]);
    if(!text) return React.createElement(RN.View,{__dmgscord:props.__dmgscord});
    return React.createElement(RN.Pressable,{__dmgscord:props.__dmgscord,onPress:function(){
      showToast("Translating...");
      translate(text,"en").then(function(out){ setInputText(inputProps,out); showToast("Done"); }).catch(function(){ showToast("Translate failed"); });
    },style:{paddingHorizontal:8,paddingVertical:6,borderRadius:12,backgroundColor:"#5865F2",marginHorizontal:4,alignSelf:"center"}},React.createElement(RN.Text,{style:{color:"white",fontSize:12,fontWeight:"600"}},"🌐 EN"));
  }

  function EnFloat(props){
    var inputProps=props.inputProps||{};
    var st=React.useState("");
    var text=st[0],setText=st[1];
    React.useEffect(function(){
      var des=[];
      try{ if(before&&inputProps&&typeof inputProps.handleTextChanged==="function") des.push(before("handleTextChanged",inputProps,function(a){ setText(a&&a[0]||""); })); }catch(e){ warn(e); }
      try{ if(after&&inputProps&&typeof inputProps.onChangeText==="function") des.push(after("onChangeText",inputProps,function(a){ setText(a&&a[0]||""); },true)); }catch(e){ warn(e); }
      return function(){ while(des.length) try{ des.pop()(); }catch(e){} };
    },[inputProps]);
    if(!text) return null;
    return React.createElement(RN.View,{pointerEvents:"box-none",style:{position:"absolute",right:56,bottom:10,zIndex:9999}},React.createElement(RN.Pressable,{onPress:function(){
      showToast("Translating...");
      translate(text,"en").then(function(out){ setInputText(inputProps,out); showToast("Done"); }).catch(function(){ showToast("Translate failed"); });
    },style:{paddingHorizontal:10,paddingVertical:7,borderRadius:14,backgroundColor:"#5865F2"}},React.createElement(RN.Text,{style:{color:"#fff",fontSize:12,fontWeight:"700"}},"🌐 EN")));
  }

  function makeTranslateRow(baseType, baseProps, message, text){
    var p={};
    var k;
    baseProps=baseProps||{};
    for(k in baseProps) p[k]=baseProps[k];
    p.key="dmgscord-translate-ru";
    p.message="Translate to Russian";
    p.icon=getAssetIDByName("ic_message_edit") || baseProps.icon;
    p.destructive=false;
    p.onPress=function(){
      try{ var laz=findByProps&&findByProps("openLazy","hideActionSheet"); laz&&laz.hideActionSheet&&laz.hideActionSheet(); }catch(e){}
      showToast("Translating...");
      translate(text,"ru").then(function(out){
        showConfirmationAlert({title:"🇷🇺 RU",content:out,confirmText:"OK",onConfirm:function(){}});
      }).catch(function(){ showToast("Translate failed"); });
    };
    return React.createElement(baseType, p);
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

  function patchInputViaGuard(){
    var mods=[];
    try{ uniqPush(mods, findByName&&findByName("ChatInputGuardWrapper",false)); }catch(e){}
    try{ if(findAll) (findAll(function(m){ return m&&m.default&&typeof m.default==="function"&&/ChatInputGuardWrapper/i.test(m.default.name||""); })||[]).forEach(function(m){ uniqPush(mods,m); }); }catch(e){}
    mods.forEach(function(mod){
      try{
        unpatches.push(after("default",mod,function(_,ret){
          try{
            if(!ret) return ret;
            var refNode=findInReactTree&&findInReactTree(ret,function(x){ return !!(x&&((x.chatInputRef)||(x.props&&x.props.chatInputRef&&x.props.chatInputRef.current))); });
            var inputProps=refNode&&(refNode.chatInputRef||(refNode.props&&refNode.props.chatInputRef&&refNode.props.chatInputRef.current));
            if(!inputProps||!(inputProps.handleTextChanged||inputProps.onChangeText)) return ret;
            var children=(ret.props&&Array.isArray(ret.props.children)&&ret.props.children)||findChildrenArray(ret,function(arr,owner){ return owner&&owner.type&&owner.type.displayName==="View"; });
            if(!Array.isArray(children)||hasMark(children,"en")) return ret;
            children.unshift(React.createElement(EnBtn,{inputProps:inputProps,__dmgscord:"en",key:"dmgs-en"}));
          }catch(e){ warn("Dmgscord guard patch",e); }
          return ret;
        }));
      }catch(e){ warn("Dmgscord patchInputViaGuard load",e); }
    });
  }

  function patchInputLegacy(){
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
            if(!inputProps||!(inputProps.handleTextChanged||inputProps.onChangeText)||!Array.isArray(children)||hasMark(children,"en")) return;
            children.splice(Math.max(children.length-1,0),0,React.createElement(EnBtn,{inputProps:inputProps,__dmgscord:"en",key:"dmgs-en"}));
          }catch(e){ warn("Dmgscord legacy input patch",e); }
        }));
      }
    }catch(e){ warn("Dmgscord legacy input fail",e); }
  }

  function patchSendLongPress(){
    try{
      if(!before||!RN.Pressable) return;
      var sendLabel=(i18n.Messages&&i18n.Messages.SEND)||"Send";
      unpatches.push(before("type",RN.Pressable,function(args){
        try{
          var a=args&&args[0];
          if(!a) return;
          if(a.accessibilityLabel===sendLabel&&typeof a.onPress==="function"){
            a.onLongPress=function(){ showToast("Hold send fallback is active"); };
          }
        }catch(e){}
      }));
    }catch(e){ warn("Dmgscord send fallback fail",e); }
  }

  function patchChatViewOverlay(){
    try{
      var ChatView=findByTypeName&&findByTypeName("ChatView");
      if(after&&ChatView){
        unpatches.push(after("type",ChatView,function(args,ret){
          try{
            var p=args&&args[0]||{};
            var inputRef=p.chatInputRef&&(p.chatInputRef.current||p.chatInputRef);
            if(!inputRef) return ret;
            return React.createElement(React.Fragment,{},ret,React.createElement(EnFloat,{inputProps:inputRef}));
          }catch(e){ warn("Dmgscord ChatView overlay",e); return ret; }
        }));
      }
    }catch(e){ warn("Dmgscord ChatView overlay fail",e); }
  }

  function patchMessageActionSheet(){
    try{
      var LazyActionSheet=findByProps&&findByProps("openLazy","hideActionSheet");
      if(!LazyActionSheet||!before) return;
      unpatches.push(before("openLazy",LazyActionSheet,function(args){
        try{
          var component=args&&args[0], key=args&&args[1], msg=args&&args[2];
          var message=msg&&msg.message;
          var text=getText(message).trim();
          if(key!=="MessageLongPressActionSheet"||!message||!text||!component||typeof component.then!=="function") return;
          component.then(function(mod){
            var unp=after("default",mod,function(_,comp){
              try{ React.useEffect(function(){ return function(){ try{ unp(); }catch(e){} }; },[]); }catch(e){}
              var buttons=findInReactTree&&findInReactTree(comp,function(x){ return x&&x[0]&&x[0].type&&x[0].type.name==="ButtonRow"; });
              if(!buttons||!buttons.length) return comp;
              for(var i=0;i<buttons.length;i++) if(buttons[i]&&buttons[i].key==="dmgscord-translate-ru") return comp;
              var at=0;
              var markUnread=(i18n.Messages&&i18n.Messages.MARK_UNREAD)||"Mark Unread";
              for(i=0;i<buttons.length;i++) if(buttons[i]&&buttons[i].props&&buttons[i].props.message===markUnread){ at=i; break; }
              buttons.splice(at,0,makeTranslateRow(buttons[0].type, buttons[0].props, message, text));
              return comp;
            });
          });
        }catch(e){ warn("Dmgscord action sheet patch",e); }
      }));
    }catch(e){ warn("Dmgscord action sheet load fail",e); }
  }

  function patchHeaders(){
    var mods=[];
    try{ uniqPush(mods, findByName&&findByName("MessageHeader",false)); }catch(e){}
    try{ uniqPush(mods, findByTypeName&&findByTypeName("MessageHeader",false)); }catch(e){}
    try{ uniqPush(mods, findByDisplayName&&findByDisplayName("MessageHeader",false)); }catch(e){}
    try{ uniqPush(mods, findByName&&findByName("MessageUsername",false)); }catch(e){}
    try{ if(findAll) (findAll(function(m){ return m&&m.default&&typeof m.default==="function"&&/Message(Header|Username)/i.test(m.default.name||""); })||[]).forEach(function(m){ uniqPush(mods,m); }); }catch(e){}
    mods.forEach(function(mod){
      try{
        unpatches.push(after("default",mod,function(args,ret){
          try{
            var props=args&&args[0];
            var message=getMsg(props);
            var text=getText(message).trim();
            var author=getAuthor(message);
            if(!text) return ret;
            var children=findChildrenArray(ret,function(arr){ return arrayHasAuthor(arr,author); })||findChildrenArray(ret);
            if(!Array.isArray(children)||hasMark(children,"ru")) return ret;
            children.push(React.createElement(RuBtn,{message:message,__dmgscord:"ru",key:"dmgs-ru"}));
          }catch(e){ warn("Dmgscord header patch",e); }
          return ret;
        }));
      }catch(e){ warn("Dmgscord patchHeaders load",e); }
    });
    if(!mods.length) log("Dmgscord: no MessageHeader-like modules found");
  }

  return {
    onLoad:function(){
      patchInputViaGuard();
      patchInputLegacy();
      patchChatViewOverlay();
      patchSendLongPress();
      patchMessageActionSheet();
      patchHeaders();
      showToast("Dmgscord loaded");
    },
    onUnload:function(){
      while(unpatches.length) try{ unpatches.pop()(); }catch(e){}
    },
    settings:Settings
  };
})();
