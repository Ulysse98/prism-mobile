module.exports = ({ config }) => {
  const dev = process.env.APP_VARIANT === "development";

  return {
    ...config,
    name: dev ? "Prism Dev" : config.name,
    scheme: dev ? "prism-dev" : config.scheme,
    android: {
      ...config.android,
      package: dev
        ? "io.github.ulysse98.prism.dev"
        : config.android.package,
    },
  };
};
