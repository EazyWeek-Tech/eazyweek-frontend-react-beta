import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true, // Fix for direct routing
  }
  // server:{
  //   proxy:{
  //     '/api':{
  //       target:'http://localhost:44317',
  //       changeOrigin: true,
  //       secure:false,
  //     },
  //   },
  // },
});
