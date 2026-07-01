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
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');
    const buildingIdsStr = localStorage.getItem('buildingIds');

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
    console.error('Error reading localStorage', e);
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
      action: PayloadAction<{ user: any; accessToken: string; refreshToken: string; buildingIds: number[] }>,
    ) => {
      const { user, accessToken, refreshToken, buildingIds } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.buildingIds = buildingIds;
      state.isAuthenticated = true;

      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('buildingIds', JSON.stringify(buildingIds));
    },
    updateAccessToken: (state, action: PayloadAction<{ accessToken: string; refreshToken?: string }>) => {
      state.accessToken = action.payload.accessToken;
      localStorage.setItem('token', action.payload.accessToken);
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem('refreshToken', action.payload.refreshToken);
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
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setCredentials, updateAccessToken, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
