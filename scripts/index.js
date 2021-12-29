const { readdir, readFile, writeFile } = require("fs/promises");
const {
  array,
  assert,
  define,
  number,
  object,
  optional,
  string,
} = require("superstruct");
const { parse } = require("yaml");
const { join, basename } = require("path");

const tags = require(join(__dirname, "../tags.json"));

const Tag = define("Tag", (tag) => Boolean(tags[tag]));

const Network = define("Network", (network) =>
  ["mainnet-beta", "devnet", "testnet"].includes(network)
);

const re = RegExp(/(https?|ipfs):/);
const Website = define("Website", (url) => re.test(new URL(url).protocol));

const Token = object({
  name: string(),
  description: optional(string()),
  symbol: string(),
  decimals: number(),
  extensions: optional(
    object({
      address: optional(string()), // 0xdd974D5C2e2928deA5F71b9825b8b646686BD200
      assetContract: optional(Website), // https://etherscan.io/address/0xdd974D5C2e2928deA5F71b9825b8b646686BD200
      bridgeContract: optional(Website),

      description: optional(string()), // shouldn't be here
      serumV3Usdc: optional(string()), // 4tSvZvnbyzHXLMTiFonMyxZoHmFqau1XArcRCVHLZ5gX
      serumV3Usdt: optional(string()), // 7dLVkUfBVfCGkFhSXDCq1ukM9usathSgS716t643iFGF
      vaultPubkey: optional(string()),

      blog: optional(Website),
      coinmarketcap: optional(Website),
      discord: optional(Website),
      facebook: optional(Website),
      github: optional(Website),
      instagram: optional(Website),
      medium: optional(Website),
      reddit: optional(Website),
      telegram: optional(Website),
      twitter: optional(Website),
      dexWebsite: optional(Website),
      linkedin: optional(Website),
      twitch: optional(Website),
      solanium: optional(Website),
      website: optional(Website),
      vault: optional(Website),
      youtube: optional(Website),
      whitepaper: optional(Website),
      telegramAnnouncements: optional(Website),
      animationUrl: optional(Website),

      waterfallbot: optional(Website),
      imageUrl: optional(Website),

      website: optional(Website),
      coingeckoId: optional(string()),
    })
  ),
  tags: optional(array(Tag)),
  networks: optional(array(Network)),
});

const format = (ob) => {
  assert(ob, Token);
  return ob;
};

async function readFiles(dirname) {
  const dirs = await readdir(dirname);

  const filenames = (
    await Promise.all(
      dirs.flatMap(async (dir) => {
        const files = await readdir(join(dirname, dir));
        return files.map((f) => join(dirname, dir, f));
      })
    )
  )
    .flat()
    .filter((f) => f.endsWith(".yml"));

  const allNetworks = {};

  await Promise.all(
    filenames.map(async (filename) => {
      const content = await readFile(filename, "utf-8");
      const { networks = ["mainnet-beta"], ...data } = format(parse(content));
      networks.forEach((network) => {
        allNetworks[network] ||= {};
        allNetworks[network].tokens ||= {};
        allNetworks[network].tokens[basename(filename, ".yml")] = data;

        data.tags?.forEach((tag) => {
          allNetworks[network].tags ||= {};
          allNetworks[network].tags[tag] ||= 0;
          allNetworks[network].tags[tag] += 1;
        });
      });
    })
  );

  await Promise.all(
    Object.entries(allNetworks).map(([network, { tags: usedTags, tokens }]) =>
      writeFile(
        `${network}.json`,
        JSON.stringify(
          {
            name: "Solana Token List",
            network,
            tags: Object.entries(usedTags)
              .sort(([a], [b]) => a.localeCompare(b))
              .reduce((acc, [tag, count]) => {
                acc[tag] = {
                  ...tags[tag],
                  count,
                };
                return acc;
              }, {}),
            keywords: ["solana", "spl"],
            timestamp: new Date().toISOString(),
            tokens,
          },
          null,
          2
        )
      )
    )
  );
}

readFiles(join(__dirname, "../tokens"));
