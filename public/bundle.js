"use strict";
(() => {
  // sphere-sdk/dist/impl/browser/connect/index.js
  var LOGGER_KEY = "__sphere_sdk_logger__";
  function getState() {
    const g = globalThis;
    if (!g[LOGGER_KEY]) {
      g[LOGGER_KEY] = { debug: false, tags: {}, handler: null };
    }
    return g[LOGGER_KEY];
  }
  function isEnabled(tag) {
    const state = getState();
    if (tag in state.tags) return state.tags[tag];
    return state.debug;
  }
  var logger = {
    /**
     * Configure the logger. Can be called multiple times (last write wins).
     * Typically called by createBrowserProviders(), createNodeProviders(), or Sphere.init().
     */
    configure(config) {
      const state = getState();
      if (config.debug !== void 0) state.debug = config.debug;
      if (config.handler !== void 0) state.handler = config.handler;
    },
    /**
     * Enable/disable debug logging for a specific tag.
     * Per-tag setting overrides the global debug flag.
     *
     * @example
     * ```ts
     * logger.setTagDebug('Nostr', true);  // enable only Nostr logs
     * logger.setTagDebug('Nostr', false); // disable Nostr logs even if global debug=true
     * ```
     */
    setTagDebug(tag, enabled) {
      getState().tags[tag] = enabled;
    },
    /**
     * Clear per-tag override, falling back to global debug flag.
     */
    clearTagDebug(tag) {
      delete getState().tags[tag];
    },
    /** Returns true if debug mode is enabled for the given tag (or globally). */
    isDebugEnabled(tag) {
      if (tag) return isEnabled(tag);
      return getState().debug;
    },
    /**
     * Debug-level log. Only shown when debug is enabled (globally or for this tag).
     * Use for detailed operational information.
     */
    debug(tag, message, ...args) {
      if (!isEnabled(tag)) return;
      const state = getState();
      if (state.handler) {
        state.handler("debug", tag, message, ...args);
      } else {
        console.log(`[${tag}]`, message, ...args);
      }
    },
    /**
     * Warning-level log. ALWAYS shown regardless of debug flag.
     * Use for important but non-critical issues (timeouts, retries, degraded state).
     */
    warn(tag, message, ...args) {
      const state = getState();
      if (state.handler) {
        state.handler("warn", tag, message, ...args);
      } else {
        console.warn(`[${tag}]`, message, ...args);
      }
    },
    /**
     * Error-level log. ALWAYS shown regardless of debug flag.
     * Use for critical failures that should never be silenced.
     */
    error(tag, message, ...args) {
      const state = getState();
      if (state.handler) {
        state.handler("error", tag, message, ...args);
      } else {
        console.error(`[${tag}]`, message, ...args);
      }
    },
    /** Reset all logger state (debug flag, tags, handler). Primarily for tests. */
    reset() {
      const g = globalThis;
      delete g[LOGGER_KEY];
    }
  };
  var SphereError = class extends Error {
    code;
    cause;
    constructor(message, code, cause) {
      super(message);
      this.name = "SphereError";
      this.code = code;
      this.cause = cause;
    }
  };
  function majorOf(v) {
    return parseInt(String(v).split(".")[0], 10);
  }
  var STORAGE_KEYS_GLOBAL = {
    /** Encrypted BIP39 mnemonic */
    MNEMONIC: "mnemonic",
    /** Encrypted master private key */
    MASTER_KEY: "master_key",
    /** BIP32 chain code */
    CHAIN_CODE: "chain_code",
    /** HD derivation path (full path like m/44'/0'/0'/0/0) */
    DERIVATION_PATH: "derivation_path",
    /** Base derivation path (like m/44'/0'/0' without chain/index) */
    BASE_PATH: "base_path",
    /** Derivation mode: bip32, wif_hmac, legacy_hmac */
    DERIVATION_MODE: "derivation_mode",
    /** Wallet source: mnemonic, file, unknown */
    WALLET_SOURCE: "wallet_source",
    /** Wallet existence flag */
    WALLET_EXISTS: "wallet_exists",
    /** Current active address index */
    CURRENT_ADDRESS_INDEX: "current_address_index",
    /** Nametag cache per address (separate from tracked addresses registry) */
    ADDRESS_NAMETAGS: "address_nametags",
    /** Active addresses registry (JSON: TrackedAddressesStorage) */
    TRACKED_ADDRESSES: "tracked_addresses",
    /** Last processed Nostr wallet event timestamp (unix seconds), keyed per pubkey */
    LAST_WALLET_EVENT_TS: "last_wallet_event_ts",
    /** Last processed Nostr DM (gift-wrap) event timestamp (unix seconds), keyed per pubkey */
    LAST_DM_EVENT_TS: "last_dm_event_ts",
    /** Group chat: last used relay URL (stale data detection) — global, same relay for all addresses */
    GROUP_CHAT_RELAY_URL: "group_chat_relay_url",
    /** Cached token registry JSON (fetched from remote) */
    TOKEN_REGISTRY_CACHE: "token_registry_cache",
    /** Timestamp of last token registry cache update (ms since epoch) */
    TOKEN_REGISTRY_CACHE_TS: "token_registry_cache_ts",
    /** Cached price data JSON (from CoinGecko or other provider) */
    PRICE_CACHE: "price_cache",
    /** Timestamp of last price cache update (ms since epoch) */
    PRICE_CACHE_TS: "price_cache_ts"
  };
  var STORAGE_KEYS_ADDRESS = {
    /** Pending transfers for this address */
    PENDING_TRANSFERS: "pending_transfers",
    /** Transfer outbox for this address */
    OUTBOX: "outbox",
    /** Conversations for this address */
    CONVERSATIONS: "conversations",
    /** Messages for this address */
    MESSAGES: "messages",
    /** Transaction history for this address */
    TRANSACTION_HISTORY: "transaction_history",
    /** Pending V5 finalization tokens (unconfirmed instant split tokens) */
    PENDING_V5_TOKENS: "pending_v5_tokens",
    /**
     * FINISHED v2 token blobs awaiting transport delivery. Written the moment a
     * transfer/split output is certified on-chain (the source is already spent),
     * removed after successful delivery — survives transport failures + crashes
     * so the recipient's token is never lost with the process.
     */
    PENDING_V2_DELIVERIES: "pending_v2_deliveries",
    /** Group chat: joined groups for this address */
    GROUP_CHAT_GROUPS: "group_chat_groups",
    /** Group chat: messages for this address */
    GROUP_CHAT_MESSAGES: "group_chat_messages",
    /** Group chat: members for this address */
    GROUP_CHAT_MEMBERS: "group_chat_members",
    /** Group chat: processed event IDs for deduplication */
    GROUP_CHAT_PROCESSED_EVENTS: "group_chat_processed_events",
    /** Processed V5 split group IDs for Nostr re-delivery dedup */
    PROCESSED_SPLIT_GROUP_IDS: "processed_split_group_ids",
    /** Processed V6 combined transfer IDs for Nostr re-delivery dedup */
    PROCESSED_COMBINED_TRANSFER_IDS: "processed_combined_transfer_ids",
    // Invoice / Accounting storage keys
    /** Set of cancelled invoice IDs (JSON string array) */
    CANCELLED_INVOICES: "cancelled_invoices",
    /** Set of closed invoice IDs (JSON string array) */
    CLOSED_INVOICES: "closed_invoices",
    /** Frozen balances for terminated invoices (JSON map: invoiceId → FrozenInvoiceBalances) */
    FROZEN_BALANCES: "frozen_balances",
    /** Auto-return settings (JSON: AutoReturnSettings) */
    AUTO_RETURN: "auto_return",
    /** Auto-return dedup ledger (JSON: AutoReturnLedger) */
    AUTO_RETURN_LEDGER: "auto_return_ledger",
    /** Invoice-transfer index metadata (JSON: Record<invoiceId, { terminated, frozenAt? }>) */
    INV_LEDGER_INDEX: "inv_ledger_index",
    /** Token scan state watermarks (JSON: Record<tokenId, txCount>) */
    TOKEN_SCAN_STATE: "token_scan_state",
    // Swap storage keys
    /** Per-swap key: swap:{swapId} */
    SWAP_RECORD_PREFIX: "swap:",
    /** Lightweight index array for listing */
    SWAP_INDEX: "swap_index"
  };
  var NETWORK_SCOPED_ADDRESS_KEYS = [
    STORAGE_KEYS_ADDRESS.PENDING_TRANSFERS,
    STORAGE_KEYS_ADDRESS.OUTBOX,
    STORAGE_KEYS_ADDRESS.TRANSACTION_HISTORY,
    STORAGE_KEYS_ADDRESS.PENDING_V5_TOKENS,
    STORAGE_KEYS_ADDRESS.PENDING_V2_DELIVERIES,
    STORAGE_KEYS_ADDRESS.PROCESSED_SPLIT_GROUP_IDS,
    STORAGE_KEYS_ADDRESS.PROCESSED_COMBINED_TRANSFER_IDS,
    STORAGE_KEYS_ADDRESS.CANCELLED_INVOICES,
    STORAGE_KEYS_ADDRESS.CLOSED_INVOICES,
    STORAGE_KEYS_ADDRESS.FROZEN_BALANCES,
    STORAGE_KEYS_ADDRESS.AUTO_RETURN,
    STORAGE_KEYS_ADDRESS.AUTO_RETURN_LEDGER,
    STORAGE_KEYS_ADDRESS.INV_LEDGER_INDEX,
    STORAGE_KEYS_ADDRESS.TOKEN_SCAN_STATE,
    STORAGE_KEYS_ADDRESS.SWAP_INDEX
  ];
  var NETWORK_SCOPED_ADDRESS_PREFIXES = [
    STORAGE_KEYS_ADDRESS.SWAP_RECORD_PREFIX,
    // 'swap:'
    "inv_ledger:"
    // AccountingModule INV_LEDGER_PREFIX
  ];
  var STORAGE_KEYS = {
    ...STORAGE_KEYS_GLOBAL,
    ...STORAGE_KEYS_ADDRESS
  };
  var DEFAULT_NOSTR_RELAYS = [
    "wss://relay.unicity.network",
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.nostr.band"
  ];
  var DEFAULT_AGGREGATOR_URL = "https://aggregator.unicity.network/rpc";
  var DEV_AGGREGATOR_URL = "https://dev-aggregator.dyndns.org/rpc";
  var DEFAULT_IPFS_GATEWAYS = [
    "https://unicity-ipfs1.dyndns.org"
  ];
  var DEFAULT_BASE_PATH = "m/44'/0'/0'";
  var DEFAULT_DERIVATION_PATH = `${DEFAULT_BASE_PATH}/0/0`;
  var TOKEN_REGISTRY_URL = "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet.json";
  var TEST_NOSTR_RELAYS = [
    "wss://nostr-relay.testnet.unicity.network"
  ];
  var DEFAULT_GROUP_RELAYS = [
    "wss://sphere-relay.unicity.network"
  ];
  var NETWORKS = {
    mainnet: {
      name: "Mainnet",
      aggregatorUrl: DEFAULT_AGGREGATOR_URL,
      nostrRelays: DEFAULT_NOSTR_RELAYS,
      ipfsGateways: DEFAULT_IPFS_GATEWAYS,
      groupRelays: DEFAULT_GROUP_RELAYS,
      tokenRegistryUrl: TOKEN_REGISTRY_URL
    },
    // v1 cutover: 'testnet' now POINTS AT TESTNET2 (the v2 gateway network). The
    // old goggregator testnet spoke the removed v1 protocol — a v2 engine cannot
    // run against it. 'testnet2' stays as an alias of the same configuration.
    testnet: {
      name: "Testnet2",
      networkId: 4,
      // v2 state-transition gateway (networkId 4 comes from the trust base). apiKey is env-injected.
      aggregatorUrl: "https://gateway.testnet2.unicity.network",
      nostrRelays: TEST_NOSTR_RELAYS,
      // reuse testnet infra (shared relays/ipfs)
      ipfsGateways: DEFAULT_IPFS_GATEWAYS,
      groupRelays: DEFAULT_GROUP_RELAYS,
      tokenRegistryUrl: "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet2.json"
    },
    testnet2: {
      name: "Testnet2",
      networkId: 4,
      // v2 state-transition gateway (networkId 4 comes from the trust base). apiKey is env-injected.
      aggregatorUrl: "https://gateway.testnet2.unicity.network",
      nostrRelays: TEST_NOSTR_RELAYS,
      // reuse testnet infra (shared relays/ipfs)
      ipfsGateways: DEFAULT_IPFS_GATEWAYS,
      groupRelays: DEFAULT_GROUP_RELAYS,
      tokenRegistryUrl: "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet2.json"
    },
    // NOTE: mainnet/dev still point at v1-era aggregators. The v2 engine cannot
    // operate against them until their gateways are cut over to the v2 protocol —
    // wallet operations on these networks fail loudly (AGGREGATOR_ERROR) until then.
    dev: {
      name: "Development",
      aggregatorUrl: DEV_AGGREGATOR_URL,
      nostrRelays: TEST_NOSTR_RELAYS,
      ipfsGateways: DEFAULT_IPFS_GATEWAYS,
      groupRelays: DEFAULT_GROUP_RELAYS,
      tokenRegistryUrl: TOKEN_REGISTRY_URL
    }
  };
  var SPHERE_NETWORKS = {
    testnet2: { id: NETWORKS.testnet2.networkId, name: "testnet2" }
  };
  var HOST_READY_TYPE = "sphere-connect:host-ready";
  var HOST_READY_TIMEOUT = 3e4;
  var SPHERE_CONNECT_NAMESPACE = "sphere-connect";
  var SPHERE_CONNECT_VERSION = "2.0";
  var RPC_METHODS = {
    GET_IDENTITY: "sphere_getIdentity",
    GET_BALANCE: "sphere_getBalance",
    GET_ASSETS: "sphere_getAssets",
    GET_FIAT_BALANCE: "sphere_getFiatBalance",
    GET_TOKENS: "sphere_getTokens",
    GET_HISTORY: "sphere_getHistory",
    RESOLVE: "sphere_resolve",
    SUBSCRIBE: "sphere_subscribe",
    UNSUBSCRIBE: "sphere_unsubscribe",
    DISCONNECT: "sphere_disconnect",
    GET_CONVERSATIONS: "sphere_getConversations",
    GET_MESSAGES: "sphere_getMessages",
    GET_DM_UNREAD_COUNT: "sphere_getDMUnreadCount",
    MARK_AS_READ: "sphere_markAsRead",
    GET_INVOICES: "sphere_getInvoices",
    GET_INVOICE_STATUS: "sphere_getInvoiceStatus"
  };
  var INTENT_ACTIONS = {
    SEND: "send",
    DM: "dm",
    PAYMENT_REQUEST: "payment_request",
    RECEIVE: "receive",
    SIGN_MESSAGE: "sign_message",
    CREATE_INVOICE: "create_invoice",
    CLOSE_INVOICE: "close_invoice",
    CANCEL_INVOICE: "cancel_invoice",
    PAY_INVOICE: "pay_invoice",
    RETURN_INVOICE_PAYMENT: "return_invoice_payment",
    IMPORT_INVOICE: "import_invoice",
    SEND_INVOICE_RECEIPTS: "send_invoice_receipts",
    SEND_CANCELLATION_NOTICES: "send_cancellation_notices",
    SET_AUTO_RETURN: "set_auto_return",
    MINT: "mint"
  };
  function isSphereConnectMessage(msg) {
    if (!msg || typeof msg !== "object") return false;
    const m = msg;
    if (m.ns !== SPHERE_CONNECT_NAMESPACE) return false;
    if (m.type === "handshake") return true;
    if (typeof m.v !== "string") return false;
    return majorOf(m.v) === majorOf(SPHERE_CONNECT_VERSION);
  }
  function createRequestId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  var SDK_VERSION = "0.10.1";
  var PERMISSION_SCOPES = {
    IDENTITY_READ: "identity:read",
    BALANCE_READ: "balance:read",
    TOKENS_READ: "tokens:read",
    HISTORY_READ: "history:read",
    EVENTS_SUBSCRIBE: "events:subscribe",
    RESOLVE_PEER: "resolve:peer",
    TRANSFER_REQUEST: "transfer:request",
    DM_REQUEST: "dm:request",
    DM_READ: "dm:read",
    DM_MANAGE: "dm:manage",
    PAYMENT_REQUEST: "payment:request",
    SIGN_REQUEST: "sign:request",
    MINT_REQUEST: "mint:request",
    INVOICE_READ: "invoice:read",
    INVOICE_WRITE: "invoice:write"
  };
  var ALL_PERMISSIONS = Object.values(PERMISSION_SCOPES);
  var DEFAULT_PERMISSIONS = [
    PERMISSION_SCOPES.IDENTITY_READ
  ];
  var METHOD_PERMISSIONS = {
    [RPC_METHODS.GET_IDENTITY]: PERMISSION_SCOPES.IDENTITY_READ,
    [RPC_METHODS.GET_BALANCE]: PERMISSION_SCOPES.BALANCE_READ,
    [RPC_METHODS.GET_ASSETS]: PERMISSION_SCOPES.BALANCE_READ,
    [RPC_METHODS.GET_FIAT_BALANCE]: PERMISSION_SCOPES.BALANCE_READ,
    [RPC_METHODS.GET_TOKENS]: PERMISSION_SCOPES.TOKENS_READ,
    [RPC_METHODS.GET_HISTORY]: PERMISSION_SCOPES.HISTORY_READ,
    [RPC_METHODS.RESOLVE]: PERMISSION_SCOPES.RESOLVE_PEER,
    [RPC_METHODS.SUBSCRIBE]: PERMISSION_SCOPES.EVENTS_SUBSCRIBE,
    [RPC_METHODS.UNSUBSCRIBE]: PERMISSION_SCOPES.EVENTS_SUBSCRIBE,
    [RPC_METHODS.GET_CONVERSATIONS]: PERMISSION_SCOPES.DM_READ,
    [RPC_METHODS.GET_MESSAGES]: PERMISSION_SCOPES.DM_READ,
    [RPC_METHODS.GET_DM_UNREAD_COUNT]: PERMISSION_SCOPES.DM_READ,
    [RPC_METHODS.MARK_AS_READ]: PERMISSION_SCOPES.DM_MANAGE,
    [RPC_METHODS.GET_INVOICES]: PERMISSION_SCOPES.INVOICE_READ,
    [RPC_METHODS.GET_INVOICE_STATUS]: PERMISSION_SCOPES.INVOICE_READ
  };
  var INTENT_PERMISSIONS = {
    [INTENT_ACTIONS.SEND]: PERMISSION_SCOPES.TRANSFER_REQUEST,
    [INTENT_ACTIONS.DM]: PERMISSION_SCOPES.DM_REQUEST,
    [INTENT_ACTIONS.PAYMENT_REQUEST]: PERMISSION_SCOPES.PAYMENT_REQUEST,
    [INTENT_ACTIONS.RECEIVE]: PERMISSION_SCOPES.IDENTITY_READ,
    [INTENT_ACTIONS.SIGN_MESSAGE]: PERMISSION_SCOPES.SIGN_REQUEST,
    [INTENT_ACTIONS.CREATE_INVOICE]: PERMISSION_SCOPES.INVOICE_WRITE,
    [INTENT_ACTIONS.CLOSE_INVOICE]: PERMISSION_SCOPES.INVOICE_WRITE,
    [INTENT_ACTIONS.CANCEL_INVOICE]: PERMISSION_SCOPES.INVOICE_WRITE,
    [INTENT_ACTIONS.PAY_INVOICE]: PERMISSION_SCOPES.TRANSFER_REQUEST,
    [INTENT_ACTIONS.RETURN_INVOICE_PAYMENT]: PERMISSION_SCOPES.TRANSFER_REQUEST,
    [INTENT_ACTIONS.IMPORT_INVOICE]: PERMISSION_SCOPES.INVOICE_WRITE,
    [INTENT_ACTIONS.SEND_INVOICE_RECEIPTS]: PERMISSION_SCOPES.INVOICE_WRITE,
    [INTENT_ACTIONS.SEND_CANCELLATION_NOTICES]: PERMISSION_SCOPES.INVOICE_WRITE,
    [INTENT_ACTIONS.SET_AUTO_RETURN]: PERMISSION_SCOPES.INVOICE_WRITE,
    [INTENT_ACTIONS.MINT]: PERMISSION_SCOPES.MINT_REQUEST
  };
  var ConnectError = class extends Error {
    constructor(message, code, data) {
      super(message);
      this.code = code;
      this.data = data;
      this.name = "ConnectError";
    }
  };
  var DEFAULT_TIMEOUT = 3e4;
  var DEFAULT_INTENT_TIMEOUT = 12e4;
  var ConnectClient = class {
    transport;
    dapp;
    requestedPermissions;
    timeout;
    intentTimeout;
    resumeSessionId;
    silent;
    network;
    sessionId = null;
    grantedPermissions = [];
    identity = null;
    walletNet = null;
    connected = false;
    pendingRequests = /* @__PURE__ */ new Map();
    eventHandlers = /* @__PURE__ */ new Map();
    unsubscribeTransport = null;
    // Handshake resolver (one-shot)
    handshakeResolver = null;
    constructor(config) {
      this.transport = config.transport;
      this.dapp = config.dapp;
      this.requestedPermissions = config.permissions ?? [...ALL_PERMISSIONS];
      this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
      this.intentTimeout = config.intentTimeout ?? DEFAULT_INTENT_TIMEOUT;
      this.resumeSessionId = config.resumeSessionId ?? null;
      this.silent = config.silent ?? false;
      this.network = config.network;
    }
    // ===========================================================================
    // Connection
    // ===========================================================================
    /** Connect to the wallet. Returns session info and public identity. */
    async connect() {
      this.unsubscribeTransport = this.transport.onMessage(this.handleMessage.bind(this));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.handshakeResolver = null;
          reject(new Error("Connection timeout"));
        }, this.timeout);
        this.handshakeResolver = { resolve, reject, timer };
        this.transport.send({
          ns: SPHERE_CONNECT_NAMESPACE,
          v: SPHERE_CONNECT_VERSION,
          type: "handshake",
          direction: "request",
          permissions: this.requestedPermissions,
          dapp: this.dapp,
          sdkVersion: SDK_VERSION,
          ...this.network ? { network: this.network } : {},
          ...this.resumeSessionId ? { sessionId: this.resumeSessionId } : {},
          ...this.silent ? { silent: true } : {}
        });
      });
    }
    /** Disconnect from the wallet */
    async disconnect() {
      if (this.connected) {
        try {
          await this.query(RPC_METHODS.DISCONNECT);
        } catch {
        }
      }
      this.cleanup();
    }
    /** Whether currently connected */
    get isConnected() {
      return this.connected;
    }
    /** Granted permission scopes */
    get permissions() {
      return this.grantedPermissions;
    }
    /** Current session ID */
    get session() {
      return this.sessionId;
    }
    /** Public identity received during handshake */
    get walletIdentity() {
      return this.identity;
    }
    /** Wallet's active network, received during handshake. */
    get walletNetwork() {
      return this.walletNet;
    }
    // ===========================================================================
    // Query (read data)
    // ===========================================================================
    /** Send a query request and return the result */
    async query(method, params) {
      if (!this.connected) throw new SphereError("Not connected", "NOT_INITIALIZED");
      const id = createRequestId();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error(`Query timeout: ${method}`));
        }, this.timeout);
        this.pendingRequests.set(id, {
          resolve,
          reject,
          timer
        });
        this.transport.send({
          ns: SPHERE_CONNECT_NAMESPACE,
          v: SPHERE_CONNECT_VERSION,
          type: "request",
          id,
          method,
          params
        });
      });
    }
    // ===========================================================================
    // Intent (trigger wallet UI)
    // ===========================================================================
    /** Send an intent request. The wallet will open its UI for user confirmation. */
    async intent(action, params) {
      if (!this.connected) throw new SphereError("Not connected", "NOT_INITIALIZED");
      const id = createRequestId();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error(`Intent timeout: ${action}`));
        }, this.intentTimeout);
        this.pendingRequests.set(id, {
          resolve,
          reject,
          timer
        });
        this.transport.send({
          ns: SPHERE_CONNECT_NAMESPACE,
          v: SPHERE_CONNECT_VERSION,
          type: "intent",
          id,
          action,
          params
        });
      });
    }
    // ===========================================================================
    // Events
    // ===========================================================================
    /** Subscribe to a wallet event. Returns unsubscribe function. */
    on(event, handler) {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, /* @__PURE__ */ new Set());
        if (this.connected) {
          this.query(RPC_METHODS.SUBSCRIBE, { event }).catch((err) => logger.debug("Connect", "Event subscription failed", err));
        }
      }
      this.eventHandlers.get(event).add(handler);
      return () => {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            this.eventHandlers.delete(event);
            if (this.connected) {
              this.query(RPC_METHODS.UNSUBSCRIBE, { event }).catch((err) => logger.debug("Connect", "Event unsubscription failed", err));
            }
          }
        }
      };
    }
    // ===========================================================================
    // Message Handling
    // ===========================================================================
    handleMessage(msg) {
      if (msg.type === "handshake" && msg.direction === "response") {
        this.handleHandshakeResponse(msg);
        return;
      }
      if (msg.type === "response") {
        this.handlePendingResponse(msg.id, msg.result, msg.error);
        return;
      }
      if (msg.type === "intent_result") {
        this.handlePendingResponse(msg.id, msg.result, msg.error);
        return;
      }
      if (msg.type === "event") {
        const handlers = this.eventHandlers.get(msg.event);
        if (handlers) {
          for (const handler of handlers) {
            try {
              handler(msg.data);
            } catch (err) {
              logger.debug("Connect", "Event handler error", err);
            }
          }
        }
      }
    }
    handleHandshakeResponse(msg) {
      if (!this.handshakeResolver) return;
      clearTimeout(this.handshakeResolver.timer);
      const m = msg;
      if (m.error) {
        this.handshakeResolver.reject(new ConnectError(m.error.message, m.error.code, m.error.data));
        this.handshakeResolver = null;
        return;
      }
      if (msg.sessionId && msg.identity) {
        this.sessionId = msg.sessionId;
        this.grantedPermissions = msg.permissions;
        this.identity = msg.identity;
        this.walletNet = m.network ?? null;
        this.connected = true;
        if (m.warning) logger.warn("Connect", "Wallet deprecation notice", m.warning.message);
        this.handshakeResolver.resolve({
          sessionId: msg.sessionId,
          permissions: this.grantedPermissions,
          identity: msg.identity
        });
      } else {
        this.handshakeResolver.reject(new Error("Connection rejected by wallet"));
      }
      this.handshakeResolver = null;
    }
    handlePendingResponse(id, result, error) {
      const pending = this.pendingRequests.get(id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(id);
      if (error) {
        pending.reject(new ConnectError(error.message, error.code, error.data));
      } else {
        pending.resolve(result);
      }
    }
    // ===========================================================================
    // Cleanup
    // ===========================================================================
    cleanup() {
      if (this.unsubscribeTransport) {
        this.unsubscribeTransport();
        this.unsubscribeTransport = null;
      }
      for (const [, pending] of this.pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Disconnected"));
      }
      this.pendingRequests.clear();
      this.eventHandlers.clear();
      this.connected = false;
      this.sessionId = null;
      this.grantedPermissions = [];
      this.identity = null;
      this.walletNet = null;
    }
  };
  var POPUP_CLOSE_CHECK_INTERVAL = 1e3;
  var PostMessageTransport = class _PostMessageTransport {
    targetWindow;
    targetOrigin;
    allowedOrigins;
    handlers = /* @__PURE__ */ new Set();
    listener = null;
    popupCheckInterval = null;
    onPopupClosed = null;
    constructor(targetWindow, targetOrigin, allowedOrigins) {
      this.targetWindow = targetWindow;
      this.targetOrigin = targetOrigin;
      this.allowedOrigins = allowedOrigins ? new Set(allowedOrigins) : null;
      this.listener = (event) => {
        if (this.allowedOrigins && !this.allowedOrigins.has("*") && !this.allowedOrigins.has(event.origin)) {
          return;
        }
        if (!isSphereConnectMessage(event.data)) {
          return;
        }
        for (const handler of this.handlers) {
          try {
            handler(event.data);
          } catch {
          }
        }
      };
      window.addEventListener("message", this.listener);
    }
    // ===========================================================================
    // Factory Methods
    // ===========================================================================
    /**
     * Create transport for the HOST side (wallet).
     *
     * iframe mode: target = iframe.contentWindow
     * popup mode:  target = window.opener
     */
    static forHost(target, options) {
      const targetWindow = target instanceof HTMLIFrameElement ? target.contentWindow : target;
      const targetOrigin = options.allowedOrigins[0] === "*" ? "*" : options.allowedOrigins[0];
      return new _PostMessageTransport(targetWindow, targetOrigin, options.allowedOrigins);
    }
    /**
     * Create transport for the CLIENT side (dApp).
     *
     * iframe mode: target defaults to window.parent
     * popup mode:  target = popup window (from window.open())
     */
    static forClient(options) {
      const target = options?.target ?? window.parent;
      const targetOrigin = options?.targetOrigin ?? "*";
      const transport = new _PostMessageTransport(target, targetOrigin, null);
      if (options?.target && options.target !== window.parent) {
        transport.startPopupCloseDetection(options.target);
      }
      return transport;
    }
    // ===========================================================================
    // ConnectTransport Interface
    // ===========================================================================
    send(message) {
      try {
        this.targetWindow.postMessage(message, this.targetOrigin);
      } catch {
      }
    }
    onMessage(handler) {
      this.handlers.add(handler);
      return () => {
        this.handlers.delete(handler);
      };
    }
    destroy() {
      if (this.listener) {
        window.removeEventListener("message", this.listener);
        this.listener = null;
      }
      if (this.popupCheckInterval) {
        clearInterval(this.popupCheckInterval);
        this.popupCheckInterval = null;
      }
      this.handlers.clear();
    }
    // ===========================================================================
    // Popup Close Detection
    // ===========================================================================
    /** Register a callback for when the popup window closes */
    onClose(callback) {
      this.onPopupClosed = callback;
    }
    startPopupCloseDetection(popup) {
      this.popupCheckInterval = setInterval(() => {
        if (popup.closed) {
          if (this.popupCheckInterval) {
            clearInterval(this.popupCheckInterval);
            this.popupCheckInterval = null;
          }
          if (this.onPopupClosed) {
            this.onPopupClosed();
          }
        }
      }, POPUP_CLOSE_CHECK_INTERVAL);
    }
  };
  var EXT_MSG_TO_HOST = "sphere-connect-ext:tohost";
  var EXT_MSG_TO_CLIENT = "sphere-connect-ext:toclient";
  function isExtensionConnectEnvelope(data) {
    return typeof data === "object" && data !== null && "type" in data && (data.type === EXT_MSG_TO_HOST || data.type === EXT_MSG_TO_CLIENT) && "payload" in data && isSphereConnectMessage(data.payload);
  }
  var ExtensionClientTransport = class {
    handlers = /* @__PURE__ */ new Set();
    listener = null;
    constructor() {
      this.listener = (event) => {
        if (!isExtensionConnectEnvelope(event.data)) return;
        if (event.data.type !== EXT_MSG_TO_CLIENT) return;
        for (const handler of this.handlers) {
          try {
            handler(event.data.payload);
          } catch {
          }
        }
      };
      window.addEventListener("message", this.listener);
    }
    send(message) {
      const envelope = {
        type: EXT_MSG_TO_HOST,
        payload: message
      };
      window.postMessage(envelope, "*");
    }
    onMessage(handler) {
      this.handlers.add(handler);
      return () => {
        this.handlers.delete(handler);
      };
    }
    destroy() {
      if (this.listener) {
        window.removeEventListener("message", this.listener);
        this.listener = null;
      }
      this.handlers.clear();
    }
  };
  var ExtensionHostTransport = class {
    handlers = /* @__PURE__ */ new Set();
    // tabId of the currently connected dApp tab (used to send responses back)
    activeTabId = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chromeListener = null;
    chromeApi;
    constructor(chromeApi) {
      this.chromeApi = chromeApi;
      this.chromeListener = (message, sender) => {
        if (!isExtensionConnectEnvelope(message)) return;
        if (message.type !== EXT_MSG_TO_HOST) return;
        if (sender.tab?.id !== void 0) {
          this.activeTabId = sender.tab.id;
        }
        const payload = message.payload;
        for (const handler of this.handlers) {
          try {
            handler(payload);
          } catch {
          }
        }
      };
      this.chromeApi.onMessage.addListener(this.chromeListener);
    }
    send(message) {
      if (this.activeTabId === null) return;
      const envelope = {
        type: EXT_MSG_TO_CLIENT,
        payload: message
      };
      try {
        this.chromeApi.tabs.sendMessage(this.activeTabId, envelope);
      } catch {
      }
    }
    onMessage(handler) {
      this.handlers.add(handler);
      return () => {
        this.handlers.delete(handler);
      };
    }
    destroy() {
      if (this.chromeListener) {
        this.chromeApi.onMessage.removeListener(this.chromeListener);
        this.chromeListener = null;
      }
      this.handlers.clear();
      this.activeTabId = null;
    }
  };
  var ExtensionTransport = {
    /**
     * Create transport for the CLIENT side (dApp page / inject script).
     * Sends via window.postMessage; receives via window.postMessage from content script.
     */
    forClient() {
      return new ExtensionClientTransport();
    },
    /**
     * Create transport for the HOST side (extension background service worker).
     * Receives via chrome.runtime.onMessage; sends via chrome.tabs.sendMessage.
     *
     * @param chromeApi - Pass `chrome` from the extension background context,
     *   or a mock for unit tests.
     */
    forHost(chromeApi) {
      return new ExtensionHostTransport(chromeApi);
    }
  };
  function isInIframe() {
    try {
      return window.parent !== window && window.self !== window.top;
    } catch {
      return true;
    }
  }
  function hasExtension() {
    try {
      const sphere = window.sphere;
      if (!sphere || typeof sphere !== "object") return false;
      const isInstalled = sphere.isInstalled;
      if (typeof isInstalled !== "function") return false;
      return isInstalled() === true;
    } catch {
      return false;
    }
  }
  function detectTransport() {
    if (isInIframe()) return "iframe";
    if (hasExtension()) return "extension";
    return "popup";
  }
  var DEFAULT_POPUP_FEATURES = "width=420,height=720,scrollbars=yes,resizable=yes";
  async function autoConnect(config) {
    const transportType = config.forceTransport ?? detectTransport();
    switch (transportType) {
      case "iframe":
        return connectViaIframe(config);
      case "extension":
        return connectViaExtension(config);
      case "popup":
        return connectViaPopup(config);
    }
  }
  async function connectViaIframe(config) {
    const transport = PostMessageTransport.forClient();
    const { client, connection, cleanup } = await createAndConnect(transport, config);
    return {
      client,
      connection,
      transport: "iframe",
      disconnect: async () => {
        await client.disconnect();
        cleanup();
      }
    };
  }
  async function connectViaExtension(config) {
    const transport = ExtensionTransport.forClient();
    const { client, connection, cleanup } = await createAndConnect(transport, config);
    return {
      client,
      connection,
      transport: "extension",
      disconnect: async () => {
        await client.disconnect();
        cleanup();
      }
    };
  }
  async function connectViaPopup(config) {
    if (!config.walletUrl) {
      throw new Error("autoConnect: walletUrl is required when no extension or iframe is available");
    }
    const origin = encodeURIComponent(window.location.origin);
    const popupUrl = `${config.walletUrl}/connect?origin=${origin}`;
    const features = config.popupFeatures ?? DEFAULT_POPUP_FEATURES;
    const popup = window.open(popupUrl, "sphere-wallet", features);
    if (!popup) {
      throw new Error("autoConnect: Failed to open wallet popup \u2014 check popup blocker settings");
    }
    await waitForHostReady(popup, config.walletUrl);
    const transport = PostMessageTransport.forClient({
      target: popup,
      targetOrigin: config.walletUrl
    });
    const { client, connection, cleanup } = await createAndConnect(transport, config);
    const closeCheckInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(closeCheckInterval);
        cleanup();
      }
    }, 1e3);
    return {
      client,
      connection,
      transport: "popup",
      disconnect: async () => {
        clearInterval(closeCheckInterval);
        await client.disconnect();
        cleanup();
        if (!popup.closed) popup.close();
      }
    };
  }
  function waitForHostReady(popup, walletOrigin) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener("message", listener);
        reject(new Error("autoConnect: Wallet popup did not respond in time"));
      }, HOST_READY_TIMEOUT);
      function listener(event) {
        if (event.data?.type === HOST_READY_TYPE) {
          clearTimeout(timer);
          window.removeEventListener("message", listener);
          resolve();
        }
      }
      window.addEventListener("message", listener);
      const closeCheck = setInterval(() => {
        if (popup.closed) {
          clearInterval(closeCheck);
          clearTimeout(timer);
          window.removeEventListener("message", listener);
          reject(new Error("autoConnect: Wallet popup was closed before connecting"));
        }
      }, 500);
    });
  }
  async function createAndConnect(transport, config) {
    const clientConfig = {
      transport,
      dapp: config.dapp,
      permissions: config.permissions,
      timeout: config.timeout,
      intentTimeout: config.intentTimeout,
      resumeSessionId: config.resumeSessionId,
      silent: config.silent,
      network: config.network
    };
    const client = new ConnectClient(clientConfig);
    try {
      const connection = await client.connect();
      return {
        client,
        connection,
        cleanup: () => transport.destroy()
      };
    } catch (err) {
      transport.destroy();
      throw err;
    }
  }

  // sphere-sdk/dist/connect/index.js
  var STORAGE_KEYS_GLOBAL2 = {
    /** Encrypted BIP39 mnemonic */
    MNEMONIC: "mnemonic",
    /** Encrypted master private key */
    MASTER_KEY: "master_key",
    /** BIP32 chain code */
    CHAIN_CODE: "chain_code",
    /** HD derivation path (full path like m/44'/0'/0'/0/0) */
    DERIVATION_PATH: "derivation_path",
    /** Base derivation path (like m/44'/0'/0' without chain/index) */
    BASE_PATH: "base_path",
    /** Derivation mode: bip32, wif_hmac, legacy_hmac */
    DERIVATION_MODE: "derivation_mode",
    /** Wallet source: mnemonic, file, unknown */
    WALLET_SOURCE: "wallet_source",
    /** Wallet existence flag */
    WALLET_EXISTS: "wallet_exists",
    /** Current active address index */
    CURRENT_ADDRESS_INDEX: "current_address_index",
    /** Nametag cache per address (separate from tracked addresses registry) */
    ADDRESS_NAMETAGS: "address_nametags",
    /** Active addresses registry (JSON: TrackedAddressesStorage) */
    TRACKED_ADDRESSES: "tracked_addresses",
    /** Last processed Nostr wallet event timestamp (unix seconds), keyed per pubkey */
    LAST_WALLET_EVENT_TS: "last_wallet_event_ts",
    /** Last processed Nostr DM (gift-wrap) event timestamp (unix seconds), keyed per pubkey */
    LAST_DM_EVENT_TS: "last_dm_event_ts",
    /** Group chat: last used relay URL (stale data detection) — global, same relay for all addresses */
    GROUP_CHAT_RELAY_URL: "group_chat_relay_url",
    /** Cached token registry JSON (fetched from remote) */
    TOKEN_REGISTRY_CACHE: "token_registry_cache",
    /** Timestamp of last token registry cache update (ms since epoch) */
    TOKEN_REGISTRY_CACHE_TS: "token_registry_cache_ts",
    /** Cached price data JSON (from CoinGecko or other provider) */
    PRICE_CACHE: "price_cache",
    /** Timestamp of last price cache update (ms since epoch) */
    PRICE_CACHE_TS: "price_cache_ts"
  };
  var STORAGE_KEYS_ADDRESS2 = {
    /** Pending transfers for this address */
    PENDING_TRANSFERS: "pending_transfers",
    /** Transfer outbox for this address */
    OUTBOX: "outbox",
    /** Conversations for this address */
    CONVERSATIONS: "conversations",
    /** Messages for this address */
    MESSAGES: "messages",
    /** Transaction history for this address */
    TRANSACTION_HISTORY: "transaction_history",
    /** Pending V5 finalization tokens (unconfirmed instant split tokens) */
    PENDING_V5_TOKENS: "pending_v5_tokens",
    /**
     * FINISHED v2 token blobs awaiting transport delivery. Written the moment a
     * transfer/split output is certified on-chain (the source is already spent),
     * removed after successful delivery — survives transport failures + crashes
     * so the recipient's token is never lost with the process.
     */
    PENDING_V2_DELIVERIES: "pending_v2_deliveries",
    /** Group chat: joined groups for this address */
    GROUP_CHAT_GROUPS: "group_chat_groups",
    /** Group chat: messages for this address */
    GROUP_CHAT_MESSAGES: "group_chat_messages",
    /** Group chat: members for this address */
    GROUP_CHAT_MEMBERS: "group_chat_members",
    /** Group chat: processed event IDs for deduplication */
    GROUP_CHAT_PROCESSED_EVENTS: "group_chat_processed_events",
    /** Processed V5 split group IDs for Nostr re-delivery dedup */
    PROCESSED_SPLIT_GROUP_IDS: "processed_split_group_ids",
    /** Processed V6 combined transfer IDs for Nostr re-delivery dedup */
    PROCESSED_COMBINED_TRANSFER_IDS: "processed_combined_transfer_ids",
    // Invoice / Accounting storage keys
    /** Set of cancelled invoice IDs (JSON string array) */
    CANCELLED_INVOICES: "cancelled_invoices",
    /** Set of closed invoice IDs (JSON string array) */
    CLOSED_INVOICES: "closed_invoices",
    /** Frozen balances for terminated invoices (JSON map: invoiceId → FrozenInvoiceBalances) */
    FROZEN_BALANCES: "frozen_balances",
    /** Auto-return settings (JSON: AutoReturnSettings) */
    AUTO_RETURN: "auto_return",
    /** Auto-return dedup ledger (JSON: AutoReturnLedger) */
    AUTO_RETURN_LEDGER: "auto_return_ledger",
    /** Invoice-transfer index metadata (JSON: Record<invoiceId, { terminated, frozenAt? }>) */
    INV_LEDGER_INDEX: "inv_ledger_index",
    /** Token scan state watermarks (JSON: Record<tokenId, txCount>) */
    TOKEN_SCAN_STATE: "token_scan_state",
    // Swap storage keys
    /** Per-swap key: swap:{swapId} */
    SWAP_RECORD_PREFIX: "swap:",
    /** Lightweight index array for listing */
    SWAP_INDEX: "swap_index"
  };
  var NETWORK_SCOPED_ADDRESS_KEYS2 = [
    STORAGE_KEYS_ADDRESS2.PENDING_TRANSFERS,
    STORAGE_KEYS_ADDRESS2.OUTBOX,
    STORAGE_KEYS_ADDRESS2.TRANSACTION_HISTORY,
    STORAGE_KEYS_ADDRESS2.PENDING_V5_TOKENS,
    STORAGE_KEYS_ADDRESS2.PENDING_V2_DELIVERIES,
    STORAGE_KEYS_ADDRESS2.PROCESSED_SPLIT_GROUP_IDS,
    STORAGE_KEYS_ADDRESS2.PROCESSED_COMBINED_TRANSFER_IDS,
    STORAGE_KEYS_ADDRESS2.CANCELLED_INVOICES,
    STORAGE_KEYS_ADDRESS2.CLOSED_INVOICES,
    STORAGE_KEYS_ADDRESS2.FROZEN_BALANCES,
    STORAGE_KEYS_ADDRESS2.AUTO_RETURN,
    STORAGE_KEYS_ADDRESS2.AUTO_RETURN_LEDGER,
    STORAGE_KEYS_ADDRESS2.INV_LEDGER_INDEX,
    STORAGE_KEYS_ADDRESS2.TOKEN_SCAN_STATE,
    STORAGE_KEYS_ADDRESS2.SWAP_INDEX
  ];
  var NETWORK_SCOPED_ADDRESS_PREFIXES2 = [
    STORAGE_KEYS_ADDRESS2.SWAP_RECORD_PREFIX,
    // 'swap:'
    "inv_ledger:"
    // AccountingModule INV_LEDGER_PREFIX
  ];
  var STORAGE_KEYS2 = {
    ...STORAGE_KEYS_GLOBAL2,
    ...STORAGE_KEYS_ADDRESS2
  };
  var DEFAULT_NOSTR_RELAYS2 = [
    "wss://relay.unicity.network",
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.nostr.band"
  ];
  var DEFAULT_AGGREGATOR_URL2 = "https://aggregator.unicity.network/rpc";
  var DEV_AGGREGATOR_URL2 = "https://dev-aggregator.dyndns.org/rpc";
  var DEFAULT_IPFS_GATEWAYS2 = [
    "https://unicity-ipfs1.dyndns.org"
  ];
  var DEFAULT_BASE_PATH2 = "m/44'/0'/0'";
  var DEFAULT_DERIVATION_PATH2 = `${DEFAULT_BASE_PATH2}/0/0`;
  var TOKEN_REGISTRY_URL2 = "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet.json";
  var TEST_NOSTR_RELAYS2 = [
    "wss://nostr-relay.testnet.unicity.network"
  ];
  var DEFAULT_GROUP_RELAYS2 = [
    "wss://sphere-relay.unicity.network"
  ];
  var NETWORKS2 = {
    mainnet: {
      name: "Mainnet",
      aggregatorUrl: DEFAULT_AGGREGATOR_URL2,
      nostrRelays: DEFAULT_NOSTR_RELAYS2,
      ipfsGateways: DEFAULT_IPFS_GATEWAYS2,
      groupRelays: DEFAULT_GROUP_RELAYS2,
      tokenRegistryUrl: TOKEN_REGISTRY_URL2
    },
    // v1 cutover: 'testnet' now POINTS AT TESTNET2 (the v2 gateway network). The
    // old goggregator testnet spoke the removed v1 protocol — a v2 engine cannot
    // run against it. 'testnet2' stays as an alias of the same configuration.
    testnet: {
      name: "Testnet2",
      networkId: 4,
      // v2 state-transition gateway (networkId 4 comes from the trust base). apiKey is env-injected.
      aggregatorUrl: "https://gateway.testnet2.unicity.network",
      nostrRelays: TEST_NOSTR_RELAYS2,
      // reuse testnet infra (shared relays/ipfs)
      ipfsGateways: DEFAULT_IPFS_GATEWAYS2,
      groupRelays: DEFAULT_GROUP_RELAYS2,
      tokenRegistryUrl: "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet2.json"
    },
    testnet2: {
      name: "Testnet2",
      networkId: 4,
      // v2 state-transition gateway (networkId 4 comes from the trust base). apiKey is env-injected.
      aggregatorUrl: "https://gateway.testnet2.unicity.network",
      nostrRelays: TEST_NOSTR_RELAYS2,
      // reuse testnet infra (shared relays/ipfs)
      ipfsGateways: DEFAULT_IPFS_GATEWAYS2,
      groupRelays: DEFAULT_GROUP_RELAYS2,
      tokenRegistryUrl: "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet2.json"
    },
    // NOTE: mainnet/dev still point at v1-era aggregators. The v2 engine cannot
    // operate against them until their gateways are cut over to the v2 protocol —
    // wallet operations on these networks fail loudly (AGGREGATOR_ERROR) until then.
    dev: {
      name: "Development",
      aggregatorUrl: DEV_AGGREGATOR_URL2,
      nostrRelays: TEST_NOSTR_RELAYS2,
      ipfsGateways: DEFAULT_IPFS_GATEWAYS2,
      groupRelays: DEFAULT_GROUP_RELAYS2,
      tokenRegistryUrl: TOKEN_REGISTRY_URL2
    }
  };
  var SPHERE_NETWORKS2 = {
    testnet2: { id: NETWORKS2.testnet2.networkId, name: "testnet2" }
  };
  var RPC_METHODS2 = {
    GET_IDENTITY: "sphere_getIdentity",
    GET_BALANCE: "sphere_getBalance",
    GET_ASSETS: "sphere_getAssets",
    GET_FIAT_BALANCE: "sphere_getFiatBalance",
    GET_TOKENS: "sphere_getTokens",
    GET_HISTORY: "sphere_getHistory",
    RESOLVE: "sphere_resolve",
    SUBSCRIBE: "sphere_subscribe",
    UNSUBSCRIBE: "sphere_unsubscribe",
    DISCONNECT: "sphere_disconnect",
    GET_CONVERSATIONS: "sphere_getConversations",
    GET_MESSAGES: "sphere_getMessages",
    GET_DM_UNREAD_COUNT: "sphere_getDMUnreadCount",
    MARK_AS_READ: "sphere_markAsRead",
    GET_INVOICES: "sphere_getInvoices",
    GET_INVOICE_STATUS: "sphere_getInvoiceStatus"
  };
  var INTENT_ACTIONS2 = {
    SEND: "send",
    DM: "dm",
    PAYMENT_REQUEST: "payment_request",
    RECEIVE: "receive",
    SIGN_MESSAGE: "sign_message",
    CREATE_INVOICE: "create_invoice",
    CLOSE_INVOICE: "close_invoice",
    CANCEL_INVOICE: "cancel_invoice",
    PAY_INVOICE: "pay_invoice",
    RETURN_INVOICE_PAYMENT: "return_invoice_payment",
    IMPORT_INVOICE: "import_invoice",
    SEND_INVOICE_RECEIPTS: "send_invoice_receipts",
    SEND_CANCELLATION_NOTICES: "send_cancellation_notices",
    SET_AUTO_RETURN: "set_auto_return",
    MINT: "mint"
  };
  var PERMISSION_SCOPES2 = {
    IDENTITY_READ: "identity:read",
    BALANCE_READ: "balance:read",
    TOKENS_READ: "tokens:read",
    HISTORY_READ: "history:read",
    EVENTS_SUBSCRIBE: "events:subscribe",
    RESOLVE_PEER: "resolve:peer",
    TRANSFER_REQUEST: "transfer:request",
    DM_REQUEST: "dm:request",
    DM_READ: "dm:read",
    DM_MANAGE: "dm:manage",
    PAYMENT_REQUEST: "payment:request",
    SIGN_REQUEST: "sign:request",
    MINT_REQUEST: "mint:request",
    INVOICE_READ: "invoice:read",
    INVOICE_WRITE: "invoice:write"
  };
  var ALL_PERMISSIONS2 = Object.values(PERMISSION_SCOPES2);
  var DEFAULT_PERMISSIONS2 = [
    PERMISSION_SCOPES2.IDENTITY_READ
  ];
  var METHOD_PERMISSIONS2 = {
    [RPC_METHODS2.GET_IDENTITY]: PERMISSION_SCOPES2.IDENTITY_READ,
    [RPC_METHODS2.GET_BALANCE]: PERMISSION_SCOPES2.BALANCE_READ,
    [RPC_METHODS2.GET_ASSETS]: PERMISSION_SCOPES2.BALANCE_READ,
    [RPC_METHODS2.GET_FIAT_BALANCE]: PERMISSION_SCOPES2.BALANCE_READ,
    [RPC_METHODS2.GET_TOKENS]: PERMISSION_SCOPES2.TOKENS_READ,
    [RPC_METHODS2.GET_HISTORY]: PERMISSION_SCOPES2.HISTORY_READ,
    [RPC_METHODS2.RESOLVE]: PERMISSION_SCOPES2.RESOLVE_PEER,
    [RPC_METHODS2.SUBSCRIBE]: PERMISSION_SCOPES2.EVENTS_SUBSCRIBE,
    [RPC_METHODS2.UNSUBSCRIBE]: PERMISSION_SCOPES2.EVENTS_SUBSCRIBE,
    [RPC_METHODS2.GET_CONVERSATIONS]: PERMISSION_SCOPES2.DM_READ,
    [RPC_METHODS2.GET_MESSAGES]: PERMISSION_SCOPES2.DM_READ,
    [RPC_METHODS2.GET_DM_UNREAD_COUNT]: PERMISSION_SCOPES2.DM_READ,
    [RPC_METHODS2.MARK_AS_READ]: PERMISSION_SCOPES2.DM_MANAGE,
    [RPC_METHODS2.GET_INVOICES]: PERMISSION_SCOPES2.INVOICE_READ,
    [RPC_METHODS2.GET_INVOICE_STATUS]: PERMISSION_SCOPES2.INVOICE_READ
  };
  var INTENT_PERMISSIONS2 = {
    [INTENT_ACTIONS2.SEND]: PERMISSION_SCOPES2.TRANSFER_REQUEST,
    [INTENT_ACTIONS2.DM]: PERMISSION_SCOPES2.DM_REQUEST,
    [INTENT_ACTIONS2.PAYMENT_REQUEST]: PERMISSION_SCOPES2.PAYMENT_REQUEST,
    [INTENT_ACTIONS2.RECEIVE]: PERMISSION_SCOPES2.IDENTITY_READ,
    [INTENT_ACTIONS2.SIGN_MESSAGE]: PERMISSION_SCOPES2.SIGN_REQUEST,
    [INTENT_ACTIONS2.CREATE_INVOICE]: PERMISSION_SCOPES2.INVOICE_WRITE,
    [INTENT_ACTIONS2.CLOSE_INVOICE]: PERMISSION_SCOPES2.INVOICE_WRITE,
    [INTENT_ACTIONS2.CANCEL_INVOICE]: PERMISSION_SCOPES2.INVOICE_WRITE,
    [INTENT_ACTIONS2.PAY_INVOICE]: PERMISSION_SCOPES2.TRANSFER_REQUEST,
    [INTENT_ACTIONS2.RETURN_INVOICE_PAYMENT]: PERMISSION_SCOPES2.TRANSFER_REQUEST,
    [INTENT_ACTIONS2.IMPORT_INVOICE]: PERMISSION_SCOPES2.INVOICE_WRITE,
    [INTENT_ACTIONS2.SEND_INVOICE_RECEIPTS]: PERMISSION_SCOPES2.INVOICE_WRITE,
    [INTENT_ACTIONS2.SEND_CANCELLATION_NOTICES]: PERMISSION_SCOPES2.INVOICE_WRITE,
    [INTENT_ACTIONS2.SET_AUTO_RETURN]: PERMISSION_SCOPES2.INVOICE_WRITE,
    [INTENT_ACTIONS2.MINT]: PERMISSION_SCOPES2.MINT_REQUEST
  };

  // public/app.js
  var RELAY_URL = "wss://relay.snort.social";
  document.addEventListener("DOMContentLoaded", () => {
    const statusText = document.getElementById("connection-status");
    const badge = document.getElementById("connection-badge");
    const roundsContainer = document.getElementById("rounds-container");
    const intentsContainer = document.getElementById("intents-container");
    const leaderboardContainer = document.getElementById("leaderboard-container");
    const navRounds = document.getElementById("nav-rounds");
    const navPlayers = document.getElementById("nav-players");
    const navIntents = document.getElementById("nav-intents");
    const kpiGasValue = document.getElementById("kpi-gas-value");
    const kpiGasDelta = document.getElementById("kpi-gas-delta");
    const kpiNametagsValue = document.getElementById("kpi-nametags-value");
    const kpiNametagsDelta = document.getElementById("kpi-nametags-delta");
    const kpiIntervalValue = document.getElementById("kpi-interval-value");
    const kpiIntervalDelta = document.getElementById("kpi-interval-delta");
    const kpiAccuracyValue = document.getElementById("kpi-accuracy-value");
    const kpiAccuracyDelta = document.getElementById("kpi-accuracy-delta");
    const statTotal = document.getElementById("stat-total");
    const statAvg = document.getElementById("stat-avg");
    const statLastUpdate = document.getElementById("stat-last-update");
    const roundsCount = document.getElementById("rounds-count");
    const intentsCount = document.getElementById("intents-count");
    const chartSubtitle = document.getElementById("chart-subtitle");
    const rounds = /* @__PURE__ */ new Map();
    const playerScores = /* @__PURE__ */ new Map();
    const metricData = {
      totalGas: { values: [], predictions: [], labels: [] },
      activeNametags: { values: [], predictions: [], labels: [] },
      avgBlockInterval: { values: [], predictions: [], labels: [] }
    };
    let activeMetric = "totalGas";
    let totalIntentCount = 0;
    let predictionSum = 0;
    let socket;
    function createSparkline(canvasId, color) {
      const ctx2 = document.getElementById(canvasId);
      if (!ctx2) return null;
      return new Chart(ctx2.getContext("2d"), {
        type: "line",
        data: { labels: [], datasets: [{ data: [], borderColor: color, borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.4 }] },
        options: {
          responsive: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          animation: { duration: 300 }
        }
      });
    }
    const sparkGas = createSparkline("spark-gas", "#00e5ff");
    const sparkNametags = createSparkline("spark-nametags", "#a855f7");
    const sparkInterval = createSparkline("spark-interval", "#10b981");
    function updateSparkline(spark, value) {
      if (!spark) return;
      const d = spark.data;
      d.labels.push("");
      d.datasets[0].data.push(value);
      if (d.labels.length > 15) {
        d.labels.shift();
        d.datasets[0].data.shift();
      }
      spark.update("none");
    }
    const ctx = document.getElementById("predictionChart").getContext("2d");
    const gradientCyan = ctx.createLinearGradient(0, 0, 0, 400);
    gradientCyan.addColorStop(0, "rgba(0, 229, 255, 0.25)");
    gradientCyan.addColorStop(1, "rgba(0, 229, 255, 0.0)");
    const gradientPurple = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPurple.addColorStop(0, "rgba(168, 85, 247, 0.2)");
    gradientPurple.addColorStop(1, "rgba(168, 85, 247, 0.0)");
    const liveChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Actual Value",
            data: [],
            borderColor: "#00e5ff",
            backgroundColor: gradientCyan,
            borderWidth: 2.5,
            pointBackgroundColor: "#00e5ff",
            pointBorderColor: "#030308",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.35,
            order: 1
          },
          {
            label: "Prediction",
            data: [],
            borderColor: "#a855f7",
            backgroundColor: gradientPurple,
            borderWidth: 2,
            borderDash: [6, 4],
            pointBackgroundColor: "#a855f7",
            pointBorderColor: "#030308",
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "end",
            labels: {
              color: "#94a3b8",
              font: { family: "'JetBrains Mono'", size: 11 },
              boxWidth: 12,
              boxHeight: 2,
              padding: 15,
              usePointStyle: false
            }
          },
          tooltip: {
            backgroundColor: "rgba(8, 8, 26, 0.95)",
            titleFont: { family: "'JetBrains Mono'", size: 12 },
            bodyFont: { family: "'JetBrains Mono'", size: 11 },
            borderColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: true
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.03)", drawBorder: false },
            ticks: { color: "#475569", font: { family: "'JetBrains Mono'", size: 10 }, maxTicksLimit: 10 }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.03)", drawBorder: false },
            ticks: { color: "#475569", font: { family: "'JetBrains Mono'", size: 11 } },
            beginAtZero: false
          }
        },
        animation: { duration: 600, easing: "easeOutQuart" }
      }
    });
    document.getElementById("metric-tabs").addEventListener("click", (e) => {
      if (!e.target.classList.contains("metric-tab")) return;
      document.querySelectorAll(".metric-tab").forEach((t) => t.classList.remove("active"));
      e.target.classList.add("active");
      activeMetric = e.target.dataset.metric;
      refreshChart();
    });
    function refreshChart() {
      const md = metricData[activeMetric];
      liveChart.data.labels = [...md.labels];
      liveChart.data.datasets[0].data = [...md.values];
      liveChart.data.datasets[1].data = [...md.predictions];
      liveChart.update();
      chartSubtitle.textContent = `Showing ${activeMetric} \xB7 ${md.values.length} data points`;
    }
    function connect() {
      socket = new WebSocket(RELAY_URL);
      socket.onopen = () => {
        statusText.textContent = "Live \xB7 Nostr Relay";
        badge.classList.add("connected");
        setNetworkConnected(true);
        showToast("\u{1F517}", "Connected", `Relay: ${RELAY_URL}`, "settlement-toast");
        const subId = "predictabot_" + Math.floor(Math.random() * 1e5);
        const req = ["REQ", subId, { kinds: [1], limit: 200 }];
        socket.send(JSON.stringify(req));
      };
      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data[0] === "EVENT") {
            updateNetworkEvents();
            handleEvent(data[2]);
          }
        } catch (e) {
        }
      };
      socket.onclose = () => {
        statusText.textContent = "Reconnecting...";
        badge.classList.remove("connected");
        setNetworkConnected(false);
        setTimeout(connect, 3e3);
      };
      socket.onerror = () => {
        statusText.textContent = "Connection Error";
        badge.classList.remove("connected");
      };
    }
    function handleEvent(event) {
      const tags = {};
      for (const t of event.tags) {
        tags[t[0]] = t.slice(1);
      }
      if (tags["metric"]) {
        const roundId = tags["e"] ? tags["e"][0] : null;
        if (!roundId || rounds.has(roundId)) return;
        const metric = tags["metric"][0];
        const startBlock = tags["startBlock"] ? tags["startBlock"][0] : "?";
        const endBlock = tags["endBlock"] ? tags["endBlock"][0] : "?";
        const stake = tags["stake"] ? tags["stake"][0] : "0";
        rounds.set(roundId, { metric, startBlock, endBlock, stake, time: event.created_at });
        renderRound(roundId, metric, startBlock, endBlock, stake, event.created_at);
        showToast("\u26A1", `New Round: ${metricLabels[metric] || metric}`, `Blocks ${startBlock}\u2192${endBlock} \xB7 Stake ${stake} UNI`, "round-toast");
        const actualMatch = event.content.match(/Actual\s+(\w+):\s+([\d.]+)/);
        if (actualMatch) {
          updateMetricKPI(actualMatch[1], parseFloat(actualMatch[2]));
        }
        navRounds.textContent = rounds.size;
        roundsCount.textContent = rounds.size;
      } else if (tags["winner"]) {
        const winner = tags["winner"][0];
        addPlayerScore(winner, true);
        updateLeaderboard();
      } else if (tags["prediction"] && tags["intent"]) {
        const roundId = tags["e"] ? tags["e"][0] : null;
        const intentId = tags["intent"] ? tags["intent"][0] : "?";
        const predVal = parseFloat(tags["prediction"][0]);
        const playerPk = event.pubkey;
        totalIntentCount++;
        predictionSum += isNaN(predVal) ? 0 : predVal;
        addPlayerScore(playerPk, false);
        renderIntent(intentId, playerPk, predVal, event.created_at);
        updateChartData(roundId, predVal, event.created_at);
        showToast("\u{1F9E0}", `Prediction: ${isNaN(predVal) ? "?" : predVal.toLocaleString()}`, `Player ${pubkeyShort(playerPk)}`, "intent-toast");
        updateLeaderboard();
        navIntents.textContent = totalIntentCount;
        intentsCount.textContent = totalIntentCount;
        navPlayers.textContent = playerScores.size;
        statTotal.textContent = totalIntentCount;
        statAvg.textContent = totalIntentCount > 0 ? Math.round(predictionSum / totalIntentCount).toLocaleString() : "--";
        statLastUpdate.textContent = formatTime(event.created_at);
      }
    }
    const lastKpiValues = {};
    function updateMetricKPI(metric, value) {
      const prev = lastKpiValues[metric];
      lastKpiValues[metric] = value;
      let valEl, deltaEl, spark;
      switch (metric) {
        case "totalGas":
          valEl = kpiGasValue;
          deltaEl = kpiGasDelta;
          spark = sparkGas;
          break;
        case "activeNametags":
          valEl = kpiNametagsValue;
          deltaEl = kpiNametagsDelta;
          spark = sparkNametags;
          break;
        case "avgBlockInterval":
          valEl = kpiIntervalValue;
          deltaEl = kpiIntervalDelta;
          spark = sparkInterval;
          break;
        default:
          return;
      }
      if (valEl) {
        valEl.textContent = value.toLocaleString();
        animateValue(valEl);
      }
      if (deltaEl && prev !== void 0) {
        const diff = value - prev;
        const pct = prev > 0 ? (diff / prev * 100).toFixed(1) : "0.0";
        deltaEl.textContent = `${diff >= 0 ? "\u25B2" : "\u25BC"} ${Math.abs(pct)}%`;
        deltaEl.className = `kpi-delta ${diff >= 0 ? "positive" : "negative"}`;
      }
      const md = metricData[metric];
      md.values.push(value);
      md.labels.push(formatTime(Math.floor(Date.now() / 1e3)));
      if (md.values.length > 50) {
        md.values.shift();
        md.labels.shift();
      }
      if (metric === activeMetric) refreshChart();
      updateSparkline(spark, value);
      updateAccuracy();
    }
    function updateAccuracy() {
      const md = metricData[activeMetric];
      if (md.values.length < 2 || md.predictions.length < 2) return;
      let sumError = 0;
      let count = 0;
      for (let i = 0; i < Math.min(md.values.length, md.predictions.length); i++) {
        if (md.values[i] > 0 && md.predictions[i] > 0) {
          const error = Math.abs(md.values[i] - md.predictions[i]) / md.values[i];
          sumError += error;
          count++;
        }
      }
      if (count > 0) {
        const accuracy = Math.max(0, (1 - sumError / count) * 100);
        kpiAccuracyValue.textContent = accuracy.toFixed(1) + "%";
        kpiAccuracyDelta.textContent = `Based on ${count} rounds`;
        const ring = document.getElementById("accuracy-ring");
        if (ring) ring.setAttribute("stroke-dasharray", `${accuracy}, 100`);
      }
    }
    function animateValue(el) {
      el.style.transform = "scale(1.08)";
      el.style.transition = "transform 0.15s ease";
      setTimeout(() => {
        el.style.transform = "scale(1)";
      }, 200);
    }
    function updateChartData(roundId, prediction, timestamp) {
      const round = rounds.get(roundId);
      const metric = round ? round.metric : activeMetric;
      const md = metricData[metric];
      while (md.predictions.length < md.labels.length) md.predictions.push(null);
      if (md.predictions.length > 0) {
        md.predictions[md.predictions.length - 1] = prediction;
      } else {
        md.predictions.push(prediction);
        if (md.labels.length === 0) md.labels.push(formatTime(timestamp));
      }
      if (metric === activeMetric) refreshChart();
    }
    const metricIcons = { totalGas: "\u26FD", activeNametags: "\u{1F3F7}\uFE0F", avgBlockInterval: "\u23F1\uFE0F" };
    const metricLabels = { totalGas: "Total Gas", activeNametags: "Nametags", avgBlockInterval: "Block Interval" };
    function renderRound(id, metric, startBlock, endBlock, stake, timestamp) {
      clearEmptyState(roundsContainer);
      const icon = metricIcons[metric] || "\u{1F4CA}";
      const label = metricLabels[metric] || metric;
      const shortId = id.replace("round-", "").replace("demo-round-", "#");
      const blockCount = Number(endBlock) - Number(startBlock) + 1 || "?";
      const card = document.createElement("div");
      card.className = "round-card";
      card.innerHTML = `
            <div class="round-header">
                <div class="round-id-wrap">
                    <span class="round-icon">${icon}</span>
                    <span class="round-id">${shortId}</span>
                </div>
                <span class="round-time">${formatTime(timestamp)}</span>
            </div>
            <div class="round-body">
                <span class="round-metric-value">${label}</span>
                <span class="round-blocks-value">${startBlock}\u2192${endBlock}</span>
                <span class="round-stake-amount">${stake} UNI</span>
            </div>
        `;
      roundsContainer.prepend(card);
      if (roundsContainer.children.length > 30) roundsContainer.lastChild.remove();
    }
    function renderIntent(intentId, playerPk, prediction, timestamp) {
      clearEmptyState(intentsContainer);
      const chip = document.createElement("div");
      chip.className = "intent-chip";
      chip.innerHTML = `
            <span class="intent-player">${pubkeyShort(playerPk)}</span>
            <span class="intent-prediction">${isNaN(prediction) ? "?" : prediction.toLocaleString()}</span>
            <span class="intent-time">${formatTime(timestamp)}</span>
        `;
      intentsContainer.prepend(chip);
      if (intentsContainer.children.length > 40) intentsContainer.lastChild.remove();
    }
    function addPlayerScore(pk, isWin) {
      if (!playerScores.has(pk)) {
        playerScores.set(pk, { predictions: 0, wins: 0 });
      }
      const s = playerScores.get(pk);
      s.predictions++;
      if (isWin) s.wins++;
    }
    function updateLeaderboard() {
      clearEmptyState(leaderboardContainer);
      leaderboardContainer.innerHTML = "";
      const sorted = [...playerScores.entries()].sort((a, b) => b[1].predictions - a[1].predictions).slice(0, 10);
      const maxPreds = sorted.length > 0 ? sorted[0][1].predictions : 1;
      sorted.forEach(([pk, score], idx) => {
        const row = document.createElement("div");
        row.className = "lb-row";
        const rankClass = idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : "";
        const barWidth = Math.round(score.predictions / maxPreds * 100);
        row.innerHTML = `
                <span class="lb-rank ${rankClass}">${idx + 1}</span>
                <span class="lb-player">${pubkeyShort(pk)}</span>
                <div class="lb-bar-wrap"><div class="lb-bar" style="width:${barWidth}%"></div></div>
                <span class="lb-score">${score.predictions}</span>
            `;
        leaderboardContainer.appendChild(row);
      });
    }
    function pubkeyShort(pk) {
      if (!pk || pk.length < 12) return pk || "unknown";
      return pk.substring(0, 8) + "\u2026" + pk.substring(pk.length - 4);
    }
    function formatTime(ts) {
      const d = new Date(ts * 1e3);
      return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0") + ":" + d.getSeconds().toString().padStart(2, "0");
    }
    function clearEmptyState(container) {
      const empty = container.querySelector(".empty-state");
      if (empty) empty.remove();
    }
    function initParticles() {
      const canvas = document.getElementById("particleCanvas");
      if (!canvas) return;
      const pctx = canvas.getContext("2d");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const particles = [];
      const count = 60;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.5 + 0.1
        });
      }
      function draw() {
        pctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              pctx.beginPath();
              pctx.moveTo(particles[i].x, particles[i].y);
              pctx.lineTo(particles[j].x, particles[j].y);
              pctx.strokeStyle = `rgba(0, 229, 255, ${0.06 * (1 - dist / 150)})`;
              pctx.lineWidth = 0.5;
              pctx.stroke();
            }
          }
        }
        for (const p of particles) {
          pctx.beginPath();
          pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          pctx.fillStyle = `rgba(0, 229, 255, ${p.alpha})`;
          pctx.fill();
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }
        requestAnimationFrame(draw);
      }
      draw();
      window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
    }
    function startDemoMode() {
      let demoTimeout;
      demoTimeout = setTimeout(() => {
        if (totalIntentCount === 0 && rounds.size === 0) {
          chartSubtitle.textContent = "Demo mode \xB7 Simulated data";
          runDemoLoop();
        }
      }, 8e3);
      function runDemoLoop() {
        const metrics = ["totalGas", "activeNametags", "avgBlockInterval"];
        let roundNum = 1;
        setInterval(() => {
          const metric = metrics[(roundNum - 1) % 3];
          const roundId = `demo-round-${roundNum}`;
          const ts = Math.floor(Date.now() / 1e3);
          const baseValues = { totalGas: 5e3, activeNametags: 300, avgBlockInterval: 3 };
          const variance = { totalGas: 3e3, activeNametags: 100, avgBlockInterval: 1 };
          const actualVal = Math.round(baseValues[metric] + (Math.random() - 0.5) * variance[metric] * 2);
          const predVal = Math.round(actualVal + (Math.random() - 0.5) * variance[metric] * 0.5);
          rounds.set(roundId, { metric, startBlock: 1e3 + roundNum, endBlock: 1010 + roundNum, stake: "1000", time: ts });
          renderRound(roundId, metric, 1e3 + roundNum, 1010 + roundNum, "1000", ts);
          showToast("\u26A1", `New Round: ${metricLabels[metric] || metric}`, `Blocks ${1e3 + roundNum}\u2192${1010 + roundNum} \xB7 1,000 UNI`, "round-toast");
          navRounds.textContent = rounds.size;
          roundsCount.textContent = rounds.size;
          updateMetricKPI(metric, actualVal);
          const fakePk = Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
          totalIntentCount++;
          predictionSum += predVal;
          addPlayerScore(fakePk, Math.random() > 0.7);
          renderIntent(`intent_${roundNum}`, fakePk, predVal, ts);
          showToast("\u{1F9E0}", `Prediction: ${predVal.toLocaleString()}`, `Player ${pubkeyShort(fakePk)}`, "intent-toast");
          const md = metricData[metric];
          while (md.predictions.length < md.values.length - 1) md.predictions.push(null);
          md.predictions.push(predVal);
          if (metric === activeMetric) refreshChart();
          navIntents.textContent = totalIntentCount;
          intentsCount.textContent = totalIntentCount;
          navPlayers.textContent = playerScores.size;
          statTotal.textContent = totalIntentCount;
          statAvg.textContent = Math.round(predictionSum / totalIntentCount).toLocaleString();
          statLastUpdate.textContent = formatTime(ts);
          updateLeaderboard();
          updateAccuracy();
          roundNum++;
        }, 4e3);
      }
    }
    const toastContainer = document.getElementById("toast-container");
    function showToast(icon, title, desc, type) {
      if (!toastContainer) return;
      const toast = document.createElement("div");
      toast.className = `toast ${type}`;
      toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-desc">${desc}</div>
            </div>
            <div class="toast-progress"></div>
        `;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.animation = "toastOut 0.4s ease forwards";
        setTimeout(() => toast.remove(), 400);
      }, 4e3);
      while (toastContainer.children.length > 4) {
        toastContainer.firstChild.remove();
      }
    }
    const netUptime = document.getElementById("net-uptime");
    const netEvents = document.getElementById("net-events");
    const netConnStatus = document.getElementById("net-conn-status");
    let connectedAt = null;
    let totalEventsReceived = 0;
    function startUptimeTimer() {
      setInterval(() => {
        if (!connectedAt || !netUptime) return;
        const elapsed = Math.floor((Date.now() - connectedAt) / 1e3);
        const h = Math.floor(elapsed / 3600).toString().padStart(2, "0");
        const m = Math.floor(elapsed % 3600 / 60).toString().padStart(2, "0");
        const s = (elapsed % 60).toString().padStart(2, "0");
        netUptime.textContent = `${h}:${m}:${s}`;
      }, 1e3);
    }
    function updateNetworkEvents() {
      totalEventsReceived++;
      if (netEvents) netEvents.textContent = totalEventsReceived.toLocaleString();
    }
    function setNetworkConnected(connected) {
      if (!netConnStatus) return;
      if (connected) {
        connectedAt = Date.now();
        netConnStatus.innerHTML = '<span class="net-dot connected"></span> Connected';
      } else {
        netConnStatus.innerHTML = '<span class="net-dot"></span> Disconnected';
      }
    }
    const walletConnectBtn = document.getElementById("wallet-connect-btn");
    const walletProfile = document.getElementById("wallet-profile");
    const walletAddress = document.getElementById("wallet-address");
    const walletBalance = document.getElementById("wallet-balance");
    async function connectSphere() {
      if (walletConnectBtn) {
        walletConnectBtn.innerHTML = '<span class="wallet-btn-icon">\u23F3</span> Connecting...';
        walletConnectBtn.disabled = true;
      }
      try {
        const result = await autoConnect({
          dapp: {
            name: "PredictaBot Arena",
            description: "Autonomous macroeconomic prediction market",
            url: window.location.origin
          },
          walletUrl: "https://sphere.unicity.network",
          // Testnet
          network: SPHERE_NETWORKS2.testnet2,
          // BẮT BUỘC cho testnet
          silent: false
          // Thử reconnect tự động mà không hiện popup nếu đã approve
        });
        console.log("Connected!", result.connection.identity);
        const address = result.connection.identity;
        const balanceResult = await result.client.query("sphere_getBalance");
        const balance = balanceResult ? (parseFloat(balanceResult) / 1e9).toFixed(2) : "0.00";
        console.log("Balance:", balance);
        const shortAddr = address.substring(0, 6) + "..." + address.substring(address.length - 4);
        localStorage.setItem("sphere_wallet_connected", "true");
        localStorage.setItem("sphere_wallet_address", address);
        localStorage.setItem("sphere_wallet_balance", balance);
        showWalletProfile(shortAddr, balance);
        showToast("\u{1F45B}", "Wallet Connected", `Connected via Sphere Extension`, "success");
        return result;
      } catch (err) {
        console.error("Connect failed", err);
        if (walletConnectBtn) {
          walletConnectBtn.innerHTML = '<span class="wallet-btn-icon">\u{1F45B}</span> Connect Sphere';
          walletConnectBtn.disabled = false;
        }
        showToast("\u26A0\uFE0F", "Connection Failed", "Could not connect to Sphere Wallet", "error");
      }
    }
    async function silentConnectSphere() {
      try {
        const result = await autoConnect({
          dapp: {
            name: "PredictaBot Arena",
            description: "Autonomous macroeconomic prediction market",
            url: window.location.origin
          },
          walletUrl: "https://sphere.unicity.network",
          network: SPHERE_NETWORKS2.testnet2,
          silent: true
        });
        if (result && result.connection) {
          const address = result.connection.identity;
          const balanceResult = await result.client.query("sphere_getBalance");
          const balance = balanceResult ? (parseFloat(balanceResult) / 1e9).toFixed(2) : "0.00";
          const shortAddr = address.substring(0, 6) + "..." + address.substring(address.length - 4);
          showWalletProfile(shortAddr, balance);
        }
      } catch (err) {
        console.log("Silent connect failed or no active session");
      }
    }
    function showWalletProfile(shortAddr, balance) {
      if (walletConnectBtn) walletConnectBtn.classList.add("hidden");
      if (walletProfile) {
        walletProfile.classList.remove("hidden");
        if (walletAddress) walletAddress.textContent = shortAddr;
        if (walletBalance) walletBalance.textContent = balance + " UCT";
      }
    }
    function disconnectWallet() {
      localStorage.removeItem("sphere_wallet_connected");
      localStorage.removeItem("sphere_wallet_address");
      localStorage.removeItem("sphere_wallet_balance");
      if (walletProfile) walletProfile.classList.add("hidden");
      if (walletConnectBtn) {
        walletConnectBtn.classList.remove("hidden");
        walletConnectBtn.innerHTML = '<span class="wallet-btn-icon">\u{1F45B}</span> Connect Sphere';
      }
      showToast("\u{1F50C}", "Wallet Disconnected", "Sphere wallet session ended", "info");
    }
    function checkWalletState() {
      const isConnected = localStorage.getItem("sphere_wallet_connected");
      if (isConnected === "true") {
        const address = localStorage.getItem("sphere_wallet_address");
        const balance = localStorage.getItem("sphere_wallet_balance");
        const shortAddr = address.substring(0, 6) + "..." + address.substring(address.length - 4);
        showWalletProfile(shortAddr, balance);
      }
    }
    if (walletConnectBtn) walletConnectBtn.addEventListener("click", connectSphere);
    if (walletProfile) walletProfile.addEventListener("click", () => {
      if (confirm("Disconnect Sphere Wallet?")) {
        disconnectWallet();
      }
    });
    checkWalletState();
    silentConnectSphere();
    initParticles();
    connect();
    startDemoMode();
    startUptimeTimer();
  });
})();
