/**
 * NOTE: To add new token add here
 */
const TOKEN_KEYS = [
  "accessToken",
  "refreshToken",
  "sidebarClosed",
  "theme",
] as const;

/** ************************************************* IMPLEMENTATION DETAIL **************************************** */
function getToken(token: string) {
  return localStorage.getItem(token);
}

function setToken(token: string, value: string) {
  return localStorage.setItem(token, value);
}
function removeToken(token: string) {
  return localStorage.removeItem(token);
}

type T_StoredTokenKey = (typeof TOKEN_KEYS)[number];

type T_MapToken<Key> = {
  readonly key: Key;
  getToken: () => string | null;
  setToken: (value: string) => void;
  removeToken: () => void;
};

function mapToken<Key extends T_StoredTokenKey>(key: Key): T_MapToken<Key> {
  return {
    key: key,
    getToken: function () {
      return getToken(this.key);
    },
    setToken: function (value: string) {
      setToken(this.key, value);
    },
    removeToken: function () {
      removeToken(this.key);
    },
  };
}

function keys<T extends T_StoredTokenKey>() {
  return TOKEN_KEYS.reduce(
    (prev, key) => {
      const data = {
        ...prev,
        [key]: mapToken(key),
      };
      return data;
    },
    {} as Record<T, T_MapToken<T>>,
  );
}

// type T_StoredToken = {
//   [key in T_StoredTokenKey]: T_MapToken<key>;
// } & { clear: () => void };
export const storedTokens = {
  ...keys(),
  clear: () => {
    localStorage.clear();
  },
};
