import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'antd-icons',
              test: /node_modules[\\/]@ant-design[\\/]icons[\\/]/,
              priority: 25,
            },
            {
              name: 'antd',
              test: /node_modules[\\/]antd[\\/]/,
              priority: 20,
            },
            {
              name: 'antd-runtime',
              test: /node_modules[\\/]@ant-design[\\/]/,
              priority: 15,
            },
            {
              name: 'rc',
              test: /node_modules[\\/](@rc-component|rc-[^\\/]+)[\\/]/,
              priority: 10,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5080',
        changeOrigin: true,
      },
    },
  },
})
