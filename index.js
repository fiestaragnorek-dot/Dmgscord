(function(){
  var common=vendetta.metro&&vendetta.metro.common||{};
  var React=common.React;
  var RN=common.ReactNative||{};
  var after=vendetta.patcher&&vendetta.patcher.after;
  var before=vendetta.patcher&&vendetta.patcher.before;
  var findByProps=vendetta.metro&&vendetta.metro.findByProps;
  var findByTypeName=vendetta.metro&&vendetta.metro.findByTypeName;
  var showToast=vendetta.ui&&vendetta.ui.toasts&&vendetta.ui.toasts.showToast||function(){};
  var showConfirmationAlert=vendetta.ui&&vendetta.ui.alerts&&vendetta.ui.alerts.showConfirmationAlert||function(){};
  var getAssetIDByName=vendetta.ui&&vendetta.ui.assets&&vendetta.ui.assets.getAssetIDByName||function(){};
  var useProxy=vendetta.storage&&vendetta.storage.useProxy||function(){};
  var storage=vendetta.plugin&&vendetta.plugin.storage?vendetta.plugin.storage:{};
  var unpatches=[];

  if(storage.useWeb===undefined) storage.useWeb=true;

  function warn(){ try{ vendetta.logger&&vendetta.logger.warn&&vendetta.logger.warn.apply(vendetta.logger,arguments); }catch(e){} }
  function clean(x){ return String(x||"").trim(); }
  function pickText(m){
    if(!m) return "";
    if(typeof m.content==="string") return m.content;
    if(m.message&&typeof m.message.content==="string") return m.message.content;
    return "";
  }
  function esc(x){ return String(x).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
  function replaceAll(text, map){
    var out=String(text||"");
    Object.keys(map).sort(function(a,b){ return b.length-a.length; }).forEach(function(k){ out=out.replace(new RegExp(esc(k),"gi"),map[k]); });
    return out;
  }
  function slang(text){
    return String(text||"")
      .replace(/\bvery good\b/gi,"bussin'")
      .replace(/\bamazing\b/gi,"goated")
      .replace(/\bsuspicious\b/gi,"sus")
      .replace(/\breally\b/gi,"fr")
      .replace(/\beveryone\b/gi,"y'all")
      .replace(/\bfriend\b/gi,"bro");
  }

  var ruMap={
    hello:"привет",hi:"привет",hey:"хей",yes:"да",no:"нет",thanks:"спасибо","thank you":"спасибо",please:"пожалуйста",good:"хорошо",bad:"плохо",cool:"круто",what:"что",why:"почему",where:"где",when:"когда",who:"кто",friend:"друг",message:"сообщение"
  };
  var enMap={
    "привет":"hey","да":"yes","нет":"nah","спасибо":"thanks","пожалуйста":"please","хорошо":"good","плохо":"bad","круто":"cool","что":"what","почему":"why","где":"where","когда":"when","кто":"who","друг":"bro","сообщение":"message"
  };

  function fallbackTranslate(text, lang){
    return lang==="ru"?replaceAll(text,ruMap):slang(replaceAll(text,enMap));
  }

  function googleTranslate(text, lang){
    var tl=lang==="ru"?"ru":"en";
    var url="https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl="+tl+"&dt=t&q="+encodeURIComponent(text);
    return fetch(url).then(function(r){ return r.json(); }).then(function(json){
      var out="";
      try{
        var arr=json&&json[0]||[];
        for(var i=0;i<arr.length;i++) out+=arr[i]&&arr[i][0]||"";
      }catch(e){}
      out=clean(out);
      if(lang==="en") out=slang(out);
      return out||fallbackTranslate(text,lang)||text;
    });
  }

  function translate(text, lang){
    text=clean(text);
    if(!text) return Promise.reject(new Error("empty"));
    var key=lang+"|"+text;
    if(storage[key]) return Promise.resolve(storage[key]);
    var done=function(out){ out=clean(out)||text; storage[key]=out; return out; };
    if(storage.useWeb!==false&&typeof fetch==="function"){
      return googleTranslate(text,lang).then(done).catch(function(e){ warn("Dmgscord translate fail",e); return done(fallbackTranslate(text,lang)); });
    }
    return Promise.resolve(done(fallbackTranslate(text,lang)));
  }

  function setInputText(inputProps, text){
    if(inputProps&&typeof inputProps.handleTextChanged==="function") return inputProps.handleTextChanged(text);
    if(inputProps&&typeof inputProps.onChangeText==="function") return inputProps.onChangeText(text);
  }

  function ENButton(props){
    var inputProps=props.inputProps||{};
    var st=React.useState("");
    var text=st[0],setText=st[1];
    React.useEffect(function(){
      var ds=[];
      try{ if(before&&typeof inputProps.handleTextChanged==="function") ds.push(before("handleTextChanged",inputProps,function(a){ setText(clean(a&&a[0])); })); }catch(e){}
      try{ if(after&&typeof inputProps.onChangeText==="function") ds.push(after("onChangeText",inputProps,function(a){ setText(clean(a&&a[0])); },true)); }catch(e){}
      return function(){ while(ds.length) try{ ds.pop()(); }catch(e){} };
    },[inputProps]);
    if(!text) return null;
    return React.createElement(RN.View,{pointerEvents:"box-none",style:{position:"absolute",right:56,bottom:10,zIndex:9999}},React.createElement(RN.Pressable,{onPress:function(){
      showToast("Translating...");
      translate(text,"en").then(function(out){ setInputText(inputProps,out); showToast("Done"); }).catch(function(){ showToast("Translate failed"); });
    },style:{paddingHorizontal:10,paddingVertical:7,borderRadius:14,backgroundColor:"#5865F2"}},React.createElement(RN.Text,{style:{color:"#fff",fontSize:12,fontWeight:"700"}},"🌐 EN")));
  }

  function Settings(){
    useProxy(storage);
    return React.createElement(RN.ScrollView,null,
      React.createElement(RN.View,{style:{padding:16}},
        React.createElement(RN.Text,{style:{color:"white",fontSize:18,fontWeight:"700",marginBottom:8}},"Dmgscord"),
        React.createElement(RN.Text,{style:{color:"white",opacity:0.85,marginBottom:16}},"Free web translator. No OpenAI key needed."),
        React.createElement(RN.Pressable,{onPress:function(){ storage.useWeb=storage.useWeb===false?true:false; },style:{padding:12,borderRadius:12,backgroundColor:"#5865F2",marginBottom:12}},
          React.createElement(RN.Text,{style:{color:"white",fontWeight:"700"}},"Web translate: "+(storage.useWeb===false?"OFF":"ON"))
        ),
        React.createElement(RN.Text,{style:{color:"white",opacity:0.8}},"Long press a message -> Translate to Russian")
      )
    );
  }

  function patchChatView(){
    try{
      var ChatView=findByTypeName&&findByTypeName("ChatView");
      if(!ChatView||!after) return;
      unpatches.push(after("type",ChatView,function(args,ret){
        try{
          var p=args&&args[0]||{};
          var inputRef=p.chatInputRef&&(p.chatInputRef.current||p.chatInputRef);
          if(!inputRef) return ret;
          return React.createElement(React.Fragment,{},ret,React.createElement(ENButton,{inputProps:inputRef}));
        }catch(e){ warn("Dmgscord ChatView",e); return ret; }
      }));
    }catch(e){ warn("Dmgscord ChatView load",e); }
  }

  function patchLongPressMenu(){
    try{
      var LazyActionSheet=findByProps&&findByProps("openLazy","hideActionSheet");
      if(!LazyActionSheet||!before||!after) return;
      unpatches.push(before("openLazy",LazyActionSheet,function(args){
        try{
          var component=args&&args[0], key=args&&args[1], msg=args&&args[2];
          var message=msg&&msg.message;
          var text=clean(pickText(message));
          if(key!=="MessageLongPressActionSheet"||!message||!text||!component||typeof component.then!=="function") return;
          component.then(function(mod){
            var unp=after("default",mod,function(_,comp){
              try{ React.useEffect(function(){ return function(){ try{ unp(); }catch(e){} }; },[]); }catch(e){}
              var buttons=findInReactTree&&findInReactTree(comp,function(x){ return x&&x[0]&&x[0].type&&x[0].type.name==="ButtonRow"; });
              if(!buttons||!buttons.length) return comp;
              for(var i=0;i<buttons.length;i++) if(buttons[i]&&buttons[i].key==="dmgscord-ru") return comp;
              var sample=buttons[0];
              if(!sample) return comp;
              var row=React.cloneElement(sample,{
                key:"dmgscord-ru",
                message:"Translate to Russian",
                label:"Translate to Russian",
                icon:getAssetIDByName("ic_message_edit")||sample.props&&sample.props.icon,
                destructive:false,
                onPress:function(){
                  try{ LazyActionSheet.hideActionSheet&&LazyActionSheet.hideActionSheet(); }catch(e){}
                  showToast("Translating...");
                  translate(text,"ru").then(function(out){
                    showConfirmationAlert({title:"🇷🇺 RU",content:out,confirmText:"OK",onConfirm:function(){}});
                  }).catch(function(){ showToast("Translate failed"); });
                }
              });
              buttons.splice(0,0,row);
              return comp;
            });
          });
        }catch(e){ warn("Dmgscord long press",e); }
      }));
    }catch(e){ warn("Dmgscord long press load",e); }
  }

  return {
    onLoad:function(){
      patchChatView();
      patchLongPressMenu();
      showToast("Dmgscord loaded");
    },
    onUnload:function(){ while(unpatches.length) try{ unpatches.pop()(); }catch(e){} },
    settings:Settings
  };
})();
