import {rmSync} from 'node:fs'

import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'

import {defineConfig} from 'vite'

export default defineConfig(config => {
    rmSync('dist-electron', {recursive: true, force: true})
    console.log('defineConfig received', {config})

    return {
        plugins: [
            vue(),
            electron({
                main: {
                    // Shortcut of `build.lib.entry`
                    entry: 'electron/main.ts',
                },
                preload: {
                    // Shortcut of `build.rollupOptions.input`
                    input: 'electron/preload.ts',
                },
                // Optional: Use Node.js API in the Renderer process
                renderer: {},
            }),
        ],
        optimizeDeps: {
            include: ['regedit'],
        }
    }
})