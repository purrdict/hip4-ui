import { expect, test } from "bun:test";

const readmeUrl = new URL("../README.md", import.meta.url);

test("README exposes only working public Purrdict developer resources", async () => {
  const [readme, agentGuide] = await Promise.all([
    Bun.file(readmeUrl).text(),
    Bun.file(new URL("../CLAUDE.md", import.meta.url)).text(),
  ]);

  expect(readme).toContain("https://www.npmjs.com/package/@purrdict/hip4");
  expect(readme).toContain("https://ui.purrdict.xyz/r/hip4-quickstart.json");
  expect(readme).toContain("https://www.purrdict.xyz/build/");
  expect(readme).toContain("https://www.purrdict.xyz/hip4/");
  expect(readme).not.toContain("https://github.com/purrdict/hip4-sdk");
  expect(readme).not.toContain("bun add @purrdict/hip4-ui");
  expect(agentGuide).toContain("source registry (not an npm package)");
  expect(agentGuide).not.toContain("**npm**: `@purrdict/hip4-ui`");
});
