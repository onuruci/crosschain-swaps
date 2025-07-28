import { configureStore } from '@reduxjs/toolkit';
import { swapsApi } from './swapsApi';

export const store = configureStore({
  reducer: {
    [swapsApi.reducerPath]: swapsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(swapsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 