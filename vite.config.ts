import { defineConfig } from 'vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  base: '/PinyinType/',
  plugins: [
    obfuscatorPlugin({
      apply: 'build',
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
