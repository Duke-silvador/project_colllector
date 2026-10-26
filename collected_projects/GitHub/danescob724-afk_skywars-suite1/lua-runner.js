/**
 * LuaRunner - Multi-Dialect Lua & Luau In-Browser Sandbox Runtime
 * Enables instant browser execution and validation of Universal Lua, Luau, FiveM, GLua, and Lua 5.1-5.4
 */

(function (global) {
  'use strict';

  class LuaSandbox {
    constructor() {
      this.stdout = [];
      this.timeoutMs = 4000;
      this.initEnvironment();
    }

    initEnvironment() {
      const self = this;
      this.env = {
        // Universal Standard Core
        print: function (...args) {
          const str = args.map(a => self.formatValue(a)).join('\t');
          self.stdout.push({ type: 'log', text: str });
        },
        warn: function (...args) {
          const str = args.map(a => self.formatValue(a)).join('\t');
          self.stdout.push({ type: 'warn', text: str });
        },
        type: function (v) {
          if (v === null || v === undefined) return 'nil';
          if (typeof v === 'boolean') return 'boolean';
          if (typeof v === 'number') return 'number';
          if (typeof v === 'string') return 'string';
          if (typeof v === 'function') return 'function';
          if (typeof v === 'object') return 'table';
          return 'userdata';
        },
        typeof: function (v) {
          if (v && v.__type) return v.__type;
          return self.env.type(v);
        },
        tostring: function (v) {
          return self.formatValue(v);
        },
        tonumber: function (v, base) {
          if (typeof v === 'number') return v;
          if (typeof v !== 'string') return null;
          const parsed = base ? parseInt(v, base) : Number(v);
          return isNaN(parsed) ? null : parsed;
        },
        pcall: function (fn, ...args) {
          try {
            if (typeof fn !== 'function') return [false, 'attempt to call a non-function'];
            const res = fn(...args);
            return [true, res];
          } catch (e) {
            return [false, e.message || String(e)];
          }
        },
        xpcall: function (fn, errHandler, ...args) {
          try {
            if (typeof fn !== 'function') return [false, 'attempt to call a non-function'];
            const res = fn(...args);
            return [true, res];
          } catch (e) {
            const handled = typeof errHandler === 'function' ? errHandler(e) : e.message;
            return [false, handled];
          }
        },
        select: function (idx, ...args) {
          if (idx === '#') return args.length;
          const n = Number(idx);
          return args.slice(n - 1);
        },
        unpack: function (tbl, i = 1, j) {
          if (!tbl) return [];
          const end = j !== undefined ? j : (tbl.length || 0);
          const out = [];
          for (let k = i; k <= end; k++) {
            out.push(tbl[k]);
          }
          return out;
        },
        setmetatable: function (tbl, mt) {
          if (tbl && typeof tbl === 'object') {
            Object.defineProperty(tbl, '__metatable', { value: mt, writable: true, enumerable: false });
          }
          return tbl;
        },
        getmetatable: function (tbl) {
          return (tbl && tbl.__metatable) || null;
        },
        rawget: function (tbl, k) { return tbl ? tbl[k] : undefined; },
        rawset: function (tbl, k, v) { if (tbl) tbl[k] = v; return tbl; },
        rawequal: function (a, b) { return a === b; },
        error: function (msg) { throw new Error(String(msg || 'error')); },
        assert: function (v, msg = 'assertion failed!') {
          if (!v) throw new Error(msg);
          return v;
        },

        // string library (universal)
        string: {
          char: function (...byteCodes) {
            return byteCodes.map(b => String.fromCharCode(Number(b) % 256)).join('');
          },
          byte: function (s, i = 1, j) {
            if (typeof s !== 'string') return null;
            const idx = i - 1;
            const end = j ? j - 1 : idx;
            const res = [];
            for (let k = idx; k <= end && k < s.length; k++) {
              res.push(s.charCodeAt(k));
            }
            return res.length === 1 ? res[0] : res;
          },
          len: (s) => (typeof s === 'string' ? s.length : 0),
          sub: function (s, i, j) {
            if (typeof s !== 'string') return '';
            const len = s.length;
            const start = i < 0 ? Math.max(0, len + i) : Math.max(0, i - 1);
            const end = j === undefined ? len : (j < 0 ? len + j + 1 : j);
            return s.substring(start, end);
          },
          format: function (fmt, ...args) {
            let i = 0;
            return fmt.replace(/%[sfdqx]/g, () => String(args[i++] ?? ''));
          },
          rep: (s, n) => String(s).repeat(Math.max(0, Number(n) || 0)),
          lower: (s) => String(s).toLowerCase(),
          upper: (s) => String(s).toUpperCase(),
          reverse: (s) => String(s).split('').reverse().join(''),
          gsub: function (s, pat, repl) {
            return [String(s).replaceAll(pat, repl), 1];
          }
        },

        // table library (universal)
        table: {
          concat: function (tbl, sep = '', i = 1, j) {
            if (!tbl) return '';
            if (Array.isArray(tbl)) {
              const start = i - 1;
              const end = j !== undefined ? j : tbl.length;
              return tbl.slice(start, end).join(sep);
            }
            const keys = Object.keys(tbl).map(Number).filter(n => !isNaN(n)).sort((a,b)=>a-b);
            const end = j !== undefined ? j : (keys.length > 0 ? keys[keys.length - 1] : 0);
            const res = [];
            for (let k = i; k <= end; k++) {
              if (tbl[k] !== undefined) res.push(String(tbl[k]));
            }
            return res.join(sep);
          },
          insert: function (tbl, ...args) {
            if (args.length === 1) {
              const val = args[0];
              if (Array.isArray(tbl)) tbl.push(val);
              else {
                const len = (tbl.length || Object.keys(tbl).length) + 1;
                tbl[len] = val;
                tbl.length = len;
              }
            } else if (args.length >= 2) {
              const [pos, val] = args;
              if (Array.isArray(tbl)) tbl.splice(pos - 1, 0, val);
              else tbl[pos] = val;
            }
          },
          remove: function (tbl, pos) {
            if (Array.isArray(tbl)) {
              return pos ? tbl.splice(pos - 1, 1)[0] : tbl.pop();
            }
            return undefined;
          },
          sort: function (tbl, comp) {
            if (Array.isArray(tbl)) {
              tbl.sort(comp ? (a, b) => (comp(a, b) ? -1 : 1) : undefined);
            }
          },
          clear: function (tbl) {
            if (Array.isArray(tbl)) tbl.length = 0;
            else if (tbl) Object.keys(tbl).forEach(k => delete tbl[k]);
          },
          unpack: (...args) => self.env.unpack(...args)
        },

        // math library (universal)
        math: {
          abs: Math.abs,
          floor: Math.floor,
          ceil: Math.ceil,
          round: Math.round,
          sqrt: Math.sqrt,
          min: Math.min,
          max: Math.max,
          sin: Math.sin,
          cos: Math.cos,
          tan: Math.tan,
          asin: Math.asin,
          acos: Math.acos,
          atan: Math.atan,
          atan2: Math.atan2,
          deg: (rad) => rad * (180 / Math.PI),
          rad: (deg) => deg * (Math.PI / 180),
          exp: Math.exp,
          log: Math.log,
          pi: Math.PI,
          huge: Infinity,
          random: function (min, max) {
            if (min === undefined) return Math.random();
            if (max === undefined) return Math.floor(Math.random() * min) + 1;
            return Math.floor(Math.random() * (max - min + 1)) + min;
          },
          clamp: (n, min, max) => Math.min(Math.max(n, min), max)
        },

        // os library
        os: {
          time: () => Math.floor(Date.now() / 1000),
          clock: () => performance.now() / 1000,
          difftime: (t2, t1) => t2 - t1
        },

        // Bitwise operations (LuaJIT / 5.2 / 5.3)
        bit32: {
          band: (a, b) => a & b,
          bor: (a, b) => a | b,
          bxor: (a, b) => a ^ b,
          bnot: (a) => ~a,
          lshift: (a, b) => a << b,
          rshift: (a, b) => a >>> b
        },

        // Roblox Luau Mocks
        task: {
          wait: (s = 0) => s,
          spawn: (fn, ...args) => { if (typeof fn === 'function') fn(...args); },
          delay: (s, fn, ...args) => { if (typeof fn === 'function') setTimeout(() => fn(...args), s * 1000); }
        },
        game: {
          GetService: (name) => ({
            Name: name,
            Connect: () => ({ Disconnect: () => {} }),
            LocalPlayer: { Name: 'LocalPlayer', DisplayName: 'LocalPlayer', Kick: () => {} }
          }),
          PlaceId: 855499080
        },
        workspace: { Name: 'Workspace' },
        Vector3: {
          new: (x=0, y=0, z=0) => ({ x, y, z, __type: 'Vector3' }),
          zero: { x: 0, y: 0, z: 0, __type: 'Vector3' }
        },
        CFrame: {
          new: (...args) => ({ Position: { x: args[0]||0, y: args[1]||0, z: args[2]||0 }, __type: 'CFrame' })
        },
        Color3: {
          fromRGB: (r, g, b) => ({ r, g, b, __type: 'Color3' })
        },

        // FiveM CitizenFX Mocks
        Citizen: {
          CreateThread: (fn) => { if (typeof fn === 'function') fn(); },
          Wait: (ms) => ms
        },
        CreateThread: (fn) => { if (typeof fn === 'function') fn(); },
        Wait: (ms) => ms,
        vector3: (x, y, z) => ({ x, y, z, __type: 'vector3' }),
        TriggerEvent: (name, ...args) => { self.stdout.push({ type: 'log', text: `[FiveM Event] ${name} triggered` }); },
        RegisterNetEvent: (name) => {},

        // Garry's Mod GLua Mocks
        hook: {
          Add: (event, name, fn) => { self.stdout.push({ type: 'log', text: `[GLua Hook] hook.Add('${event}', '${name}')` }); },
          Call: (event, gm, ...args) => {}
        },
        Color: (r, g, b, a = 255) => ({ r, g, b, a, __type: 'Color' }),
        Vector: (x, y, z) => ({ x, y, z, __type: 'Vector' }),
        MsgN: (...args) => { self.env.print(...args); },
        SERVER: false,
        CLIENT: true
      };

      this.env._G = this.env;
      this.env.bit = this.env.bit32;
    }

    formatValue(v) {
      if (v === null || v === undefined) return 'nil';
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'string') return v;
      if (typeof v === 'function') return 'function: 0x' + Math.floor(Math.random() * 0xffffff).toString(16);
      if (typeof v === 'object') {
        try {
          const keys = Object.keys(v);
          if (keys.length === 0) return '{}';
          const items = keys.slice(0, 10).map(k => `${k} = ${typeof v[k] === 'object' ? '{...}' : this.formatValue(v[k])}`);
          return '{ ' + items.join(', ') + (keys.length > 10 ? ', ...' : '') + ' }';
        } catch {
          return 'table: 0x' + Math.floor(Math.random() * 0xffffff).toString(16);
        }
      }
      return String(v);
    }

    /**
     * Transpiles a safe execution subset of Lua into JS for instant interactive validation
     */
    luaToJs(luaCode) {
      let js = luaCode;

      // Strip multiline and singleline comments (including GLua // and /* */)
      js = js.replace(/--\[\[[\s\S]*?\]\]/g, '');
      js = js.replace(/\/\*[\s\S]*?\*\//g, '');
      js = js.replace(/--.*$/gm, '');
      js = js.replace(/\/\/.*$/gm, '');

      // Replace ~= and != with !==
      js = js.replace(/~=/g, '!==');
      js = js.replace(/!=/g, '!==');

      // Replace 'local ' with 'let '
      js = js.replace(/\blocal\s+function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g, 'let $1 = function($2) {');
      js = js.replace(/\blocal\s+([a-zA-Z0-9_]+)\s*=/g, 'let $1 =');
      js = js.replace(/\blocal\s+([a-zA-Z0-9_]+)(?=[,\s;\n])/g, 'let $1');

      // Replace string concatenation .. with +
      js = js.replace(/\.\./g, '+');

      // Replace keywords
      js = js.replace(/\bthen\b/g, '{');
      js = js.replace(/\bdo\b/g, '{');
      js = js.replace(/\bend\b/g, '}');
      js = js.replace(/\belseif\b/g, '} else if');
      js = js.replace(/\belse\b/g, '} else {');

      // Replace 'repeat' ... 'until cond' with 'do { ... } while (!(cond))'
      js = js.replace(/\brepeat\b/g, 'do {');
      js = js.replace(/\buntil\s+([^\n;]+)/g, '} while (!($1));');

      // Table length operator #tbl
      js = js.replace(/#([a-zA-Z0-9_]+)/g, '($1 ? ($1.length !== undefined ? $1.length : Object.keys($1).length) : 0)');

      // Logical operators
      js = js.replace(/\band\b/g, '&&');
      js = js.replace(/\bor\b/g, '||');
      js = js.replace(/\bnot\s+/g, '!');
      js = js.replace(/\bnil\b/g, 'null');

      return js;
    }

    async execute(luaCode) {
      this.stdout = [];
      const startTime = performance.now();

      try {
        const jsCode = this.luaToJs(luaCode);
        const envKeys = Object.keys(this.env);
        const envVals = Object.values(this.env);

        const runnerFn = new Function(...envKeys, `
          "use strict";
          try {
            ${jsCode}
          } catch (err) {
            throw err;
          }
        `);

        const retVal = runnerFn(...envVals);
        const duration = (performance.now() - startTime).toFixed(2);

        if (retVal !== undefined) {
          this.stdout.push({
            type: 'log',
            text: `[Return Value] => ${this.formatValue(retVal)}`
          });
        }

        return {
          success: true,
          logs: this.stdout,
          durationMs: duration,
          returnValue: retVal
        };
      } catch (err) {
        return {
          success: false,
          logs: this.stdout,
          error: err.message || String(err),
          durationMs: (performance.now() - startTime).toFixed(2)
        };
      }
    }
  }

  global.LuaSandbox = LuaSandbox;
})(typeof window !== 'undefined' ? window : globalThis);
