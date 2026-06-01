const path = require('path');
const webpack = require('webpack');

module.exports = (env) => {
  const platform = env && env.platform ? env.platform : 'google';

  const apiKeys = {
    google: process.env.PLAYA_API_KEY_GOOGLE || 'pk_live_8370658c75f74e76977c067c6103727a',
    edge: process.env.PLAYA_API_KEY_EDGE || 'pk_live_76816d32bfa742eba9d5a989823a7402'
  };

  const apiKey = apiKeys[platform] || apiKeys.google;

  console.log(`[Build] Platform: ${platform}`);
  console.log(`[Build] Using API Key: ${apiKey.substring(0, 10)}...`);

  return {
    entry: {
      background: './src/background.ts',
      sidepanel: './src/sidepanel.ts',
      content: './src/content.ts'
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist', platform),
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    mode: 'production',
    plugins: [
      new webpack.DefinePlugin({
        'process.env.PLAYA_API_KEY': JSON.stringify(apiKey),
        'process.env.PLAYA_PLATFORM': JSON.stringify(platform)
      })
    ]
  };
};
