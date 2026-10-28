import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite tự động tải file .env và expose VITE_* qua import.meta.env
// Không cần define, proxy, chỉ cần .env có: VITE_API_URL=http://localhost:3000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
