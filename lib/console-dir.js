// @file console-dir.js
// @brief
// @author ongaeshi
// @date   2011/06/02
//
// --------------------------------------
// console.dir({a: 1, b: 2, c: 3});
// => 
// info:
//   a: 1
//   b: 2
//   c: 3
//
//
// --------------------------------------
// console.dir_s({a: 1, b: 2, c: 3});
//     => "info:\n   a: 1\n   b: 2\n   c: 3"
// 
// --------------------------------------
// console.dir({f1: function() {}, f2: function() {}, f3: function() {}}, "Disp functions.");
// => 
// info: 
// Disp functions.
//   f1()
//   f2()
//   f3()
//
// --------------------------------------
// console.dir({f1: function() {}, a : 1, b : 2, funcs: function() {}}, "property & function");
// => 
// info: 
// property & function
//   property:
//     a: 1
//     b: 2
//   function:
//     f1()
//     funcs()
//
// --------------------------------------
// const panel = require('panel');
// console.dir(panel.Panel({
//   width: 800,
//   height: 800,
//   contentURL: data.url('index.html'),
//   contentScriptFile: [data.url('game.js')],
//   contentScriptWhen: 'ready'
// }));
// => 
// info:
//   property:
//     allow: [object Object]
//     contentScript: null
//     contentScriptFile: resource://jid1-ckmgqls2uqipog-enchant-test-data/game.js
//     contentScriptWhen: "ready"
//     contentURL: "resource://jid1-ckmgqls2uqipog-enchant-test-data/index.html"
//     height: 800
//     isShowing: false
//     port: [object Trait]
//     width: 800
//   function:
//     destroy()
//     hide()
//     on()
//     once()
//     postMessage()
//     removeListener()
//     resize()
//     show()
//
// --------------------------------------

console.dir_s = function (object, msg) {
  var disp_properties  = function (properties, indent, out) {
    for (var i = 0; i < properties.length; ++i) {
      var name = properties[i][0], value = properties[i][1];

      if (typeof value == "string")
        value = '"' + value + '"';

      out.push(indent + name + ": " + value);
    }
  };
  
  var disp_funcs  = function (funcs, indent, out) {
    for (var i = 0; i < funcs.length; ++i) {
      var name = funcs[i][0], value = funcs[i][1];
      out.push(indent + name + "()");
    }
  };

  var pairs = [];
  for (var name in object) {
    try {
      pairs.push([name, object[name]]);
    }
    catch (exc) {
    }
  }
  pairs.sort(function(a, b) { return a[0] < b[0] ? -1 : 1; });

  var properties = [];
  var funcs = [];
  
  for (var i = 0; i < pairs.length; ++i) {
    switch (typeof pairs[i][1]) {
    case "function":
      funcs.push(pairs[i]);
      break;
    default:
      properties.push(pairs[i]);
      break;
    }
  }

  var out = [];

  out.push("");
  if (msg != null)
    out.push(msg);

  if (properties.length > 0 && funcs.length != 0) {
    out.push("  property:");
    disp_properties(properties, "    ", out);
  } else {
    disp_properties(properties, "  ", out);
  }

  if (funcs.length > 0 && properties.length != 0) {
    out.push("  function:");
    disp_funcs(funcs, "    ", out);
  } else {
    disp_funcs(funcs, "  ", out);
  }
  
  return out.join("\n");
}

console.dir = function (object, msg) {
  console.log(console.dir_s(object, msg));
}

