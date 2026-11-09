// L'analyse du code : les règles recommandées de TypeScript et celles des hooks de React.
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
);
