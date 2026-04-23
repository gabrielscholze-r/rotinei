const { spawn } = require('child_process');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');
const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

const gradle = spawn('gradlew.bat', ['assembleRelease', '-PreactNativeArchitectures=arm64-v8a'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
});

gradle.on('close', (code) => {
  if (code === 0) {
    console.log('\nBuild concluído com sucesso!');
    console.log('APK gerado em:', apkPath);
  } else {
    console.error(`\nBuild falhou com código ${code}`);
    process.exit(code);
  }
});
