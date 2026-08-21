// Allows TypeScript to accept plain CSS file imports as side-effects
// e.g.: import "./styles/index.css"
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.css" {}
