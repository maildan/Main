module.exports = {
  rules: {
    // 서버 코드에서는 commonjs require 허용
    '@next/next/no-assign-module-variable': 'off',
    'no-console': 'off', // 서버 코드는 콘솔 로그 허용
  }
};

// filepath: c:\Users\user\Desktop\typing-stats-app\src\main\.eslintrc.js
module.exports = {
  rules: {
    // Electron 메인 프로세스에서는 commonjs require 허용
    '@next/next/no-assign-module-variable': 'off',
    'no-console': 'off', // 메인 프로세스는 콘솔 로그 허용
  }
};
