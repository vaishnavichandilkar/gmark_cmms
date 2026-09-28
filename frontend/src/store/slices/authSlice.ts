import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  buildingIds: number[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const getStoredAuth = () => {
  try {
    const getStorageItem = (key: string) => sessionStorage.getItem(key) || localStorage.getItem(key);
    const token = getStorageItem('token');
    const refreshToken = getStorageItem('refreshToken');
    const userStr = getStorageItem('user');
    const buildingIdsStr = getStorageItem('buildingIds');

    if (token && userStr) {
      return {
        user: JSON.parse(userStr),
        accessToken: token,
        refreshToken: refreshToken || null,
        buildingIds: buildingIdsStr ? JSON.parse(buildingIdsStr) : [],
        isAuthenticated: true,
      };
    }
  } catch (e) {
    console.error('Error reading storage', e);
  }
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    buildingIds: [],
    isAuthenticated: false,
  };
};

const initialState: AuthState = {
  ...getStoredAuth(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: any; accessToken: string; refreshToken: string; buildingIds: number[]; rememberMe?: boolean }>,
    ) => {
      const { user, accessToken, refreshToken, buildingIds, rememberMe } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.buildingIds = buildingIds;
      state.isAuthenticated = true;

      const storage = rememberMe ? localStorage : sessionStorage;
      const otherStorage = rememberMe ? sessionStorage : localStorage;

      otherStorage.removeItem('token');
      otherStorage.removeItem('refreshToken');
      otherStorage.removeItem('user');
      otherStorage.removeItem('buildingIds');

      storage.setItem('token', accessToken);
      storage.setItem('refreshToken', refreshToken);
      storage.setItem('user', JSON.stringify(user));
      storage.setItem('buildingIds', JSON.stringify(buildingIds));
    },
    updateAccessToken: (state, action: PayloadAction<{ accessToken: string; refreshToken?: string }>) => {
      state.accessToken = action.payload.accessToken;
      
      const storage = sessionStorage.getItem('token') ? sessionStorage : localStorage;
      
      storage.setItem('token', action.payload.accessToken);
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
        storage.setItem('refreshToken', action.payload.refreshToken);
      }
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.buildingIds = [];
      state.isAuthenticated = false;

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('buildingIds');

      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('buildingIds');
    },
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
      const storage = sessionStorage.getItem('token') ? sessionStorage : localStorage;
      storage.setItem('user', JSON.stringify(action.payload));
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setCredentials, updateAccessToken, setUser, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
