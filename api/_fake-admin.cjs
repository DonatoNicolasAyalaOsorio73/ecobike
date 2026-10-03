// In-memory stand-in for firebase-admin, for handler tests only (never
// deployed: files starting with "_" are not Vercel functions). It implements
// just the Firestore/Auth/Storage surface the api/*.js handlers use, so a
// test can run a real handler end to end without touching any real project.
// ponytail: single-process fake, no listeners or security rules; the rules
// have their own emulator test (tests/firestore.rules.test.mjs).
const path = require("node:path");

class Timestamp {
  constructor(ms) {
    this.ms = ms;
  }
  toMillis() {
    return this.ms;
  }
  static fromMillis(ms) {
    return new Timestamp(ms);
  }
}
const SENTINEL = Symbol("fieldValue");
const FieldValue = {
  serverTimestamp: () => ({ [SENTINEL]: "ts" }),
  increment: (n) => ({ [SENTINEL]: "inc", n }),
  delete: () => ({ [SENTINEL]: "del" }),
  arrayRemove: (...v) => ({ [SENTINEL]: "rm", v }),
  arrayUnion: (...v) => ({ [SENTINEL]: "un", v }),
};
const AggregateField = { count: () => ({ op: "count" }), sum: (f) => ({ op: "sum", f }) };

const plain = (v) => (v instanceof Timestamp ? v.ms : v);

function applyValue(prev, v, now) {
  if (v && typeof v === "object" && SENTINEL in v) {
    switch (v[SENTINEL]) {
      case "ts":
        return new Timestamp(now());
      case "inc":
        return (prev ?? 0) + v.n;
      case "del":
        return undefined;
      case "rm":
        return (prev ?? []).filter((x) => !v.v.includes(x));
      case "un":
        return [...new Set([...(prev ?? []), ...v.v])];
    }
  }
  return v;
}

function createFirestore(state) {
  const docs = state.docs; // Map<path, data>
  const now = () => state.now;

  const write = (p, data, merge) => {
    const base = merge ? { ...(docs.get(p) ?? {}) } : {};
    for (const [k, v] of Object.entries(data)) {
      const val = applyValue(base[k], v, now);
      if (val === undefined) delete base[k];
      else base[k] = val;
    }
    docs.set(p, base);
  };

  const snap = (p) => {
    const data = docs.get(p);
    return { id: path.posix.basename(p), exists: data !== undefined, data: () => (data ? { ...data } : undefined), ref: docRef(p) };
  };

  function docRef(p) {
    return {
      id: path.posix.basename(p),
      path: p,
      get: async () => snap(p),
      set: async (d, o) => write(p, d, o?.merge),
      update: async (d) => {
        if (!docs.has(p)) throw Object.assign(new Error(`No document to update: ${p}`), { code: 5 });
        write(p, d, true);
      },
      delete: async () => void docs.delete(p),
      collection: (c) => collRef(`${p}/${c}`),
    };
  }

  function query(match, opts = {}) {
    const q = {
      where: (f, op, v) => query(match, { ...opts, filters: [...(opts.filters ?? []), [f, op, v]] }),
      orderBy: (f, dir = "asc") => query(match, { ...opts, order: [f, dir] }),
      startAt: (v) => query(match, { ...opts, startAt: v }),
      endAt: (v) => query(match, { ...opts, endAt: v }),
      startAfter: (v) => query(match, { ...opts, startAfter: v }),
      limit: (n) => query(match, { ...opts, limit: n }),
      select: () => q,
      async get() {
        let rows = [...docs.keys()].filter(match).map(snap);
        for (const [f, op, v] of opts.filters ?? []) {
          rows = rows.filter((s) => {
            const x = plain(s.data()[f]);
            const y = plain(v);
            if (op === "==") return x === y;
            if (op === ">=") return x >= y;
            if (op === ">") return x > y;
            if (op === "<") return x < y;
            if (op === "<=") return x <= y;
            if (op === "array-contains") return Array.isArray(x) && x.includes(y);
            throw new Error(`fake: unsupported op ${op}`);
          });
        }
        if (opts.order) {
          const [f, dir] = opts.order;
          const key = (s) => (f === "__name__" ? s.id : plain(s.data()[f]));
          rows = rows.filter((s) => key(s) !== undefined).sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (dir === "desc" ? -1 : 1));
          if (opts.startAt !== undefined) rows = rows.filter((s) => key(s) >= opts.startAt);
          if (opts.endAt !== undefined) rows = rows.filter((s) => key(s) <= opts.endAt);
          if (opts.startAfter !== undefined) rows = rows.slice(rows.findIndex((s) => key(s) === opts.startAfter) + 1);
        }
        if (opts.limit !== undefined) rows = rows.slice(0, opts.limit);
        return { docs: rows, size: rows.length, empty: rows.length === 0 };
      },
      count: () => ({
        get: async () => {
          const n = (await q.get()).size;
          return { data: () => ({ count: n }) };
        },
      }),
      aggregate: (spec) => ({
        get: async () => {
          const { docs: rows } = await q.get();
          const out = {};
          for (const [k, a] of Object.entries(spec)) out[k] = a.op === "count" ? rows.length : rows.reduce((s, r) => s + (r.data()[a.f] ?? 0), 0);
          return { data: () => out };
        },
      }),
    };
    return q;
  }

  function collRef(p) {
    const depth = p.split("/").length + 1;
    const q = query((k) => k.startsWith(`${p}/`) && k.split("/").length === depth);
    return Object.assign(q, {
      doc: (id) => docRef(`${p}/${id ?? `auto${++state.seq}`}`),
      add: async (d) => {
        const ref = docRef(`${p}/auto${++state.seq}`);
        await ref.set(d);
        return ref;
      },
    });
  }

  return {
    collection: (c) => collRef(c),
    collectionGroup: (id) => query((k) => k.split("/").at(-2) === id),
    doc: (p) => docRef(p),
    async runTransaction(fn) {
      const tx = {
        get: (x) => x.get(),
        set: (ref, d, o) => void write(ref.path, d, o?.merge),
        update: (ref, d) => void write(ref.path, d, true),
        delete: (ref) => void docs.delete(ref.path),
      };
      return fn(tx);
    },
    async recursiveDelete(ref) {
      for (const k of [...docs.keys()]) if (k === ref.path || k.startsWith(`${ref.path}/`)) docs.delete(k);
    },
  };
}

function createAuth(state) {
  const notFound = () => Object.assign(new Error("user not found"), { code: "auth/user-not-found" });
  const user = (uid) => {
    const u = state.users.get(uid);
    if (!u) throw notFound();
    return u;
  };
  return {
    async verifyIdToken(token) {
      const d = state.tokens.get(token);
      if (!d || state.revoked.has(d.uid)) throw new Error("invalid token");
      return d;
    },
    async getUser(uid) {
      return { uid, disabled: false, emailVerified: true, providerData: [], metadata: {}, customClaims: undefined, ...user(uid) };
    },
    async getUserByEmail(email) {
      for (const [uid, u] of state.users) if (u.email === email) return { uid, ...u };
      throw notFound();
    },
    async setCustomUserClaims(uid, claims) {
      user(uid).customClaims = claims;
    },
    async updateUser(uid, patch) {
      Object.assign(user(uid), patch);
    },
    async revokeRefreshTokens(uid) {
      user(uid);
      state.revoked.add(uid);
    },
    async deleteUser(uid) {
      user(uid);
      state.users.delete(uid);
    },
  };
}

/** Installs the fake as `firebase-admin` (+ `/firestore`) and returns its state for assertions. */
function installFakeAdmin() {
  const state = { docs: new Map(), users: new Map(), tokens: new Map(), revoked: new Set(), deletedPrefixes: [], seq: 0, now: Date.now() };
  const firestore = createFirestore(state);
  const auth = createAuth(state);
  const apps = [];
  const adminExports = {
    apps,
    initializeApp: () => apps.push({}),
    credential: { cert: () => ({}) },
    firestore: () => firestore,
    auth: () => auth,
    storage: () => ({ bucket: () => ({ deleteFiles: async ({ prefix }) => void state.deletedPrefixes.push(prefix) }) }),
  };
  const put = (id, exports) => {
    const file = require.resolve(id, { paths: [__dirname] });
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
  };
  put("firebase-admin", adminExports);
  put("firebase-admin/firestore", { FieldValue, Timestamp, AggregateField });
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY ??= JSON.stringify({ project_id: "fake-test" });

  /** Signs a user in: returns the bearer token the handlers accept. */
  state.signIn = (uid, decoded = {}) => {
    const token = `tok-${uid}`;
    state.tokens.set(token, { uid, email_verified: true, firebase: { sign_in_provider: "google.com" }, ...decoded });
    if (!state.users.has(uid)) state.users.set(uid, { email: `${uid}@example.test`, disabled: false });
    return token;
  };
  state.put = (p, data) => state.docs.set(p, data);
  state.get = (p) => state.docs.get(p);
  return state;
}

/** Calls a Vercel-style handler and resolves with { status, body }. */
function call(handler, { method = "GET", token, query = {}, body } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headersSent: false,
      setHeader() {},
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(b) {
        this.headersSent = true;
        resolve({ status: this.statusCode, body: b });
      },
      end() {
        this.headersSent = true;
        resolve({ status: this.statusCode, body: null });
      },
    };
    handler({ method, url: "/api/test", query, body: body ?? {}, headers: token ? { authorization: `Bearer ${token}` } : {} }, res);
  });
}

module.exports = { installFakeAdmin, call, Timestamp };
